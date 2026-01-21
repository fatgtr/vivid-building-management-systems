import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { building_id, months_ahead = 6 } = await req.json();

    if (!building_id) {
      return Response.json({ error: 'building_id is required' }, { status: 400 });
    }

    // Fetch historical energy data
    const energyData = await base44.entities.EnergyUsage.filter({ building_id });

    if (energyData.length === 0) {
      return Response.json({
        predictions: {
          monthly_predictions: [],
          total_predicted_cost: 0,
          confidence_level: 'low',
          risk_factors: ['Insufficient historical data for accurate predictions']
        }
      });
    }

    // Use AI to predict future costs
    const predictions = await base44.integrations.Core.InvokeLLM({
      prompt: `Based on this historical energy usage data, predict the next ${months_ahead} months of energy costs:

Historical data: ${JSON.stringify(energyData.slice(-12))}

Provide monthly predictions with:
1. Month name
2. Predicted consumption (kWh)
3. Predicted cost
4. Confidence level (high/medium/low)
5. Key factors affecting this month
6. Overall risk factors
7. Cost optimization opportunities`,
      response_json_schema: {
        type: 'object',
        properties: {
          monthly_predictions: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                month: { type: 'string' },
                predicted_consumption_kwh: { type: 'number' },
                predicted_cost: { type: 'number' },
                confidence_level: { type: 'string', enum: ['high', 'medium', 'low'] },
                key_factors: {
                  type: 'array',
                  items: { type: 'string' }
                }
              }
            }
          },
          total_predicted_cost: { type: 'number' },
          confidence_level: { type: 'string', enum: ['high', 'medium', 'low'] },
          risk_factors: {
            type: 'array',
            items: { type: 'string' }
          },
          cost_optimization_opportunities: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                title: { type: 'string' },
                description: { type: 'string' },
                estimated_savings: { type: 'number' },
                implementation_difficulty: { type: 'string', enum: ['easy', 'medium', 'hard'] }
              }
            }
          }
        }
      }
    });

    return Response.json({ predictions });

  } catch (error) {
    console.error('Error predicting energy costs:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});