import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { building_id, months_ahead = 6 } = await req.json();

    // Fetch historical energy usage
    const energyData = await base44.entities.EnergyUsage.filter({ building_id });
    
    // Sort by date
    const sortedData = energyData.sort((a, b) => 
      new Date(a.reading_date) - new Date(b.reading_date)
    );

    // Get building details
    const building = await base44.entities.Building.get(building_id);

    const predictionPrompt = `Based on the following historical energy usage data, predict future energy costs:

Historical Data (${sortedData.length} readings):
${sortedData.slice(-24).map(d => `
- Date: ${d.reading_date}
- Energy Type: ${d.energy_type}
- Consumption: ${d.consumption_kwh} kWh
- Cost: $${d.cost || 'N/A'}
- Temperature: ${d.temperature_avg || 'N/A'}°C
`).join('\n')}

Building: ${building.name} (${building.building_type}, ${building.total_units} units)

Please predict energy consumption and costs for the next ${months_ahead} months, considering:
1. Historical consumption patterns
2. Seasonal variations
3. Typical energy price trends
4. Building characteristics

Provide monthly predictions with confidence levels and factors influencing each prediction.`;

    const { data: predictions } = await base44.integrations.Core.InvokeLLM({
      prompt: predictionPrompt,
      response_json_schema: {
        type: "object",
        properties: {
          monthly_predictions: {
            type: "array",
            items: {
              type: "object",
              properties: {
                month: { type: "string" },
                predicted_consumption_kwh: { type: "number" },
                predicted_cost: { type: "number" },
                confidence_level: { type: "string", enum: ["high", "medium", "low"] },
                key_factors: {
                  type: "array",
                  items: { type: "string" }
                }
              }
            }
          },
          total_predicted_cost: { type: "number" },
          cost_trend: { type: "string" },
          risk_factors: {
            type: "array",
            items: { type: "string" }
          },
          cost_optimization_opportunities: {
            type: "array",
            items: {
              type: "object",
              properties: {
                opportunity: { type: "string" },
                potential_savings: { type: "number" }
              }
            }
          }
        }
      }
    });

    return Response.json({
      success: true,
      predictions,
      building_name: building.name
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});