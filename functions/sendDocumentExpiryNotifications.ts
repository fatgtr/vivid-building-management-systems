import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Get all active documents with expiry dates
    const documents = await base44.asServiceRole.entities.Document.filter({ 
      status: 'active' 
    });

    const today = new Date();
    const notificationsToCreate = [];
    const emailsToSend = [];

    for (const doc of documents) {
      if (!doc.expiry_date) continue;

      const expiryDate = new Date(doc.expiry_date);
      const daysUntilExpiry = Math.ceil((expiryDate - today) / (1000 * 60 * 60 * 24));

      // Check if we need to send notifications
      let shouldNotify = false;
      let notificationTitle = '';
      let priority = 'medium';

      if (daysUntilExpiry < 0) {
        // Already expired
        shouldNotify = true;
        notificationTitle = `Document Expired: ${doc.title}`;
        priority = 'urgent';
      } else if (daysUntilExpiry <= 7) {
        shouldNotify = true;
        notificationTitle = `Document Expiring Soon: ${doc.title}`;
        priority = 'high';
      } else if (daysUntilExpiry <= 30) {
        shouldNotify = true;
        notificationTitle = `Document Expiring in ${daysUntilExpiry} Days: ${doc.title}`;
        priority = 'medium';
      } else if (daysUntilExpiry <= 90) {
        // Only send for 90, 60, 30 day marks
        const reminderDays = [90, 60, 30];
        if (reminderDays.includes(daysUntilExpiry)) {
          shouldNotify = true;
          notificationTitle = `Document Expiring in ${daysUntilExpiry} Days: ${doc.title}`;
          priority = 'low';
        }
      }

      if (shouldNotify) {
        // Get building info
        const buildings = await base44.asServiceRole.entities.Building.filter({ 
          id: doc.building_id 
        });
        const building = buildings[0];

        // Determine who should be notified based on visibility
        const recipients = [];
        
        if (doc.visibility === 'staff_only' || doc.visibility === 'owners_only') {
          // Get building managers and admins
          const users = await base44.asServiceRole.entities.User.list();
          const buildingManagers = users.filter(u => 
            u.role === 'admin' || 
            (u.managed_building_strata_plans && 
             u.managed_building_strata_plans.includes(building?.strata_plan_number))
          );
          recipients.push(...buildingManagers.map(u => u.email));
        }

        // Create notifications for each recipient
        for (const recipientEmail of recipients) {
          const message = daysUntilExpiry < 0 
            ? `The document "${doc.title}" in ${building?.name || 'building'} has expired. Please review and update.`
            : `The document "${doc.title}" in ${building?.name || 'building'} will expire in ${daysUntilExpiry} days.`;

          notificationsToCreate.push({
            recipient_email: recipientEmail,
            title: notificationTitle,
            message,
            type: 'compliance',
            priority,
            building_id: doc.building_id,
            reference_id: doc.id,
            reference_type: 'Document',
            link_url: '/Documents',
            link_text: 'View Document',
          });

          // Also send email for urgent/high priority
          if (priority === 'urgent' || priority === 'high') {
            emailsToSend.push({
              to: recipientEmail,
              subject: notificationTitle,
              body: `
                <h2>${notificationTitle}</h2>
                <p>${message}</p>
                <p><strong>Document Details:</strong></p>
                <ul>
                  <li>Title: ${doc.title}</li>
                  <li>Category: ${doc.category?.replace(/_/g, ' ')}</li>
                  <li>Expiry Date: ${new Date(doc.expiry_date).toLocaleDateString()}</li>
                  <li>Building: ${building?.name || 'N/A'}</li>
                </ul>
                <p>Please log in to the system to review and take action.</p>
              `,
            });
          }
        }
      }
    }

    // Bulk create notifications
    if (notificationsToCreate.length > 0) {
      await base44.asServiceRole.entities.Notification.bulkCreate(notificationsToCreate);
    }

    // Send emails
    for (const email of emailsToSend) {
      try {
        await base44.asServiceRole.integrations.Core.SendEmail({
          from_name: 'Vivid BMS - Document Alerts',
          to: email.to,
          subject: email.subject,
          body: email.body,
        });
      } catch (error) {
        console.error(`Failed to send email to ${email.to}:`, error);
      }
    }

    return Response.json({
      success: true,
      notificationsCreated: notificationsToCreate.length,
      emailsSent: emailsToSend.length,
      documentsChecked: documents.length,
    });

  } catch (error) {
    console.error('Error in sendDocumentExpiryNotifications:', error);
    return Response.json({ 
      error: error.message,
      success: false 
    }, { status: 500 });
  }
});