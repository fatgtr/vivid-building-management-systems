import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { building_id } = await req.json();

    // Fetch assets for the building
    const assets = building_id 
      ? await base44.asServiceRole.entities.Asset.filter({ building_id, status: 'active' })
      : await base44.asServiceRole.entities.Asset.filter({ status: 'active' });

    if (assets.length === 0) {
      return Response.json({ 
        message: 'No active assets found',
        scheduled: 0,
        flagged: 0
      });
    }

    // Analyze assets using AI
    const analysisPrompt = `Analyze these building assets and identify maintenance scheduling needs:

${assets.map(a => `
Asset: ${a.name}
Type: ${a.asset_type}
Category: ${a.asset_main_category}
Service Frequency: ${a.service_frequency || 'Not set'}
Next Service: ${a.next_service_date || 'Not scheduled'}
Last Service: ${a.last_service_date || 'Unknown'}
Compliance Status: ${a.compliance_status || 'unknown'}
Location: ${a.location || 'Not specified'}
Floor: ${a.floor || 'N/A'}
`).join('\n---\n')}

Identify:
1. Assets requiring immediate attention (overdue, requires_attention status)
2. Assets due for service in next 30 days
3. Assets with no scheduled service but have a service frequency

Return JSON array with recommended schedules:
- asset_id, asset_name, priority (critical/high/medium/low), reason, recommended_date, recurrence`;

    const aiResponse = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: analysisPrompt,
      response_json_schema: {
        type: "object",
        properties: {
          schedules: {
            type: "array",
            items: {
              type: "object",
              properties: {
                asset_id: { type: "string" },
                asset_name: { type: "string" },
                priority: { type: "string" },
                reason: { type: "string" },
                recommended_date: { type: "string" },
                recurrence: { type: "string" }
              }
            }
          }
        }
      }
    });

    const recommendations = aiResponse.schedules || [];
    
    // Create maintenance schedules
    const created = [];
    const flagged = [];

    for (const rec of recommendations) {
      const asset = assets.find(a => a.id === rec.asset_id || a.name === rec.asset_name);
      if (!asset) continue;

      // Map recurrence from asset service_frequency
      const recurrenceMap = {
        'monthly': 'monthly',
        'bi_monthly': 'bi_monthly',
        'quarterly': 'quarterly',
        'half_yearly': 'half_yearly',
        'yearly': 'yearly',
        'bi_yearly': 'yearly'
      };

      const recurrence = recurrenceMap[asset.service_frequency] || rec.recurrence || 'one_time';

      // Check if schedule already exists
      const existing = await base44.asServiceRole.entities.MaintenanceSchedule.filter({
        building_id: asset.building_id,
        asset: asset.name,
        status: 'active'
      });

      if (existing.length === 0) {
        // Create new schedule
        const schedule = await base44.asServiceRole.entities.MaintenanceSchedule.create({
          building_id: asset.building_id,
          subject: `${asset.asset_type?.replace(/_/g, ' ')} - ${asset.name}`,
          description: `${rec.reason}\n\nAsset ID: ${asset.id}\nLocation: ${asset.location || 'N/A'}`,
          event_start: rec.recommended_date,
          recurrence,
          asset: asset.name,
          job_area: asset.location || asset.floor || 'Building',
          auto_send_email: rec.priority === 'critical' || rec.priority === 'high',
          status: 'active'
        });

        created.push({
          schedule_id: schedule.id,
          asset_name: asset.name,
          priority: rec.priority,
          date: rec.recommended_date
        });
      }

      // Flag critical/high priority assets
      if (rec.priority === 'critical' || rec.priority === 'high') {
        flagged.push({
          asset_id: asset.id,
          asset_name: asset.name,
          priority: rec.priority,
          reason: rec.reason,
          current_status: asset.compliance_status
        });
      }
    }

    return Response.json({
      success: true,
      scheduled: created.length,
      flagged: flagged.length,
      created_schedules: created,
      flagged_assets: flagged,
      total_analyzed: assets.length
    });

  } catch (error) {
    console.error('Schedule generation error:', error);
    return Response.json({ 
      error: error.message,
      success: false 
    }, { status: 500 });
  }
});