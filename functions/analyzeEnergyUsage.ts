import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { building_id, unit_id, months = 12 } = await req.json();

    if (!building_id) {
      return Response.json({ error: 'building_id is required' }, { status: 400 });
    }

    // Fetch energy usage data
    const filter = unit_id 
      ? { building_id, unit_id }
      : { building_id };
    
    const energyData = await base44.entities.EnergyUsage.filter(filter);

    if (energyData.length === 0) {
      return Response.json({
        statistics: {
          total_consumption_kwh: 0,
          total_cost: 0,
          avg_monthly_consumption: 0,
          avg_monthly_cost: 0
        },
        analysis: {
          overall_trend: 'No data available for analysis',
          cost_efficiency_score: 0,
          estimated_annual_savings: 0
        }
      });
    }

    // Calculate statistics
    const totalConsumption = energyData.reduce((sum, e) => sum + (e.consumption_kwh || 0), 0);
    const totalCost = energyData.reduce((sum, e) => sum + (e.cost || 0), 0);
    const avgMonthlyConsumption = totalConsumption / months;
    const avgMonthlyCost = totalCost / months;

    // Use AI to analyze patterns
    const aiAnalysis = await base44.integrations.Core.InvokeLLM({
      prompt: `Analyze this energy usage data for a building and provide insights:
      
Total consumption: ${totalConsumption} kWh over ${months} months
Total cost: $${totalCost}
Average monthly: ${avgMonthlyConsumption.toFixed(0)} kWh / $${avgMonthlyCost.toFixed(2)}

Data points: ${JSON.stringify(energyData.slice(0, 20))}

Provide:
1. Overall trend description
2. Trend direction (increasing/decreasing/stable)
3. Benchmark comparison (is this efficient for this building type?)
4. Seasonal analysis
5. Peak usage periods with reasons
6. Any anomalies detected
7. Cost efficiency score (0-100)
8. Estimated annual savings potential
9. Top 3 recommendations`,
      response_json_schema: {
        type: 'object',
        properties: {
          overall_trend: { type: 'string' },
          trend_direction: { type: 'string', enum: ['increasing', 'decreasing', 'stable'] },
          benchmark_comparison: { type: 'string' },
          seasonal_analysis: { type: 'string' },
          peak_usage_periods: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                period: { type: 'string' },
                reason: { type: 'string' }
              }
            }
          },
          anomalies: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                date: { type: 'string' },
                severity: { type: 'string' },
                description: { type: 'string' }
              }
            }
          },
          cost_efficiency_score: { type: 'number' },
          estimated_annual_savings: { type: 'number' },
          recommendations: {
            type: 'array',
            items: { type: 'string' }
          }
        }
      }
    });

    return Response.json({
      statistics: {
        total_consumption_kwh: totalConsumption,
        total_cost: totalCost,
        avg_monthly_consumption: avgMonthlyConsumption,
        avg_monthly_cost: avgMonthlyCost
      },
      analysis: aiAnalysis
    });

  } catch (error) {
    console.error('Error analyzing energy usage:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});