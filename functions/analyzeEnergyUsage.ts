import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { building_id, unit_id, months = 12 } = await req.json();

    // Fetch energy usage data
    const filter = unit_id 
      ? { building_id, unit_id }
      : { building_id };
    
    const energyData = await base44.entities.EnergyUsage.filter(filter);
    
    // Sort by date
    const sortedData = energyData.sort((a, b) => 
      new Date(a.reading_date) - new Date(b.reading_date)
    );

    // Get building details
    const building = await base44.entities.Building.get(building_id);

    // Prepare data for AI analysis
    const analysisPrompt = `Analyze the following energy usage data for ${building.name}${unit_id ? ' (specific unit)' : ''}:

Energy Readings (last ${months} months):
${sortedData.slice(-months * 4).map(d => `
- Date: ${d.reading_date}
- Type: ${d.energy_type}
- Consumption: ${d.consumption_kwh} kWh
- Cost: $${d.cost || 'N/A'}
- Temperature: ${d.temperature_avg || 'N/A'}°C
- Source: ${d.reading_source}
`).join('\n')}

Building Info:
- Type: ${building.building_type}
- Total Units: ${building.total_units}
- Floors: ${building.floors}
- Year Built: ${building.year_built}

Please provide:
1. Overall consumption trends and patterns
2. Peak usage periods and potential causes
3. Anomalies or unusual consumption spikes
4. Comparison to typical buildings of this type
5. Seasonal variations and weather impact
6. Cost efficiency analysis
7. Top 3 specific recommendations for reducing energy consumption
8. Estimated potential savings from implementing recommendations

Respond in JSON format.`;

    const { data: analysis } = await base44.integrations.Core.InvokeLLM({
      prompt: analysisPrompt,
      response_json_schema: {
        type: "object",
        properties: {
          overall_trend: { type: "string" },
          trend_direction: { type: "string", enum: ["increasing", "decreasing", "stable"] },
          peak_usage_periods: {
            type: "array",
            items: {
              type: "object",
              properties: {
                period: { type: "string" },
                reason: { type: "string" }
              }
            }
          },
          anomalies: {
            type: "array",
            items: {
              type: "object",
              properties: {
                date: { type: "string" },
                description: { type: "string" },
                severity: { type: "string" }
              }
            }
          },
          benchmark_comparison: { type: "string" },
          seasonal_analysis: { type: "string" },
          cost_efficiency_score: { type: "number" },
          recommendations: {
            type: "array",
            items: {
              type: "object",
              properties: {
                title: { type: "string" },
                description: { type: "string" },
                priority: { type: "string" },
                estimated_savings_percent: { type: "number" },
                implementation_difficulty: { type: "string" }
              }
            }
          },
          estimated_annual_savings: { type: "number" }
        }
      }
    });

    // Calculate statistics
    const totalConsumption = sortedData.reduce((sum, d) => sum + d.consumption_kwh, 0);
    const totalCost = sortedData.reduce((sum, d) => sum + (d.cost || 0), 0);
    const avgMonthlyConsumption = totalConsumption / months;
    const avgMonthlyCost = totalCost / months;

    return Response.json({
      success: true,
      analysis,
      statistics: {
        total_consumption_kwh: totalConsumption,
        total_cost: totalCost,
        avg_monthly_consumption: avgMonthlyConsumption,
        avg_monthly_cost: avgMonthlyCost,
        readings_count: sortedData.length
      },
      raw_data: sortedData
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});