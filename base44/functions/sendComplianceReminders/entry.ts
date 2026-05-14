import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);

        // Authenticate user (for manual triggers)
        try {
            await base44.auth.me();
        } catch (e) {
            // For scheduled/automated runs, continue without user auth
        }

        const contractors = await base44.asServiceRole.entities.Contractor.filter({ status: 'active' });
        const buildings = await base44.asServiceRole.entities.Building.list();
        const adminUsers = await base44.asServiceRole.entities.User.filter({ role: 'admin' });

        let remindersSent = 0;
        let errors = [];
        const remindersLog = [];

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        for (const contractor of contractors) {
            const remindersToSend = [];
            
            // Get default intervals or use building-specific if available
            const defaultIntervals = [90, 60, 30];
            
            // Check each document type
            const documents = [
                { type: 'license', expiry: contractor.license_expiry_date, name: 'License' },
                { type: 'insurance', expiry: contractor.insurance_expiry, name: 'General Insurance' },
                { type: 'work_cover', expiry: contractor.work_cover_expiry_date, name: 'Work Cover' },
                { type: 'public_liability', expiry: contractor.public_liability_expiry_date, name: 'Public Liability Insurance' }
            ];

            for (const doc of documents) {
                if (!doc.expiry) continue;

                const expiryDate = new Date(doc.expiry);
                const daysUntilExpiry = Math.ceil((expiryDate - today) / (1000 * 60 * 60 * 24));

                // Check if we need to send reminders at configured intervals
                for (const interval of defaultIntervals) {
                    // Check if we're within the reminder window (±2 days for flexibility)
                    if (Math.abs(daysUntilExpiry - interval) <= 2) {
                        // Check if we've already sent this specific reminder
                        const reminderKey = `${doc.type}_${interval}`;
                        const remindersData = contractor.compliance_reminders_sent || {};
                        const lastSent = remindersData[reminderKey];

                        // Only send if not sent before, or if it was sent more than 7 days ago
                        const shouldSend = !lastSent || 
                            (new Date() - new Date(lastSent)) > (7 * 24 * 60 * 60 * 1000);

                        if (shouldSend) {
                            remindersToSend.push({
                                docType: doc.type,
                                docName: doc.name,
                                interval: interval,
                                expiry: doc.expiry,
                                daysUntilExpiry: daysUntilExpiry,
                                reminderKey: reminderKey
                            });
                        }
                    }
                }
            }

            if (remindersToSend.length > 0) {
                try {
                    // Build email content for contractor
                    const contractorEmailBody = `
Dear ${contractor.contact_name},

This is an automated reminder regarding upcoming compliance document expiration(s) for ${contractor.company_name}.

The following documents are due to expire soon:

${remindersToSend.map(r => 
    `• ${r.docName}: Expires on ${r.expiry} (${r.daysUntilExpiry} days remaining)`
).join('\n')}

Please ensure you renew these documents before they expire and upload the updated documentation to our system.

To update your compliance documents:
1. Log into the contractor portal
2. Navigate to your profile
3. Upload the renewed documents

If you have any questions, please contact the building management team.

Best regards,
Property Management Team
                    `.trim();

                    // Send email to contractor
                    await base44.asServiceRole.integrations.Core.SendEmail({
                        from_name: 'Property Management - Compliance',
                        to: contractor.email,
                        subject: `Compliance Reminder: Documents Expiring Soon`,
                        body: contractorEmailBody
                    });

                    remindersSent++;
                    remindersLog.push({
                        contractor: contractor.company_name,
                        email: contractor.email,
                        reminders: remindersToSend.length
                    });

                    // Build email content for building managers
                    const managerEmailBody = `
Compliance Reminder: Contractor Documents Expiring Soon

Contractor: ${contractor.company_name}
Contact: ${contractor.contact_name}
Email: ${contractor.email}
Phone: ${contractor.phone || 'N/A'}

The following documents are due to expire soon:

${remindersToSend.map(r => 
    `• ${r.docName}: Expires on ${r.expiry} (${r.daysUntilExpiry} days remaining)`
).join('\n')}

A reminder email has been sent to the contractor. Please follow up to ensure documents are renewed before expiry.

View contractor details in the system to track compliance status.
                    `.trim();

                    // Send notifications to building managers
                    for (const admin of adminUsers) {
                        await base44.asServiceRole.integrations.Core.SendEmail({
                            from_name: 'Property Management - Compliance',
                            to: admin.email,
                            subject: `Contractor Compliance Alert: ${contractor.company_name}`,
                            body: managerEmailBody
                        });
                    }

                    // Send to additional recipients from buildings
                    const additionalRecipients = new Set();
                    for (const building of buildings) {
                        if (building.compliance_reminder_recipients) {
                            building.compliance_reminder_recipients.forEach(email => 
                                additionalRecipients.add(email)
                            );
                        }
                    }

                    for (const email of additionalRecipients) {
                        await base44.asServiceRole.integrations.Core.SendEmail({
                            from_name: 'Property Management - Compliance',
                            to: email,
                            subject: `Contractor Compliance Alert: ${contractor.company_name}`,
                            body: managerEmailBody
                        });
                    }

                    // Update contractor with reminder timestamps
                    const updatedReminders = contractor.compliance_reminders_sent || {};
                    remindersToSend.forEach(r => {
                        updatedReminders[r.reminderKey] = new Date().toISOString();
                    });

                    await base44.asServiceRole.entities.Contractor.update(contractor.id, {
                        compliance_reminders_sent: updatedReminders,
                        last_compliance_email_sent: new Date().toISOString()
                    });

                } catch (error) {
                    errors.push({
                        contractor: contractor.company_name,
                        error: error.message
                    });
                }
            }
        }

        return Response.json({
            success: true,
            remindersSent: remindersSent,
            contractorsProcessed: contractors.length,
            remindersLog: remindersLog,
            errors: errors.length > 0 ? errors : null
        });

    } catch (error) {
        console.error('Compliance reminder error:', error);
        return Response.json({
            success: false,
            error: error.message
        }, { status: 500 });
    }
});