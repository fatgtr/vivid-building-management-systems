import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { buildingId } = await req.json();

    // Get all work orders for the building (last 6 months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const workOrders = await base44.asServiceRole.entities.WorkOrder.filter({ 
      building_id: buildingId
    });

    // Filter to last 6 months
    const recentWorkOrders = workOrders.filter(wo => {
      return new Date(wo.created_date) >= sixMonthsAgo;
    });

    // Prepare data for analysis
    const workOrderSummary = recentWorkOrders.map(wo => ({
      title: wo.title,
      description: wo.description,
      category: wo.category,
      priority: wo.priority,
      unit_id: wo.unit_id,
      status: wo.status,
      created_date: wo.created_date
    }));

    const prompt = `You are a predictive maintenance AI assistant. Analyze these work orders from the last 6 months and identify patterns, recurring issues, and preventative maintenance opportunities.

Work Orders (${recentWorkOrders.length} total): ${JSON.stringify(workOrderSummary, null, 2)}

Identify:
1. Recurring issues (same type of problem happening multiple times)
2. Patterns by unit, category, or system
3. Issues that suggest underlying problems
4. Preventative maintenance that could prevent future issues
5. Cost-saving opportunities through proactive maintenance

Provide actionable insights and specific recommendations.`;

    const analysis = await base44.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: "object",
        properties: {
          recurring_issues: {
            type: "array",
            items: {
              type: "object",
              properties: {
                issue_type: { type: "string" },
                frequency: { type: "number" },
                category: { type: "string" },
                description: { type: "string" },
                severity: { 
                  type: "string",
                  enum: ["low", "medium", "high", "critical"]
                }
              }
            },
            description: "List of recurring issues with frequency"
          },
          preventative_actions: {
            type: "array",
            items: {
              type: "object",
              properties: {
                action: { type: "string" },
                reasoning: { type: "string" },
                estimated_savings: { type: "string" },
                recommended_frequency: { type: "string" }
              }
            },
            description: "Recommended preventative maintenance actions"
          },
          insights: {
            type: "array",
            items: { type: "string" },
            description: "Key insights about maintenance patterns"
          },
          cost_analysis: { 
            type: "string",
            description: "Summary of potential cost savings"
          }
        },
        required: ["recurring_issues", "preventative_actions", "insights"]
      }
    });

    return Response.json({
      ...analysis,
      total_work_orders_analyzed: recentWorkOrders.length,
      analysis_period: '6 months'
    });

  } catch (error) {
    console.error('Error analyzing recurring issues:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});