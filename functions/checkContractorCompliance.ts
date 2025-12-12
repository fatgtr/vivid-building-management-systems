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
    
    const today = new Date();
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(today.getDate() + 30);
    
    const results = {
      emailsSent: 0,
      calendarEntriesCreated: 0,
      contractorsProcessed: 0,
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
            
            // Check if expiring within 30 days or already expired
            if (daysUntilExpiry <= 30) {
              expiringPolicies.push({
                ...policy,
                daysUntilExpiry,
                isExpired: daysUntilExpiry < 0
              });
            }
          }
        }

        if (expiringPolicies.length > 0) {
          // Check if we sent an email recently (don't spam)
          const lastEmailSent = contractor.last_compliance_email_sent 
            ? new Date(contractor.last_compliance_email_sent) 
            : null;
          const daysSinceLastEmail = lastEmailSent 
            ? Math.ceil((today - lastEmailSent) / (1000 * 60 * 60 * 24)) 
            : 999;

          // Send email if no email sent in last 7 days
          if (daysSinceLastEmail >= 7) {
            let emailBody = `Dear ${contractor.contact_name},\n\n`;
            emailBody += `This is an automated reminder from our property management system regarding compliance documentation for ${contractor.company_name}.\n\n`;
            emailBody += `The following policies require your attention:\n\n`;

            for (const policy of expiringPolicies) {
              if (policy.isExpired) {
                emailBody += `❌ ${policy.type}: EXPIRED (expired ${Math.abs(policy.daysUntilExpiry)} days ago)\n`;
              } else {
                emailBody += `⚠️ ${policy.type}: Expires in ${policy.daysUntilExpiry} days (${policy.date})\n`;
              }
              if (policy.details) {
                emailBody += `   Details: ${policy.details}\n`;
              }
              emailBody += `\n`;
            }

            emailBody += `Please provide updated documentation as soon as possible to maintain your active contractor status.\n\n`;
            emailBody += `You can submit updated documents by:\n`;
            emailBody += `1. Replying to this email with attachments\n`;
            emailBody += `2. Contacting the building management office\n\n`;
            emailBody += `Thank you for your prompt attention to this matter.\n\n`;
            emailBody += `Best regards,\nProperty Management System`;

            await base44.asServiceRole.integrations.Core.SendEmail({
              to: contractor.email,
              subject: `Compliance Documentation Required - ${contractor.company_name}`,
              body: emailBody
            });

            // Update last email sent timestamp
            await base44.asServiceRole.entities.Contractor.update(contractor.id, {
              last_compliance_email_sent: today.toISOString()
            });

            results.emailsSent++;
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