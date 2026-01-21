import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { buildingId } = await req.json();

        if (!buildingId) {
            return Response.json({ error: 'Building ID is required' }, { status: 400 });
        }

        // Fetch all work orders for the building
        const workOrders = await base44.asServiceRole.entities.WorkOrder.filter({ building_id: buildingId });
        
        // Fetch assets for context
        const assets = await base44.asServiceRole.entities.Asset.filter({ building_id: buildingId });

        if (workOrders.length < 5) {
            return Response.json({
                success: true,
                insights: {
                    patterns: [],
                    predictions: [],
                    recommendations: [],
                    summary: "Insufficient data for AI analysis. At least 5 work orders are needed to generate meaningful insights."
                }
            });
        }

        // Prepare data for AI analysis
        const workOrderSummary = workOrders.map(wo => ({
            category: wo.main_category || wo.category,
            priority: wo.priority,
            status: wo.status,
            cost: wo.actual_cost || wo.estimated_cost || 0,
            created_date: wo.created_date,
            completed_date: wo.completed_date,
            resolution_time_days: wo.completed_date 
                ? Math.round((new Date(wo.completed_date) - new Date(wo.created_date)) / (1000 * 60 * 60 * 24))
                : null,
            title: wo.title,
            description: wo.description
        }));

        const assetSummary = assets.map(a => ({
            name: a.name,
            type: a.asset_type,
            category: a.asset_main_category,
            last_service: a.last_service_date,
            next_service: a.next_service_date,
            operational_status: a.operational_status,
            service_frequency: a.service_frequency,
            criticality: a.criticality,
            health_score: a.health_score
        }));

        // Use AI to analyze patterns
        const analysisPrompt = `You are an expert building maintenance analyst. Analyze the following work order data and provide actionable insights.

Work Orders Summary (${workOrders.length} total):
${JSON.stringify(workOrderSummary.slice(-50), null, 2)}

Assets Summary (${assets.length} total):
${JSON.stringify(assetSummary.slice(0, 30), null, 2)}

Provide a comprehensive analysis with the following structure (respond in valid JSON format):
{
  "patterns": [
    {
      "pattern": "Brief description of the pattern",
      "impact": "Cost impact or resolution time impact",
      "frequency": "How often this occurs",
      "severity": "high|medium|low"
    }
  ],
  "predictions": [
    {
      "asset_or_system": "Specific asset or system name",
      "predicted_issue": "What is likely to fail or need attention",
      "timeframe": "When this is expected (e.g., 'within 3 months')",
      "confidence": "high|medium|low",
      "reasoning": "Why this prediction is made"
    }
  ],
  "recommendations": [
    {
      "title": "Recommendation title",
      "description": "Detailed recommendation",
      "priority": "high|medium|low",
      "estimated_savings": "Potential cost savings or time saved",
      "implementation": "How to implement this"
    }
  ],
  "summary": "A 2-3 sentence executive summary of key findings"
}

Focus on:
1. Categories or priorities that consistently lead to higher costs or longer resolution times
2. Recurring issues that suggest preventative maintenance opportunities
3. Specific assets that show declining health scores or overdue services
4. Seasonal patterns or trends
5. Critical systems requiring immediate attention`;

        const analysisResult = await base44.asServiceRole.integrations.Core.InvokeLLM({
            prompt: analysisPrompt,
            response_json_schema: {
                type: "object",
                properties: {
                    patterns: {
                        type: "array",
                        items: {
                            type: "object",
                            properties: {
                                pattern: { type: "string" },
                                impact: { type: "string" },
                                frequency: { type: "string" },
                                severity: { type: "string" }
                            }
                        }
                    },
                    predictions: {
                        type: "array",
                        items: {
                            type: "object",
                            properties: {
                                asset_or_system: { type: "string" },
                                predicted_issue: { type: "string" },
                                timeframe: { type: "string" },
                                confidence: { type: "string" },
                                reasoning: { type: "string" }
                            }
                        }
                    },
                    recommendations: {
                        type: "array",
                        items: {
                            type: "object",
                            properties: {
                                title: { type: "string" },
                                description: { type: "string" },
                                priority: { type: "string" },
                                estimated_savings: { type: "string" },
                                implementation: { type: "string" }
                            }
                        }
                    },
                    summary: { type: "string" }
                }
            }
        });

        return Response.json({
            success: true,
            insights: analysisResult,
            metadata: {
                total_work_orders: workOrders.length,
                total_assets: assets.length,
                analyzed_at: new Date().toISOString()
            }
        });

    } catch (error) {
        console.error('Work order pattern analysis error:', error);
        return Response.json({ 
            error: 'Failed to analyze work order patterns',
            details: error.message 
        }, { status: 500 });
    }
});