import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { announcementId, channels } = await req.json();
    
    const announcement = await base44.asServiceRole.entities.Announcement.get(announcementId);
    const building = await base44.asServiceRole.entities.Building.get(announcement.building_id);
    
    // Get target residents based on audience
    let residents = await base44.asServiceRole.entities.Resident.filter({ 
      building_id: announcement.building_id 
    });

    if (announcement.target_audience === 'owners_only') {
      residents = residents.filter(r => r.resident_type === 'owner');
    } else if (announcement.target_audience === 'tenants_only') {
      residents = residents.filter(r => r.resident_type === 'tenant');
    } else if (announcement.target_audience === 'specific_units' && announcement.specific_units) {
      residents = residents.filter(r => announcement.specific_units.includes(r.unit_number));
    }

    let notificationCount = 0;
    const errors = [];

    for (const resident of residents) {
      try {
        // Create in-app notification
        await base44.asServiceRole.entities.Notification.create({
          recipient_email: resident.email,
          type: 'announcement',
          title: announcement.title,
          message: announcement.content.substring(0, 200) + (announcement.content.length > 200 ? '...' : ''),
          priority: announcement.priority,
          related_entity_type: 'Announcement',
          related_entity_id: announcement.id,
          action_url: `/bulletin-board?announcement=${announcement.id}`,
          is_read: false
        });

        // Send Email
        if (channels.email && resident.email) {
          const priorityColors = {
            urgent: '#ef4444',
            high: '#f97316',
            normal: '#3b82f6',
            low: '#64748b'
          };

          await base44.asServiceRole.integrations.Core.SendEmail({
            to: resident.email,
            subject: `${announcement.priority === 'urgent' ? '🚨 URGENT: ' : ''}${announcement.title}`,
            body: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <div style="background: linear-gradient(to right, #3b82f6, #6366f1); color: white; padding: 30px; border-radius: 8px 8px 0 0;">
                  <h1 style="margin: 0; font-size: 24px;">${building.name}</h1>
                  <p style="margin: 10px 0 0; opacity: 0.9;">Building Announcement</p>
                </div>
                
                <div style="background: white; padding: 30px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 8px 8px;">
                  <div style="background: ${priorityColors[announcement.priority]}; color: white; display: inline-block; padding: 6px 12px; border-radius: 4px; font-size: 12px; font-weight: bold; margin-bottom: 20px; text-transform: uppercase;">
                    ${announcement.priority} Priority
                  </div>
                  
                  <h2 style="color: #1e293b; margin: 0 0 20px;">${announcement.title}</h2>
                  
                  <div style="color: #475569; line-height: 1.6; white-space: pre-wrap;">
                    ${announcement.content}
                  </div>
                  
                  ${announcement.category ? `
                    <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #e2e8f0;">
                      <span style="color: #64748b; font-size: 14px;">Category: ${announcement.category}</span>
                    </div>
                  ` : ''}
                  
                  <div style="margin-top: 30px; padding: 20px; background: #f8fafc; border-radius: 8px; text-align: center;">
                    <p style="margin: 0; color: #64748b; font-size: 14px;">Posted by ${announcement.author_name || 'Building Management'}</p>
                    <p style="margin: 5px 0 0; color: #94a3b8; font-size: 12px;">${new Date().toLocaleDateString()}</p>
                  </div>
                </div>
              </div>
            `
          });
        }

        // TODO: Send SMS (requires SMS provider integration)
        // if (channels.sms && resident.phone) { ... }

        // TODO: Send Push Notification (requires push notification service)
        // if (channels.push) { ... }

        notificationCount++;
      } catch (error) {
        console.error(`Failed to notify ${resident.email}:`, error);
        errors.push({ email: resident.email, error: error.message });
      }
    }

    // Update announcement to mark as sent
    await base44.asServiceRole.entities.Announcement.update(announcementId, {
      notification_sent: true,
      notification_sent_date: new Date().toISOString()
    });

    return Response.json({ 
      success: true,
      notificationCount,
      totalResidents: residents.length,
      errors: errors.length > 0 ? errors : undefined
    });
  } catch (error) {
    console.error('Announcement notification failed:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});