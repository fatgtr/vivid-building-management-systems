import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';
import { format } from 'npm:date-fns';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { scheduleId } = await req.json();

    if (!scheduleId) {
      return Response.json({ 
        success: false, 
        error: 'Missing scheduleId' 
      }, { status: 400 });
    }

    // Get the maintenance schedule
    const schedules = await base44.asServiceRole.entities.MaintenanceSchedule.filter({ id: scheduleId });
    
    if (schedules.length === 0) {
      return Response.json({ 
        success: false, 
        error: 'Schedule not found' 
      }, { status: 404 });
    }

    const schedule = schedules[0];

    // Get the associated asset
    let asset = null;
    if (schedule.asset) {
      const assets = await base44.asServiceRole.entities.Asset.filter({ id: schedule.asset });
      if (assets.length > 0) {
        asset = assets[0];
      }
    }

    // Determine template category based on asset or schedule
    let templateCategory = 'general_maintenance';
    if (asset?.asset_category === 'lift') {
      templateCategory = 'lift_maintenance';
    } else if (asset?.asset_category === 'fire_safety') {
      templateCategory = 'fire_safety_testing';
    }

    // Get the appropriate template
    const templates = await base44.asServiceRole.entities.AnnouncementTemplate.filter({
      category: templateCategory,
      status: 'active'
    });

    let announcement;

    if (templates.length > 0) {
      // Use template
      const template = templates[0];
      
      // Replace placeholders
      const title = template.title_template
        .replace('{asset_name}', asset?.name || schedule.subject)
        .replace('{date}', format(new Date(schedule.event_start), 'MMM d, yyyy'))
        .replace('{time}', format(new Date(schedule.event_start), 'h:mm a'));

      const content = template.content_template
        .replace('{asset_name}', asset?.name || schedule.subject)
        .replace('{asset_location}', asset?.location || 'the building')
        .replace('{start_date}', format(new Date(schedule.event_start), 'EEEE, MMMM d, yyyy'))
        .replace('{start_time}', format(new Date(schedule.event_start), 'h:mm a'))
        .replace('{end_date}', format(new Date(schedule.event_end), 'EEEE, MMMM d, yyyy'))
        .replace('{end_time}', format(new Date(schedule.event_end), 'h:mm a'))
        .replace('{contractor}', schedule.contractor_name || 'our maintenance team');

      announcement = await base44.asServiceRole.entities.Announcement.create({
        building_id: schedule.building_id,
        title: title,
        content: content,
        type: template.type,
        priority: template.priority,
        target_audience: template.target_audience,
        status: template.auto_publish ? 'published' : 'draft',
        publish_date: template.auto_publish ? new Date().toISOString().split('T')[0] : null,
      });
    } else {
      // Fallback: create basic announcement
      announcement = await base44.asServiceRole.entities.Announcement.create({
        building_id: schedule.building_id,
        title: `Scheduled Maintenance: ${schedule.subject}`,
        content: `<p>Please be advised that scheduled maintenance is planned for <strong>${format(new Date(schedule.event_start), 'EEEE, MMMM d, yyyy')}</strong>.</p><p>${schedule.description || ''}</p><p>We apologize for any inconvenience this may cause.</p>`,
        type: 'maintenance',
        priority: 'important',
        target_audience: 'all',
        status: 'published',
        publish_date: new Date().toISOString().split('T')[0],
      });
    }

    return Response.json({
      success: true,
      announcement: announcement
    });

  } catch (error) {
    console.error('Create announcement error:', error);
    return Response.json({
      success: false,
      error: error.message || 'Failed to create announcement'
    }, { status: 500 });
  }
});