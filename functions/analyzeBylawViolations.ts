import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { file_url, building_id, document_id, description } = await req.json();

        if (!file_url || !building_id) {
            return Response.json({ 
                error: 'file_url and building_id are required' 
            }, { status: 400 });
        }

        // Get building bylaws
        const bylaws = await base44.entities.BuildingBylaw.filter({ building_id });
        
        if (bylaws.length === 0) {
            return Response.json({
                success: true,
                violations: [],
                message: 'No bylaws found for this building to check against'
            });
        }

        const bylawsText = bylaws.map(b => 
            `${b.bylaw_number}: ${b.title}\n${b.content}`
        ).join('\n\n---\n\n');

        // Analyze document for potential bylaw violations
        const analysis = await base44.integrations.Core.InvokeLLM({
            prompt: `You are a strata bylaw compliance expert. Analyze this document for potential bylaw violations.

BUILDING BYLAWS:
${bylawsText}

DOCUMENT TO ANALYZE:
${description || 'See attached document'}

Identify any potential violations or compliance issues. For each violation found, specify:
- Which bylaw is potentially violated
- The severity (low, medium, high, critical)
- A clear explanation of the violation
- Recommended action

If no violations are found, return an empty violations array.`,
            file_urls: [file_url],
            response_json_schema: {
                type: "object",
                properties: {
                    violations_found: { type: "boolean" },
                    violation_count: { type: "number" },
                    violations: {
                        type: "array",
                        items: {
                            type: "object",
                            properties: {
                                bylaw_number: { type: "string" },
                                bylaw_title: { type: "string" },
                                severity: {
                                    type: "string",
                                    enum: ["low", "medium", "high", "critical"]
                                },
                                description: { type: "string" },
                                evidence: { type: "string" },
                                recommended_action: { type: "string" },
                                requires_immediate_attention: { type: "boolean" }
                            }
                        }
                    },
                    overall_compliance_status: {
                        type: "string",
                        enum: ["compliant", "minor_issues", "major_issues", "critical_violations"]
                    },
                    summary: { type: "string" },
                    recommendations: {
                        type: "array",
                        items: { type: "string" }
                    }
                }
            }
        });

        // Update document with analysis if document_id provided
        if (document_id) {
            await base44.entities.Document.update(document_id, {
                bylaw_analysis: analysis,
                compliance_status: analysis.overall_compliance_status,
                ai_processed: true,
                ai_processed_date: new Date().toISOString()
            });
        }

        // Create notifications for critical violations
        if (analysis.violations_found && analysis.violations.some(v => v.severity === 'critical')) {
            const building = await base44.entities.Building.get(building_id);
            
            await base44.integrations.Core.SendEmail({
                to: building.manager_email,
                subject: `CRITICAL: Bylaw Violation Detected - ${building.name}`,
                body: `Critical bylaw violations have been detected in a submitted document.
                
Violations Found: ${analysis.violation_count}
Status: ${analysis.overall_compliance_status}

${analysis.violations.filter(v => v.severity === 'critical').map(v => 
    `- ${v.bylaw_title}: ${v.description}`
).join('\n')}

Please review immediately in the Vivid BMS platform.`
            });
        }

        return Response.json({
            success: true,
            analysis,
            message: analysis.violations_found 
                ? `${analysis.violation_count} potential violation(s) identified`
                : 'No bylaw violations detected'
        });

    } catch (error) {
        console.error('Error analyzing bylaw violations:', error);
        return Response.json({ 
            error: error.message,
            success: false
        }, { status: 500 });
    }
});