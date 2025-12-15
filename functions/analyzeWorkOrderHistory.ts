import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        const user = await base44.auth.me();
        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { buildingId, unitId, analyzeRecurring } = await req.json();

        if (!buildingId) {
            return Response.json({ error: 'Building ID is required' }, { status: 400 });
        }

        // Fetch work orders for the building/unit
        const filterCriteria = { building_id: buildingId };
        if (unitId) {
            filterCriteria.unit_id = unitId;
        }

        const workOrders = await base44.asServiceRole.entities.WorkOrder.filter(filterCriteria);

        if (!workOrders || workOrders.length === 0) {
            return Response.json({
                summary: 'No work order history found for this location.',
                statistics: { total: 0 },
                recurringIssues: []
            });
        }

        // Build comprehensive prompt for AI analysis
        const workOrderSummary = workOrders.map((wo, idx) => `
${idx + 1}. [${wo.status}] ${wo.title}
   Category: ${wo.category}
   Priority: ${wo.priority}
   Created: ${wo.created_date}
   ${wo.completed_date ? `Completed: ${wo.completed_date}` : ''}
   Description: ${wo.description || 'N/A'}
`).join('\n');

        let prompt = `You are analyzing work order history for a building management system.

Work Orders (${workOrders.length} total):
${workOrderSummary}

Please provide:
1. A concise summary of the work order history (2-3 sentences)
2. Key statistics:
   - Total work orders
   - Breakdown by status
   - Breakdown by category
   - Average resolution time for completed orders
3. Notable trends or patterns`;

        if (analyzeRecurring) {
            prompt += `
4. Identify potential recurring issues by analyzing:
   - Similar titles or descriptions
   - Same categories appearing multiple times
   - Issues in the same area/unit
   - Patterns suggesting underlying problems
   
For each recurring issue, provide:
   - Issue description
   - Frequency (how many times it occurred)
   - Severity assessment
   - Recommended preventive actions`;
        }

        const schema = {
            type: "object",
            properties: {
                summary: { type: "string", description: "Brief summary of work order history" },
                statistics: {
                    type: "object",
                    properties: {
                        total: { type: "number" },
                        by_status: { 
                            type: "object",
                            additionalProperties: { type: "number" }
                        },
                        by_category: {
                            type: "object",
                            additionalProperties: { type: "number" }
                        },
                        avg_resolution_days: { type: "number" }
                    }
                },
                trends: {
                    type: "array",
                    items: { type: "string" },
                    description: "Notable trends or patterns"
                },
                recurringIssues: {
                    type: "array",
                    items: {
                        type: "object",
                        properties: {
                            issue: { type: "string" },
                            frequency: { type: "number" },
                            severity: { type: "string", enum: ["low", "medium", "high"] },
                            recommendation: { type: "string" }
                        }
                    }
                }
            },
            required: ["summary", "statistics"]
        };

        const response = await base44.asServiceRole.integrations.Core.InvokeLLM({
            prompt,
            response_json_schema: schema
        });

        if (response && response.data) {
            return Response.json({
                success: true,
                ...response.data
            });
        } else {
            return Response.json({ error: 'Failed to analyze work order history' }, { status: 500 });
        }

    } catch (error) {
        console.error('Analysis error:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});