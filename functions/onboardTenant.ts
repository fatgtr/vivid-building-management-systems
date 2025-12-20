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
            
            <h3>📋 Important Next Steps</h3>
            <ol>
                <li>Review the building bylaws in the resident portal</li>
                <li>Complete your resident profile</li>
                <li>Set up any parking or amenity access you may need</li>
                <li>Save emergency contact numbers</li>
            </ol>
            
            <p>If you have any questions or need assistance, please don't hesitate to reach out to building management through the portal.</p>
            
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