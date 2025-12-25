import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Verify authenticated user
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { contractorId, email, companyName, contactName } = await req.json();

    if (!contractorId || !email || !companyName || !contactName) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Get the app origin for the portal link
    const origin = req.headers.get('origin') || 'https://app.base44.com';
    const portalLink = `${origin}/ContractorPortal`;

    // Send email invite
    await base44.integrations.Core.SendEmail({
      to: email,
      subject: `Invitation to Vivid BMS Contractor Portal - ${companyName}`,
      body: `
        <html>
        <body style="font-family: sans-serif; line-height: 1.6; color: #333;">
          <div style="max-width: 600px; margin: 20px auto; padding: 30px; border: 1px solid #e2e8f0; border-radius: 12px; background: #ffffff;">
            <div style="text-align: center; margin-bottom: 30px;">
              <h1 style="color: #1e293b; margin-bottom: 10px;">Welcome to Vivid BMS</h1>
              <p style="color: #64748b; font-size: 14px;">Building Management System - Contractor Portal</p>
            </div>
            
            <h2 style="color: #1e293b; font-size: 18px;">Hello ${contactName},</h2>
            
            <p style="margin: 16px 0;">You have been invited to join the Vivid BMS Contractor Portal for <strong>${companyName}</strong>.</p>
            
            <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <p style="margin: 0 0 12px 0; font-weight: 600; color: #1e293b;">Through the portal, you can:</p>
              <ul style="margin: 0; padding-left: 20px;">
                <li style="margin: 8px 0;">View and manage assigned work orders</li>
                <li style="margin: 8px 0;">Update work order status and add notes</li>
                <li style="margin: 8px 0;">Upload documents and compliance certificates</li>
                <li style="margin: 8px 0;">Track your service history</li>
              </ul>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${portalLink}" style="display: inline-block; padding: 14px 32px; background: linear-gradient(to right, #3b82f6, #6366f1); color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600; box-shadow: 0 4px 6px rgba(59, 130, 246, 0.3);">
                Access Contractor Portal
              </a>
            </div>
            
            <p style="font-size: 14px; color: #64748b; margin-top: 30px;">If you have any questions, please contact your building manager.</p>
            
            <div style="border-top: 1px solid #e2e8f0; margin-top: 30px; padding-top: 20px; text-align: center;">
              <p style="font-size: 12px; color: #94a3b8; margin: 0;">© Vivid BMS - Building Management System</p>
            </div>
          </div>
        </body>
        </html>
      `,
    });

    return Response.json({ 
      success: true, 
      message: 'Portal invite sent successfully to ' + email 
    });

  } catch (error) {
    console.error('Error sending contractor invite:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});