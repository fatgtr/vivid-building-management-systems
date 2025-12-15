import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        const user = await base44.auth.me();
        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { workOrderData, buildingId, category } = await req.json();

        if (!buildingId || !category) {
            return Response.json({ error: 'Building ID and category are required' }, { status: 400 });
        }

        // Fetch relevant historical data
        const [pastWorkOrders, building, existingSchedules] = await Promise.all([
            base44.asServiceRole.entities.WorkOrder.filter({ 
                building_id: buildingId,
                category: category,
                status: 'completed'
            }),
            base44.asServiceRole.entities.Building.get(buildingId),
            base44.asServiceRole.entities.MaintenanceSchedule.filter({ 
                building_id: buildingId,
                status: 'active'
            })
        ]);

        // Build context for AI
        const historyContext = pastWorkOrders.length > 0 
            ? pastWorkOrders.slice(0, 20).map((wo, idx) => `
${idx + 1}. ${wo.title} (${wo.category})
   - Completed: ${wo.completed_date}
   - Duration: ${wo.start_date && wo.completed_date ? 
        `${Math.ceil((new Date(wo.completed_date) - new Date(wo.start_date)) / (1000 * 60 * 60 * 24))} days` : 'N/A'}
   - Cost: $${wo.actual_cost || wo.estimated_cost || 0}
   - Priority: ${wo.priority}`).join('\n')
            : 'No historical data available';

        const existingSchedulesContext = existingSchedules.length > 0
            ? existingSchedules.map(s => `${s.subject} - ${s.recurrence} (${s.event_start})`).join('\n')
            : 'No existing schedules';

        const currentDate = new Date().toISOString().split('T')[0];

        const prompt = `You are an AI maintenance scheduling assistant for property management.

Building: ${building.name}
Current Date: ${currentDate}
Category: ${category}

Historical Work Orders (${pastWorkOrders.length} completed):
${historyContext}

Existing Maintenance Schedules:
${existingSchedulesContext}

New Work Order Details:
- Title: ${workOrderData.title || 'Recurring ' + category}
- Category: ${category}
- Recurrence: ${workOrderData.recurrence_pattern || 'monthly'}
- Description: ${workOrderData.description || 'N/A'}

Analyze the data and provide intelligent scheduling recommendations considering:
1. Historical patterns - when was similar maintenance typically performed?
2. Optimal timing - avoid conflicts with existing schedules
3. Seasonal factors - consider weather impact for HVAC, roofing, landscaping, etc.
4. Best practices - industry standards for ${category} maintenance frequency
5. Building occupancy - suggest off-peak times for minimal disruption
6. Contractor availability patterns - weekdays vs weekends

Provide:
1. Recommended start date (YYYY-MM-DD format)
2. Optimal time of day (morning/afternoon/evening)
3. Best day of week (if applicable)
4. Estimated duration in hours
5. Priority level (low/medium/high/urgent)
6. Detailed reasoning for the recommendations
7. Risk assessment if this maintenance is delayed
8. Alternative scheduling options (2-3 backup dates)`;

        const schema = {
            type: "object",
            properties: {
                recommended_date: { 
                    type: "string", 
                    description: "Recommended start date in YYYY-MM-DD format" 
                },
                optimal_time: { 
                    type: "string",
                    enum: ["early_morning", "morning", "afternoon", "evening", "after_hours"],
                    description: "Best time of day to perform maintenance"
                },
                best_day_of_week: {
                    type: "string",
                    description: "Recommended day of the week"
                },
                estimated_duration_hours: {
                    type: "number",
                    description: "Estimated time to complete in hours"
                },
                recommended_priority: {
                    type: "string",
                    enum: ["low", "medium", "high", "urgent"],
                    description: "Suggested priority level"
                },
                reasoning: {
                    type: "string",
                    description: "Detailed explanation for the recommendations"
                },
                risk_if_delayed: {
                    type: "string",
                    description: "Consequences of delaying this maintenance"
                },
                alternative_dates: {
                    type: "array",
                    items: {
                        type: "object",
                        properties: {
                            date: { type: "string" },
                            reason: { type: "string" }
                        }
                    },
                    description: "2-3 backup scheduling options"
                },
                cost_optimization_tips: {
                    type: "array",
                    items: { type: "string" },
                    description: "Ways to reduce maintenance costs"
                }
            },
            required: [
                "recommended_date", 
                "optimal_time", 
                "estimated_duration_hours",
                "recommended_priority",
                "reasoning"
            ]
        };

        const response = await base44.asServiceRole.integrations.Core.InvokeLLM({
            prompt,
            response_json_schema: schema
        });

        if (response && response.data) {
            return Response.json({
                success: true,
                suggestions: response.data
            });
        } else {
            return Response.json({ error: 'Failed to generate scheduling suggestions' }, { status: 500 });
        }

    } catch (error) {
        console.error('Scheduling suggestion error:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});