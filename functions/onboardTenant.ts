import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        // Verify authentication
        const user = await base44.auth.me();
        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { residentId, residentEmail, residentName, buildingId, unitNumber, leaseStartDate } = await req.json();

        if (!residentEmail || !residentName) {
            return Response.json({ 
                success: false, 
                error: 'Missing required fields: residentEmail and residentName' 
            }, { status: 400 });
        }

        // Get building details
        const buildings = await base44.asServiceRole.entities.Building.list();
        const building = buildings.find(b => b.id === buildingId);
        const buildingName = building?.name || 'Your Building';

        // Fetch important building documents (Bylaws, Strata Management Statement)
        const documents = buildingId ? await base44.asServiceRole.entities.Document.list() : [];
        const buildingDocs = documents.filter(doc => doc.building_id === buildingId);
        
        const bylawsDoc = buildingDocs.find(doc => 
            doc.category === 'bylaws' || 
            doc.title?.toLowerCase().includes('bylaw') ||
            doc.title?.toLowerCase().includes('by-law')
        );
        
        const strataDoc = buildingDocs.find(doc => 
            doc.category === 'strata_management_statement' ||
            doc.title?.toLowerCase().includes('strata management')
        );

        // Get move-in checklist if exists
        const checklists = residentId ? await base44.asServiceRole.entities.MoveChecklist.list() : [];
        const moveInChecklist = checklists.find(c => 
            c.resident_id === residentId && 
            c.move_type === 'move_in'
        );

        // Check if user already exists
        const existingUsers = await base44.asServiceRole.entities.User.list();
        const existingUser = existingUsers.find(u => u.email === residentEmail);

        let userCreated = false;
        if (!existingUser) {
            // Create user account (this will send an invitation email)
            try {
                await base44.asServiceRole.entities.User.create({
                    email: residentEmail,
                    full_name: residentName,
                    role: 'user'
                });
                userCreated = true;
            } catch (error) {
                console.error('Failed to create user:', error);
                // Continue with welcome email even if user creation fails
            }
        }

        // Send welcome email with portal access instructions
        const welcomeEmailSubject = `Welcome to ${buildingName} - Resident Portal Access`;
        
        const welcomeEmailBody = `
            <h2>Welcome to ${buildingName}!</h2>
            
            <p>Dear ${residentName},</p>
            
            <p>Welcome to your new home! We're excited to have you as a resident.</p>
            
            <h3>🏠 Your Resident Portal Access</h3>
            <p>We've set up your resident portal account where you can:</p>
            <ul>
                <li>Submit maintenance requests</li>
                <li>View building announcements</li>
                <li>Book amenities</li>
                <li>Access important documents and bylaws</li>
                <li>Communicate with building management</li>
            </ul>
            
            ${userCreated ? `
                <p><strong>Your account has been created!</strong> You will receive a separate email with instructions to set your password and access the portal.</p>
            ` : `
                <p>You can access the portal using your registered email address: <strong>${residentEmail}</strong></p>
            `}
            
            ${unitNumber ? `<p><strong>Your Unit:</strong> ${unitNumber}</p>` : ''}
            ${leaseStartDate ? `<p><strong>Move-in Date:</strong> ${new Date(leaseStartDate).toLocaleDateString()}</p>` : ''}
            
            <h3>📄 Essential Documents</h3>
            <p>Please review the following important documents:</p>
            <ul>
                ${bylawsDoc ? `
                    <li><strong>Building Bylaws:</strong> <a href="${bylawsDoc.file_url}" target="_blank">${bylawsDoc.title}</a></li>
                ` : ''}
                ${strataDoc ? `
                    <li><strong>Strata Management Statement:</strong> <a href="${strataDoc.file_url}" target="_blank">${strataDoc.title}</a></li>
                ` : ''}
                ${!bylawsDoc && !strataDoc ? `
                    <li>Building documents are available in your resident portal</li>
                ` : ''}
            </ul>
            
            <h3>📦 Move-In Instructions</h3>
            ${moveInChecklist ? `
                <p><strong>Your move-in checklist has been created!</strong> You can view and complete it in your resident portal.</p>
                <p>Key tasks include:</p>
                <ul>
                    <li>Complete your profile information</li>
                    <li>Register vehicle and parking details</li>
                    <li>Book lift/elevator for move-in day</li>
                    <li>Review building rules and regulations</li>
                    <li>Set up utilities and services</li>
                </ul>
            ` : `
                <p><strong>Important Move-In Tips:</strong></p>
                <ul>
                    <li>Coordinate your move-in with building management to book the lift/elevator</li>
                    <li>Ensure you have keys and access cards before your move-in date</li>
                    <li>Note building quiet hours and common area rules</li>
                    <li>Register your vehicle for parking access</li>
                    <li>Familiarize yourself with emergency exits and procedures</li>
                    <li>Set up utilities (electricity, gas, internet) in advance</li>
                </ul>
            `}
            
            <h3>📋 Important Next Steps</h3>
            <ol>
                <li>Review the building bylaws and strata management statement</li>
                <li>Complete your resident profile in the portal</li>
                <li>Set up parking and amenity access as needed</li>
                <li>Save emergency contact numbers</li>
                <li>Complete your move-in checklist (if applicable)</li>
            </ol>
            
            <h3>📞 Need Help?</h3>
            <p>If you have any questions or need assistance, please contact building management through the resident portal or reach out directly.</p>
            
            <p>Welcome home!</p>
            
            <p>Best regards,<br>
            ${buildingName} Management</p>
        `;

        await base44.integrations.Core.SendEmail({
            to: residentEmail,
            subject: welcomeEmailSubject,
            body: welcomeEmailBody
        });

        // Create a notification in the system
        await base44.asServiceRole.entities.Notification.create({
            recipient_email: residentEmail,
            title: 'Welcome to Your New Home!',
            message: `Your resident portal account is ready. Check your email for access instructions.`,
            type: 'system',
            priority: 'medium',
            link_url: '/ResidentPortal',
            link_text: 'Access Portal'
        });

        // Update resident record with onboarding completion
        if (residentId) {
            const residents = await base44.asServiceRole.entities.Resident.list();
            const resident = residents.find(r => r.id === residentId);
            
            if (resident) {
                await base44.asServiceRole.entities.Resident.update(residentId, {
                    ...resident,
                    notes: (resident.notes || '') + `\n[${new Date().toLocaleDateString()}] Tenant onboarded - Portal access granted and welcome email sent.`
                });
            }
        }

        return Response.json({
            success: true,
            userCreated,
            message: userCreated 
                ? 'User account created and welcome email sent' 
                : 'Welcome email sent to existing user'
        });

    } catch (error) {
        console.error('Onboarding error:', error);
        return Response.json({
            success: false,
            error: error.message || 'Failed to onboard tenant'
        }, { status: 500 });
    }
});