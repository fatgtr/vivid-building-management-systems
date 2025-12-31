import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { token } = await req.json();

    if (!token) {
      return Response.json({ error: 'Token required' }, { status: 400 });
    }

    // Find application by token
    const applications = await base44.asServiceRole.entities.ContractorApplication.filter({ 
      verification_token: token,
      status: 'pending_verification'
    });

    if (applications.length === 0) {
      return Response.json({ 
        error: 'Invalid or expired verification token' 
      }, { status: 404 });
    }

    const application = applications[0];

    // Check if token is expired (48 hours)
    const createdDate = new Date(application.created_date);
    const now = new Date();
    const hoursDiff = (now - createdDate) / (1000 * 60 * 60);

    if (hoursDiff > 48) {
      return Response.json({ 
        error: 'Verification token has expired' 
      }, { status: 400 });
    }

    // Update application status
    await base44.asServiceRole.entities.ContractorApplication.update(application.id, {
      status: 'pending_review',
      verified_at: new Date().toISOString(),
      verification_token: null // Clear token after use
    });

    // Notify admins about new application
    const allUsers = await base44.asServiceRole.entities.User.list();
    const admins = allUsers.filter(u => u.role === 'admin');

    for (const admin of admins) {
      try {
        await base44.asServiceRole.integrations.Core.SendEmail({
          to: admin.email,
          subject: 'New Contractor Application for Review',
          body: `
<h2>New Contractor Application</h2>

<p>A new contractor has completed their application and is ready for review.</p>

<p><strong>Contractor Details:</strong></p>
<ul>
  <li>Company: ${application.company_name}</li>
  <li>Contact: ${application.contact_name}</li>
  <li>Email: ${application.email}</li>
  <li>Phone: ${application.phone}</li>
  <li>Specialties: ${application.specialty?.join(', ') || 'Not specified'}</li>
</ul>

<p>Please log in to review and approve this application.</p>
          `
        });

        await base44.asServiceRole.entities.Notification.create({
          user_email: admin.email,
          type: 'application',
          title: 'New Contractor Application',
          message: `${application.company_name} is awaiting review`,
          link: '/contractors',
          read: false
        });
      } catch (notifError) {
        console.error('Failed to notify admin:', notifError);
      }
    }

    return Response.json({ 
      success: true,
      message: 'Email verified! Your application is now being reviewed.' 
    });

  } catch (error) {
    console.error('Error verifying contractor application:', error);
    return Response.json({ 
      error: error.message 
    }, { status: 500 });
  }
});