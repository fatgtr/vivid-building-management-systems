import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { residentEmail, residentName, buildingName, unitNumber } = await req.json();

    if (!residentEmail || !residentName) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Send welcome email
    await base44.asServiceRole.integrations.Core.SendEmail({
      to: residentEmail,
      subject: `Welcome to ${buildingName || 'Your Building'}!`,
      body: `
Dear ${residentName},

Welcome to ${buildingName}! We're delighted to have you as a resident${unitNumber ? ` in Unit ${unitNumber}` : ''}.

Here are some important details to help you settle in:

🏢 Building Portal Access
You can access your resident portal at any time to:
- View building announcements and updates
- Book amenities and common areas
- Report maintenance issues
- Access building documents and bylaws
- Connect with your building management team

📋 Important Information
- Please familiarize yourself with the building bylaws and regulations
- Amenity bookings can be made through the portal
- For urgent maintenance issues, please contact building management immediately
- Keep your contact information up to date in the portal

🤝 Building Services
Our AI assistant is available 24/7 to answer questions about amenities, building services, and general inquiries.

If you have any questions or need assistance, please don't hesitate to reach out to our building management team.

Welcome home!

Best regards,
${buildingName || 'Building'} Management Team
      `.trim()
    });

    // Create a notification in the system
    await base44.asServiceRole.entities.Notification.create({
      recipient_email: residentEmail,
      title: `Welcome to ${buildingName}!`,
      message: `Your account has been set up. Explore the resident portal to book amenities, view announcements, and more.`,
      type: 'system',
      priority: 'medium',
      building_id: null,
    });

    return Response.json({ 
      success: true, 
      message: 'Welcome email sent successfully' 
    });
  } catch (error) {
    console.error('Error sending welcome email:', error);
    return Response.json({ 
      error: error.message 
    }, { status: 500 });
  }
});