import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { asset_id } = await req.json();

    if (!asset_id) {
      return Response.json({ error: 'asset_id is required' }, { status: 400 });
    }

    // Fetch asset details
    const asset = await base44.asServiceRole.entities.Asset.filter({ id: asset_id });
    if (!asset || asset.length === 0) {
      return Response.json({ error: 'Asset not found' }, { status: 404 });
    }

    const assetData = asset[0];

    // Fetch service history
    const serviceRecords = await base44.asServiceRole.entities.ServiceRecord.filter(
      { asset_id },
      '-service_date',
      50
    );

    // Fetch compliance records
    const complianceRecords = await base44.asServiceRole.entities.ComplianceRecord.filter(
      { asset_id },
      '-inspection_date',
      50
    );

    // Fetch inspections
    let inspections = [];
    try {
      inspections = await base44.asServiceRole.entities.Inspection.filter(
        { asset_id },
        '-scheduled_date',
        20
      );
    } catch (e) {
      // Inspections might not exist for this asset
      console.log('No inspections found:', e);
    }

    // Build comprehensive analysis prompt
    const analysisPrompt = `Generate a comprehensive compliance report for this building asset:

## Asset Information
- Name: ${assetData.name}
- Type: ${assetData.asset_type}
- Category: ${assetData.asset_main_category}
- Location: ${assetData.location || 'Not specified'}
- Floor: ${assetData.floor || 'N/A'}
- Manufacturer: ${assetData.manufacturer || 'Unknown'}
- Model: ${assetData.model || 'Unknown'}
- Installation Date: ${assetData.installation_date || 'Unknown'}
- Current Compliance Status: ${assetData.compliance_status || 'unknown'}
- Service Frequency: ${assetData.service_frequency || 'Not defined'}
- Next Service Date: ${assetData.next_service_date || 'Not scheduled'}
- Last Service Date: ${assetData.last_service_date || 'Unknown'}
- Risk Rating: ${assetData.risk_rating || 'Not assessed'}

## Service History (${serviceRecords.length} records)
${serviceRecords.slice(0, 10).map(r => `
- Date: ${r.service_date}
  Type: ${r.service_type}
  Status: ${r.status}
  Findings: ${r.findings || 'None recorded'}
  Issues: ${r.issues_found?.join(', ') || 'None'}
  Cost: $${r.total_cost || 0}
`).join('\n')}

## Compliance Records (${complianceRecords.length} records)
${complianceRecords.slice(0, 10).map(r => `
- Type: ${r.compliance_type}
  Date: ${r.inspection_date}
  Status: ${r.status}
  Expiry: ${r.expiry_date || 'N/A'}
  Findings: ${r.findings || 'None'}
  Defects: ${r.defects?.join(', ') || 'None'}
`).join('\n')}

## Recent Inspections (${inspections.length} records)
${inspections.slice(0, 5).map(i => `
- Type: ${i.inspection_type}
  Date: ${i.scheduled_date}
  Status: ${i.status}
  Findings: ${i.findings || 'None'}
`).join('\n')}

Analyze this data and provide:
1. **Executive Summary**: Overall compliance status and key findings
2. **Risk Assessment**: Identify critical risks, hazards, or compliance gaps
3. **Service History Analysis**: Patterns, recurring issues, maintenance quality
4. **Compliance Status**: Current standing against regulations and standards
5. **Areas of Concern**: Specific issues requiring immediate or near-term attention
6. **Preventative Measures**: Recommended actions to maintain/improve compliance
7. **Next Steps**: Prioritized action items with timeframes

Focus on safety, regulatory compliance, and asset longevity.`;

    const aiResponse = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: analysisPrompt,
      response_json_schema: {
        type: "object",
        properties: {
          executive_summary: { type: "string" },
          overall_compliance_score: { type: "number" },
          risk_level: { type: "string" },
          risk_assessment: {
            type: "object",
            properties: {
              critical_risks: { type: "array", items: { type: "string" } },
              moderate_risks: { type: "array", items: { type: "string" } },
              observations: { type: "array", items: { type: "string" } }
            }
          },
          service_history_analysis: {
            type: "object",
            properties: {
              maintenance_quality: { type: "string" },
              recurring_issues: { type: "array", items: { type: "string" } },
              service_gaps: { type: "array", items: { type: "string" } }
            }
          },
          compliance_status: {
            type: "object",
            properties: {
              current_standing: { type: "string" },
              upcoming_deadlines: { type: "array", items: { type: "string" } },
              expired_items: { type: "array", items: { type: "string" } }
            }
          },
          areas_of_concern: { type: "array", items: { type: "string" } },
          preventative_measures: { type: "array", items: { type: "string" } },
          next_steps: {
            type: "array",
            items: {
              type: "object",
              properties: {
                action: { type: "string" },
                priority: { type: "string" },
                timeframe: { type: "string" }
              }
            }
          }
        }
      }
    });

    // Store report in asset notes or create a document
    const reportDate = new Date().toISOString();
    const reportSummary = `
AI Compliance Report Generated: ${new Date().toLocaleDateString()}
Overall Score: ${aiResponse.overall_compliance_score}/100
Risk Level: ${aiResponse.risk_level}

${aiResponse.executive_summary}
`;

    return Response.json({
      success: true,
      asset_id,
      asset_name: assetData.name,
      generated_date: reportDate,
      report: aiResponse,
      summary: reportSummary
    });

  } catch (error) {
    console.error('Compliance report generation error:', error);
    return Response.json({ 
      error: error.message,
      success: false 
    }, { status: 500 });
  }
});