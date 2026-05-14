import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Get all active contractors with contract end dates
    const contractors = await base44.asServiceRole.entities.Contractor.filter({
      status: 'active'
    });

    const today = new Date();
    const reminders = [];

    for (const contractor of contractors) {
      if (!contractor.contract_end_date) continue;

      const endDate = new Date(contractor.contract_end_date);
      const daysUntilExpiry = Math.ceil((endDate - today) / (1000 * 60 * 60 * 24));

      // Check if we need to send a reminder (60 days, 30 days, 14 days, 7 days before)
      const reminderIntervals = [60, 30, 14, 7];
      const lastReminder = contractor.last_contract_reminder_date 
        ? new Date(contractor.last_contract_reminder_date) 
        : null;

      let shouldSendReminder = false;
      let reminderType = '';

      for (const interval of reminderIntervals) {
        if (daysUntilExpiry <= interval && daysUntilExpiry > 0) {
          // Check if we haven't sent this reminder already
          if (!lastReminder || (today - lastReminder) / (1000 * 60 * 60 * 24) >= 7) {
            shouldSendReminder = true;
            reminderType = `${interval}_days`;
            break;
          }
        }
      }

      // Also check for expired contracts
      if (daysUntilExpiry < 0 && !contractor.contract_expired_notification_sent) {
        shouldSendReminder = true;
        reminderType = 'expired';
      }

      if (shouldSendReminder) {
        try {
          // Get building manager emails
          const buildings = await base44.asServiceRole.entities.Building.list();
          const managerEmails = buildings
            .filter(b => b.manager_email)
            .map(b => b.manager_email);

          const uniqueEmails = [...new Set([contractor.email, ...managerEmails])];

          for (const email of uniqueEmails) {
            const subject = reminderType === 'expired' 
              ? `⚠️ Contract Expired: ${contractor.company_name}`
              : `🔔 Contract Expiring Soon: ${contractor.company_name}`;

            const body = reminderType === 'expired'
              ? `
                <h2>Contract Expired</h2>
                <p>The contract with <strong>${contractor.company_name}</strong> has expired.</p>
                
                <h3>Contractor Details:</h3>
                <ul>
                  <li><strong>Company:</strong> ${contractor.company_name}</li>
                  <li><strong>Contact:</strong> ${contractor.contact_name}</li>
                  <li><strong>Email:</strong> ${contractor.email}</li>
                  <li><strong>Contract Type:</strong> ${contractor.contract_type || 'N/A'}</li>
                  <li><strong>Expired On:</strong> ${new Date(contractor.contract_end_date).toLocaleDateString()}</li>
                </ul>
                
                <p><strong>Action Required:</strong> Please renew or update the contract immediately.</p>
              `
              : `
                <h2>Contract Expiring Soon</h2>
                <p>The contract with <strong>${contractor.company_name}</strong> is expiring in ${daysUntilExpiry} days.</p>
                
                <h3>Contractor Details:</h3>
                <ul>
                  <li><strong>Company:</strong> ${contractor.company_name}</li>
                  <li><strong>Contact:</strong> ${contractor.contact_name}</li>
                  <li><strong>Email:</strong> ${contractor.email}</li>
                  <li><strong>Contract Type:</strong> ${contractor.contract_type || 'N/A'}</li>
                  <li><strong>Start Date:</strong> ${contractor.contract_start_date ? new Date(contractor.contract_start_date).toLocaleDateString() : 'N/A'}</li>
                  <li><strong>End Date:</strong> ${new Date(contractor.contract_end_date).toLocaleDateString()}</li>
                </ul>
                
                <p><strong>Action Required:</strong> Please review and renew the contract before it expires.</p>
              `;

            await base44.integrations.Core.SendEmail({
              to: email,
              subject,
              body
            });
          }

          // Update contractor record
          const updateData = {
            last_contract_reminder_date: today.toISOString()
          };

          if (reminderType === 'expired') {
            updateData.contract_expired_notification_sent = true;
          }

          await base44.asServiceRole.entities.Contractor.update(contractor.id, updateData);

          reminders.push({
            contractor: contractor.company_name,
            type: reminderType,
            daysUntilExpiry,
            sentTo: uniqueEmails
          });
        } catch (error) {
          console.error(`Failed to send reminder for ${contractor.company_name}:`, error);
        }
      }
    }

    return Response.json({
      success: true,
      reminders_sent: reminders.length,
      reminders
    });

  } catch (error) {
    console.error('Error sending contract expiry reminders:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});