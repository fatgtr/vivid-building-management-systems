import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    const { 
      recipientEmail, 
      title, 
      message, 
      type, 
      priority = 'medium',
      linkUrl,
      linkText,
      referenceId,
      referenceType,
      buildingId,
      sendEmail = false
    } = await req.json();

    if (!recipientEmail || !title || !message || !type) {
      return Response.json({ 
        error: 'Missing required fields' 
      }, { status: 400 });
    }

    // Check user preferences
    const prefs = await base44.asServiceRole.entities.NotificationPreference.filter({ 
      user_email: recipientEmail 
    });
    
    const userPrefs = prefs[0] || {
      in_app_work_orders: true,
      in_app_messages: true,
      in_app_compliance: true,
      in_app_announcements: true,
      email_work_orders: true,
      email_messages: true,
      email_compliance: true,
      email_announcements: true
    };

    // Check if in-app notification should be created
    const inAppEnabled = shouldCreateInAppNotification(type, userPrefs);
    const emailEnabled = shouldSendEmail(type, userPrefs) && sendEmail;

    let notificationId = null;

    // Create in-app notification
    if (inAppEnabled) {
      const notification = await base44.asServiceRole.entities.Notification.create({
        recipient_email: recipientEmail,
        title,
        message,
        type,
        priority,
        link_url: linkUrl,
        link_text: linkText,
        reference_id: referenceId,
        reference_type: referenceType,
        building_id: buildingId,
        read: false
      });
      
      notificationId = notification.id;
    }

    // Send email if enabled
    if (emailEnabled) {
      try {
        await base44.asServiceRole.integrations.Core.SendEmail({
          to: recipientEmail,
          subject: `Vivid BMS: ${title}`,
          body: `${message}\n\n${linkUrl ? `View details: ${linkUrl}` : ''}`
        });
      } catch (emailError) {
        console.error('Failed to send email:', emailError);
      }
    }

    return Response.json({ 
      success: true, 
      notificationId,
      inAppCreated: inAppEnabled,
      emailSent: emailEnabled
    });

  } catch (error) {
    console.error('Create notification error:', error);
    return Response.json({ 
      error: error.message 
    }, { status: 500 });
  }
});

function shouldCreateInAppNotification(type, prefs) {
  switch (type) {
    case 'work_order':
      return prefs.in_app_work_orders !== false;
    case 'message':
      return prefs.in_app_messages !== false;
    case 'compliance':
      return prefs.in_app_compliance !== false;
    case 'announcement':
      return prefs.in_app_announcements !== false;
    default:
      return true;
  }
}

function shouldSendEmail(type, prefs) {
  switch (type) {
    case 'work_order':
      return prefs.email_work_orders !== false;
    case 'message':
      return prefs.email_messages !== false;
    case 'compliance':
      return prefs.email_compliance !== false;
    case 'announcement':
      return prefs.email_announcements !== false;
    default:
      return true;
  }
}