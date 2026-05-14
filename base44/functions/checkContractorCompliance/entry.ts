import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Authenticate user
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get all active contractors using service role
    const contractors = await base44.asServiceRole.entities.Contractor.filter({ status: 'active' });
    
    // Get all buildings to fetch building managers
    const buildings = await base44.asServiceRole.entities.Building.list();
    
    const today = new Date();
    
    // Configurable alert thresholds (in days before expiry)
    const alertThresholds = [90, 60, 30];
    
    const results = {
      emailsSentToContractors: 0,
      emailsSentToManagers: 0,
      calendarEntriesCreated: 0,
      contractorsProcessed: 0,
      alerts: [],
      errors: []
    };

    for (const contractor of contractors) {
      try {
        results.contractorsProcessed++;
        
        const expiringPolicies = [];
        
        // Check each policy type
        const policies = [
          { type: 'License', date: contractor.license_expiry_date, details: contractor.license_number },
          { type: 'Insurance', date: contractor.insurance_expiry, details: contractor.insurance_details },
          { type: 'Work Cover', date: contractor.work_cover_expiry_date, details: contractor.work_cover_details },
          { type: 'Public Liability', date: contractor.public_liability_expiry_date, details: contractor.public_liability_details }
        ];

        for (const policy of policies) {
          if (policy.date) {
            const expiryDate = new Date(policy.date);
            const daysUntilExpiry = Math.ceil((expiryDate - today) / (1000 * 60 * 60 * 24));
            
            // Check if expiring within any of our thresholds or already expired
            const matchingThreshold = alertThresholds.find(threshold => 
              daysUntilExpiry <= threshold && daysUntilExpiry >= (threshold - 7)
            ) || (daysUntilExpiry < 0 ? 0 : null);
            
            if (matchingThreshold !== null || daysUntilExpiry < 0) {
              expiringPolicies.push({
                ...policy,
                daysUntilExpiry,
                isExpired: daysUntilExpiry < 0,
                threshold: matchingThreshold
              });
            }
          }
        }

        if (expiringPolicies.length > 0) {
          // Initialize compliance reminders tracking if not exists
          const remindersTracking = contractor.compliance_reminders_sent || {};
          
          // Check each policy to see if we need to send a reminder
          const policiesToNotify = [];
          
          for (const policy of expiringPolicies) {
            const reminderKey = `${policy.type}_${policy.threshold || 0}`;
            const lastReminder = remindersTracking[reminderKey];
            
            // Send if no reminder sent for this threshold, or if it's been more than 7 days
            if (!lastReminder || (today - new Date(lastReminder)) / (1000 * 60 * 60 * 24) >= 7) {
              policiesToNotify.push(policy);
              remindersTracking[reminderKey] = today.toISOString();
            }
          }

          if (policiesToNotify.length > 0) {
            // Send email to contractor
            let contractorEmailBody = `Dear ${contractor.contact_name},\n\n`;
            contractorEmailBody += `This is an automated reminder from our property management system regarding compliance documentation for ${contractor.company_name}.\n\n`;
            contractorEmailBody += `The following policies require your attention:\n\n`;

            for (const policy of policiesToNotify) {
              if (policy.isExpired) {
                contractorEmailBody += `❌ ${policy.type}: EXPIRED (expired ${Math.abs(policy.daysUntilExpiry)} days ago)\n`;
              } else {
                contractorEmailBody += `⚠️ ${policy.type}: Expires in ${policy.daysUntilExpiry} days (${policy.date})\n`;
              }
              if (policy.details) {
                contractorEmailBody += `   Details: ${policy.details}\n`;
              }
              contractorEmailBody += `\n`;
            }

            contractorEmailBody += `Please provide updated documentation as soon as possible to maintain your active contractor status.\n\n`;
            contractorEmailBody += `You can submit updated documents by:\n`;
            contractorEmailBody += `1. Replying to this email with attachments\n`;
            contractorEmailBody += `2. Contacting the building management office\n\n`;
            contractorEmailBody += `Thank you for your prompt attention to this matter.\n\n`;
            contractorEmailBody += `Best regards,\nProperty Management System`;

            await base44.asServiceRole.integrations.Core.SendEmail({
              to: contractor.email,
              subject: `Compliance Documentation Required - ${contractor.company_name}`,
              body: contractorEmailBody
            });

            results.emailsSentToContractors++;

            // Send alert emails to building managers
            const relevantBuildings = contractor.building_ids 
              ? buildings.filter(b => contractor.building_ids.includes(b.id))
              : buildings; // If no specific buildings, alert all building managers
            
            const managerEmails = new Set();
            relevantBuildings.forEach(building => {
              if (building.manager_email) managerEmails.add(building.manager_email);
            });

            // Also get admin users
            const adminUsers = await base44.asServiceRole.entities.User.filter({ role: 'admin' });
            adminUsers.forEach(admin => {
              if (admin.email) managerEmails.add(admin.email);
            });

            // Send notification to building managers and admins
            for (const managerEmail of managerEmails) {
              let managerEmailBody = `Dear Building Manager,\n\n`;
              managerEmailBody += `This is an automated compliance alert for contractor: ${contractor.company_name}\n`;
              managerEmailBody += `Contact: ${contractor.contact_name} (${contractor.email})\n\n`;
              managerEmailBody += `The following compliance documents require attention:\n\n`;

              for (const policy of policiesToNotify) {
                if (policy.isExpired) {
                  managerEmailBody += `❌ ${policy.type}: EXPIRED (expired ${Math.abs(policy.daysUntilExpiry)} days ago)\n`;
                } else {
                  managerEmailBody += `⚠️ ${policy.type}: Expires in ${policy.daysUntilExpiry} days (${policy.date})\n`;
                }
                if (policy.details) {
                  managerEmailBody += `   Details: ${policy.details}\n`;
                }
                managerEmailBody += `\n`;
              }

              managerEmailBody += `Please follow up with the contractor to ensure compliance documentation is updated.\n\n`;
              managerEmailBody += `Best regards,\nProperty Management System`;

              await base44.asServiceRole.integrations.Core.SendEmail({
                to: managerEmail,
                subject: `Contractor Compliance Alert: ${contractor.company_name}`,
                body: managerEmailBody
              });

              results.emailsSentToManagers++;
            }

            // Log alert for audit purposes
            const alertLog = {
              contractor_id: contractor.id,
              contractor_name: contractor.company_name,
              timestamp: today.toISOString(),
              policies: policiesToNotify.map(p => ({
                type: p.type,
                expiry_date: p.date,
                days_until_expiry: p.daysUntilExpiry,
                is_expired: p.isExpired,
                threshold: p.threshold
              })),
              notifications_sent: {
                contractor: contractor.email,
                managers: Array.from(managerEmails)
              }
            };
            
            results.alerts.push(alertLog);

            // Update contractor record with reminder tracking
            await base44.asServiceRole.entities.Contractor.update(contractor.id, {
              last_compliance_email_sent: today.toISOString(),
              last_compliance_check_date: today.toISOString(),
              compliance_reminders_sent: remindersTracking,
              compliance_notification_date: contractor.compliance_notification_date || today.toISOString()
            });
          }

          // Create calendar entries for each expiring policy
          for (const policy of expiringPolicies) {
            const expiryDate = new Date(policy.date);
            
            try {
              await base44.asServiceRole.entities.MaintenanceSchedule.create({
                building_id: null, // System-wide
                subject: `${contractor.company_name} - ${policy.type} ${policy.isExpired ? 'EXPIRED' : 'Expiring'}`,
                description: `Contractor compliance reminder:\n${policy.type} for ${contractor.company_name}\n${policy.details || ''}\n\nContact: ${contractor.contact_name}\nEmail: ${contractor.email}\nPhone: ${contractor.phone || 'N/A'}`,
                event_start: policy.date,
                event_end: policy.date,
                recurrence: 'one_time',
                contractor_id: contractor.id,
                contractor_name: contractor.company_name,
                status: policy.isExpired ? 'active' : 'active',
                auto_send_email: false,
                never_expire: false
              });
              
              results.calendarEntriesCreated++;
            } catch (calError) {
              // Calendar entry might already exist, that's okay
              console.log(`Calendar entry already exists for ${contractor.company_name} - ${policy.type}`);
            }
          }
        }
      } catch (error) {
        results.errors.push({
          contractor: contractor.company_name,
          error: error.message
        });
      }
    }

    return Response.json({
      success: true,
      results
    });

  } catch (error) {
    console.error('Contractor compliance check error:', error);
    return Response.json({ 
      success: false,
      error: error.message 
    }, { status: 500 });
  }
});