import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Authenticate user (for manual trigger) - for scheduled runs, this can be service role only
    const user = await base44.auth.me().catch(() => null);
    
    const today = new Date();
    const sixtyDaysFromNow = new Date();
    sixtyDaysFromNow.setDate(today.getDate() + 60);
    
    const results = {
      contractorsChecked: 0,
      managersNotified: 0,
      followUpsRequired: 0,
      statusUpdated: 0,
      errors: []
    };

    // Get all contractors (excluding inactive)
    const contractors = await base44.asServiceRole.entities.Contractor.filter({});
    
    // Get all buildings to find managers
    const buildings = await base44.asServiceRole.entities.Building.list();
    
    // Get all users to find building managers
    const users = await base44.asServiceRole.entities.User.list();
    const adminUsers = users.filter(u => u.role === 'admin');

    for (const contractor of contractors) {
      if (contractor.status === 'inactive') continue;
      
      try {
        results.contractorsChecked++;
        
        const expiringOrExpiredPolicies = [];
        
        // Check each policy type for expiry within 60 days or already expired
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
            
            // Check if expiring within 60 days or already expired
            if (daysUntilExpiry <= 60) {
              expiringOrExpiredPolicies.push({
                ...policy,
                daysUntilExpiry,
                isExpired: daysUntilExpiry < 0,
                expiryDate
              });
            }
          }
        }

        // If there are expiring/expired policies, take action
        if (expiringOrExpiredPolicies.length > 0) {
          const needsStatusUpdate = contractor.status !== 'pending_compliance_review';
          const isInitialNotification = !contractor.compliance_notification_date;
          const notificationDate = contractor.compliance_notification_date 
            ? new Date(contractor.compliance_notification_date) 
            : null;
          const daysSinceNotification = notificationDate
            ? Math.ceil((today - notificationDate) / (1000 * 60 * 60 * 24))
            : 0;
          const needsFollowUp = daysSinceNotification >= 14;

          // Update contractor status and tracking
          const updateData = {
            last_compliance_check_date: today.toISOString()
          };

          if (needsStatusUpdate) {
            updateData.status = 'pending_compliance_review';
            updateData.compliance_notification_date = today.toISOString();
            results.statusUpdated++;
          }

          await base44.asServiceRole.entities.Contractor.update(contractor.id, updateData);

          // Send email to building managers
          if (isInitialNotification || needsFollowUp) {
            const emailSubject = needsFollowUp 
              ? `FOLLOW-UP: Contractor Compliance Review Required - ${contractor.company_name}`
              : `Contractor Compliance Review Required - ${contractor.company_name}`;

            let emailBody = `Dear Building Manager,\n\n`;
            
            if (needsFollowUp) {
              emailBody += `This is a follow-up notification. It has been ${daysSinceNotification} days since the initial compliance notification.\n\n`;
            }
            
            emailBody += `The following contractor requires immediate compliance review:\n\n`;
            emailBody += `Contractor: ${contractor.company_name}\n`;
            emailBody += `Contact: ${contractor.contact_name}\n`;
            emailBody += `Email: ${contractor.email}\n`;
            emailBody += `Phone: ${contractor.phone || 'N/A'}\n`;
            if (contractor.abn) emailBody += `ABN: ${contractor.abn}\n`;
            if (contractor.acn) emailBody += `ACN: ${contractor.acn}\n`;
            emailBody += `\n`;
            emailBody += `COMPLIANCE ISSUES:\n`;
            emailBody += `${'='.repeat(50)}\n`;

            for (const policy of expiringOrExpiredPolicies) {
              if (policy.isExpired) {
                emailBody += `\n❌ ${policy.type}: EXPIRED\n`;
                emailBody += `   Expired: ${Math.abs(policy.daysUntilExpiry)} days ago (${policy.date})\n`;
              } else {
                emailBody += `\n⚠️ ${policy.type}: EXPIRING SOON\n`;
                emailBody += `   Expires in: ${policy.daysUntilExpiry} days (${policy.date})\n`;
              }
              if (policy.details) {
                emailBody += `   Details: ${policy.details}\n`;
              }
            }

            emailBody += `\n${'='.repeat(50)}\n\n`;
            emailBody += `ACTION REQUIRED:\n`;
            emailBody += `1. Contact the contractor immediately to request updated documentation\n`;
            emailBody += `2. Review and update contractor status in the system once documents are received\n`;
            emailBody += `3. Verify all compliance documents are current before approving work orders\n\n`;
            
            if (needsFollowUp) {
              emailBody += `⚠️ IMPORTANT: This contractor has been in pending compliance review status for ${daysSinceNotification} days.\n`;
              emailBody += `Consider suspending this contractor until compliance is resolved.\n\n`;
            }

            emailBody += `To manage this contractor, log into the property management system.\n\n`;
            emailBody += `This is an automated notification from the Property Management Compliance System.\n`;

            // Send to all admin users (building managers)
            for (const manager of adminUsers) {
              try {
                await base44.asServiceRole.integrations.Core.SendEmail({
                  to: manager.email,
                  subject: emailSubject,
                  body: emailBody
                });
                
                results.managersNotified++;
              } catch (emailError) {
                results.errors.push({
                  contractor: contractor.company_name,
                  manager: manager.email,
                  error: `Email failed: ${emailError.message}`
                });
              }
            }

            if (needsFollowUp) {
              results.followUpsRequired++;
            }
          }
        } else {
          // No issues found - update last check date and ensure status is active if it was pending
          const updateData = {
            last_compliance_check_date: today.toISOString()
          };
          
          if (contractor.status === 'pending_compliance_review') {
            updateData.status = 'active';
            updateData.compliance_notification_date = null;
          }
          
          await base44.asServiceRole.entities.Contractor.update(contractor.id, updateData);
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
      message: 'Weekly compliance check completed',
      results,
      timestamp: today.toISOString()
    });

  } catch (error) {
    console.error('Weekly compliance check error:', error);
    return Response.json({ 
      success: false,
      error: error.message 
    }, { status: 500 });
  }
});