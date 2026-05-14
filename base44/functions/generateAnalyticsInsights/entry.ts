import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { buildingId, timeframe = '30', metricType } = await req.json();

    // Fetch relevant data
    const [workOrders, documents, announcements, assets] = await Promise.all([
      buildingId 
        ? base44.asServiceRole.entities.WorkOrder.filter({ building_id: buildingId })
        : base44.asServiceRole.entities.WorkOrder.list('-created_date', 500),
      buildingId
        ? base44.asServiceRole.entities.Document.filter({ building_id: buildingId })
        : base44.asServiceRole.entities.Document.list(),
      buildingId
        ? base44.asServiceRole.entities.Announcement.filter({ building_id: buildingId })
        : base44.asServiceRole.entities.Announcement.list(),
      buildingId
        ? base44.asServiceRole.entities.Asset.filter({ building_id: buildingId })
        : base44.asServiceRole.entities.Asset.list()
    ]);

    // Filter by timeframe
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - parseInt(timeframe));
    
    const recentWorkOrders = workOrders.filter(wo => 
      new Date(wo.created_date) > cutoffDate
    );

    // Calculate metrics
    const metrics = calculateMetrics(recentWorkOrders, assets, timeframe);
    
    // Build context for AI analysis
    const context = buildAnalyticsContext(metrics, recentWorkOrders, metricType);

    // Get AI insights
    const { response } = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: context,
      response_json_schema: {
        type: "object",
        properties: {
          summary: { type: "string" },
          trends: {
            type: "array",
            items: {
              type: "object",
              properties: {
                metric: { type: "string" },
                trend: { type: "string" },
                change: { type: "string" },
                insight: { type: "string" }
              }
            }
          },
          predictions: {
            type: "array",
            items: {
              type: "object",
              properties: {
                forecast: { type: "string" },
                confidence: { type: "string" },
                recommendation: { type: "string" }
              }
            }
          },
          anomalies: {
            type: "array",
            items: {
              type: "object",
              properties: {
                type: { type: "string" },
                severity: { type: "string" },
                description: { type: "string" },
                action: { type: "string" }
              }
            }
          },
          recommendations: {
            type: "array",
            items: { type: "string" }
          }
        }
      }
    });

    return Response.json({
      success: true,
      metrics,
      insights: response
    });

  } catch (error) {
    console.error('Analytics error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

function calculateMetrics(workOrders, assets, timeframe) {
  const completed = workOrders.filter(wo => wo.status === 'completed');
  const open = workOrders.filter(wo => wo.status === 'open');
  const inProgress = workOrders.filter(wo => wo.status === 'in_progress');
  
  const totalCost = workOrders.reduce((sum, wo) => sum + (wo.actual_cost || 0), 0);
  const avgCost = workOrders.length > 0 ? totalCost / workOrders.length : 0;
  
  const avgCompletionTime = completed.reduce((sum, wo) => {
    if (wo.completed_date && wo.created_date) {
      const days = Math.floor((new Date(wo.completed_date) - new Date(wo.created_date)) / (1000 * 60 * 60 * 24));
      return sum + days;
    }
    return sum;
  }, 0) / (completed.length || 1);

  const categoryBreakdown = workOrders.reduce((acc, wo) => {
    acc[wo.category] = (acc[wo.category] || 0) + 1;
    return acc;
  }, {});

  const priorityBreakdown = workOrders.reduce((acc, wo) => {
    acc[wo.priority] = (acc[wo.priority] || 0) + 1;
    return acc;
  }, {});

  const complianceStatus = calculateComplianceStatus(assets);
  
  const satisfactionScore = workOrders.filter(wo => wo.rating).reduce((sum, wo) => sum + wo.rating, 0) / (workOrders.filter(wo => wo.rating).length || 1);

  return {
    totalWorkOrders: workOrders.length,
    completedCount: completed.length,
    openCount: open.length,
    inProgressCount: inProgress.length,
    completionRate: workOrders.length > 0 ? (completed.length / workOrders.length * 100).toFixed(1) : 0,
    totalCost,
    avgCost: avgCost.toFixed(2),
    avgCompletionTime: avgCompletionTime.toFixed(1),
    categoryBreakdown,
    priorityBreakdown,
    complianceStatus,
    satisfactionScore: satisfactionScore.toFixed(1),
    timeframe
  };
}

function calculateComplianceStatus(assets) {
  const now = new Date();
  const compliant = assets.filter(a => {
    if (!a.next_service_date) return false;
    return new Date(a.next_service_date) > now;
  }).length;
  
  const dueSoon = assets.filter(a => {
    if (!a.next_service_date) return false;
    const nextDate = new Date(a.next_service_date);
    const daysUntil = Math.floor((nextDate - now) / (1000 * 60 * 60 * 24));
    return daysUntil > 0 && daysUntil <= 30;
  }).length;
  
  const overdue = assets.filter(a => {
    if (!a.next_service_date) return false;
    return new Date(a.next_service_date) < now;
  }).length;

  return {
    total: assets.length,
    compliant,
    dueSoon,
    overdue,
    complianceRate: assets.length > 0 ? (compliant / assets.length * 100).toFixed(1) : 0
  };
}

function buildAnalyticsContext(metrics, workOrders, metricType) {
  return `You are an AI analytics expert for building management systems. Analyze the following data and provide actionable insights.

TIMEFRAME: Last ${metrics.timeframe} days

KEY METRICS:
- Total Work Orders: ${metrics.totalWorkOrders}
- Completion Rate: ${metrics.completionRate}%
- Total Maintenance Cost: $${metrics.totalCost.toFixed(2)}
- Average Cost per Work Order: $${metrics.avgCost}
- Average Completion Time: ${metrics.avgCompletionTime} days
- Resident Satisfaction Score: ${metrics.satisfactionScore}/5
- Compliance Rate: ${metrics.complianceStatus.complianceRate}%
- Assets Overdue: ${metrics.complianceStatus.overdue}

CATEGORY BREAKDOWN:
${Object.entries(metrics.categoryBreakdown).map(([cat, count]) => `- ${cat}: ${count}`).join('\n')}

PRIORITY BREAKDOWN:
${Object.entries(metrics.priorityBreakdown).map(([pri, count]) => `- ${pri}: ${count}`).join('\n')}

Please provide:
1. A brief summary of overall performance
2. Trend analysis for key metrics (identify if trending up, down, or stable)
3. Predictive insights for the next 30-60 days with confidence levels
4. Anomaly detection - identify any unusual patterns or concerning metrics
5. Actionable recommendations for improving efficiency, reducing costs, or addressing issues

Focus on: ${metricType || 'all metrics'}`;
}