import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorised' }, { status: 401 });
    }

    const { buildingId } = await req.json();

    // Get building details
    const building = await base44.entities.Building.get(buildingId);
    
    // Get historical work orders for pattern analysis
    const workOrders = await base44.asServiceRole.entities.WorkOrder.filter({ building_id: buildingId });
    
    // Get assets for the building
    const assets = await base44.asServiceRole.entities.Asset.filter({ building_id: buildingId });

    // Analyze patterns using AI
    const { data: predictions } = await base44.integrations.Core.InvokeLLM({
      prompt: `Analyze this building's maintenance data and predict potential issues:

Building Details:
- Type: ${building.building_type}
- Age: ${building.year_built ? new Date().getFullYear() - building.year_built : 'Unknown'} years
- Total Units: ${building.total_units}
- Floors: ${building.floors}

Historical Work Orders (last ${workOrders.length}):
${workOrders.slice(0, 50).map(wo => `- ${wo.title} (${wo.category}, ${wo.priority}, Status: ${wo.status})`).join('\n')}

Assets:
${assets.slice(0, 30).map(a => `- ${a.name} (${a.asset_type}, Status: ${a.operational_status}, Health: ${a.health_score || 'N/A'})`).join('\n')}

Based on this data:
1. Identify patterns in recurring issues
2. Predict potential failures based on asset health and age
3. Highlight critical assets that need attention
4. Consider typical failure rates for this building type and age
5. Look for seasonal patterns

Provide predictions in this exact JSON format:
{
  "predictions": [
    {
      "title": "Brief title",
      "description": "Detailed description",
      "asset_id": "asset_id or null",
      "asset_name": "asset name",
      "category": "electrical/plumbing/hvac/structural/safety/other",
      "priority": "low/medium/high/urgent",
      "confidence": 0-100,
      "estimated_days_until_issue": number,
      "recommended_action": "What to do",
      "cost_if_delayed": "Potential cost impact"
    }
  ]
}`,
      response_json_schema: {
        type: "object",
        properties: {
          predictions: {
            type: "array",
            items: {
              type: "object",
              properties: {
                title: { type: "string" },
                description: { type: "string" },
                asset_id: { type: ["string", "null"] },
                asset_name: { type: "string" },
                category: { type: "string" },
                priority: { type: "string" },
                confidence: { type: "number" },
                estimated_days_until_issue: { type: "number" },
                recommended_action: { type: "string" },
                cost_if_delayed: { type: "string" }
              }
            }
          }
        }
      }
    });

    return Response.json({ 
      predictions: predictions.predictions || [],
      building_info: {
        name: building.name,
        age: building.year_built ? new Date().getFullYear() - building.year_built : null,
        type: building.building_type
      }
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});