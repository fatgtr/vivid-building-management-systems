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
    
    // Get all assets
    const assets = await base44.asServiceRole.entities.Asset.filter({ building_id: buildingId });
    
    // Get existing maintenance schedules
    const existingSchedules = await base44.asServiceRole.entities.MaintenanceSchedule.filter({ building_id: buildingId });

    // Generate optimal schedule using AI
    const { data: schedule } = await base44.integrations.Core.InvokeLLM({
      prompt: `Generate an optimal preventive maintenance schedule for this building:

Building Details:
- Type: ${building.building_type}
- Age: ${building.year_built ? new Date().getFullYear() - building.year_built : 'Unknown'} years
- Total Units: ${building.total_units}
- Floors: ${building.floors}

Assets Requiring Maintenance:
${assets.map(a => `- ${a.name} (${a.asset_type})
  Current Status: ${a.operational_status}
  Last Service: ${a.last_service_date || 'Never'}
  Service Frequency: ${a.service_frequency || 'Not set'}
  Criticality: ${a.criticality || 'medium'}
  Health Score: ${a.health_score || 'Unknown'}`).join('\n\n')}

Existing Schedules: ${existingSchedules.length} schedules already defined

Create an optimised maintenance schedule considering:
1. Australian building regulations and standards
2. Asset criticality and age
3. Building type and usage patterns
4. Seasonal requirements (Australian climate)
5. Cost optimisation (group similar tasks)
6. Minimise disruption to residents

Provide schedule in this JSON format:
{
  "schedule_items": [
    {
      "asset_id": "asset_id",
      "asset_name": "asset name",
      "task_title": "What needs to be done",
      "description": "Detailed task description",
      "frequency": "weekly/monthly/quarterly/half_yearly/yearly",
      "estimated_duration_hours": number,
      "priority": "low/medium/high/critical",
      "best_month": "Jan/Feb/etc or null",
      "notes": "Any special considerations"
    }
  ],
  "summary": "Overview of the schedule strategy"
}`,
      response_json_schema: {
        type: "object",
        properties: {
          schedule_items: {
            type: "array",
            items: {
              type: "object",
              properties: {
                asset_id: { type: "string" },
                asset_name: { type: "string" },
                task_title: { type: "string" },
                description: { type: "string" },
                frequency: { type: "string" },
                estimated_duration_hours: { type: "number" },
                priority: { type: "string" },
                best_month: { type: ["string", "null"] },
                notes: { type: "string" }
              }
            }
          },
          summary: { type: "string" }
        }
      }
    });

    return Response.json(schedule);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});