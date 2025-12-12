import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { announcementId } = await req.json();

    if (!announcementId) {
      return Response.json({ error: 'announcementId is required' }, { status: 400 });
    }

    // Get announcement details
    const announcements = await base44.asServiceRole.entities.Announcement.filter({ id: announcementId });
    const announcement = announcements[0];

    if (!announcement) {
      return Response.json({ error: 'Announcement not found' }, { status: 404 });
    }

    // Get all residents in the building
    const residents = await base44.asServiceRole.entities.Resident.filter({ 
      building_id: announcement.building_id,
      status: 'active'
    });

    // Get notification preferences
    const preferences = await base44.asServiceRole.entities.NotificationPreference.list();
    const preferencesMap = new Map(preferences.map(p => [p.resident_email, p]));

    const notificationPromises = [];

    for (const resident of residents) {
      if (!resident.email) continue;

      const prefs = preferencesMap.get(resident.email) || {
        email_announcements: true,
        in_app_announcements: true
      };

      // Create in-app notification
      if (prefs.in_app_announcements) {
        notificationPromises.push(
          base44.asServiceRole.entities.Notification.create({
            recipient_email: resident.email,
            title: `New ${announcement.type} announcement`,
            message: announcement.title,
            type: 'announcement',
            related_id: announcement.id
          })
        );
      }

      // Send email notification
      if (prefs.email_announcements) {
        const building = await base44.asServiceRole.entities.Building.filter({ id: announcement.building_id });
        const buildingName = building[0]?.name || 'Your Building';

        notificationPromises.push(
          base44.asServiceRole.integrations.Core.SendEmail({
            to: resident.email,
            subject: `New Announcement: ${announcement.title}`,
            body: `
              <h2>New ${announcement.type} Announcement</h2>
              <p><strong>Building:</strong> ${buildingName}</p>
              <h3>${announcement.title}</h3>
              <div>${announcement.content}</div>
              <p style="margin-top: 20px; color: #666;">
                Log in to the Resident Portal to view more details.
              </p>
            `
          })
        );
      }
    }

    await Promise.all(notificationPromises);

    return Response.json({ 
      success: true, 
      notified: residents.length 
    });

  } catch (error) {
    console.error('Error sending announcement notifications:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});