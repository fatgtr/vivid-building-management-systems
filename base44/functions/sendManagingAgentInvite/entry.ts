import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Authenticate user
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { residentId } = await req.json();

    if (!residentId) {
      return Response.json({ 
        success: false, 
        error: 'Missing resident ID' 
      }, { status: 400 });
    }

    // Get resident details
    const residents = await base44.asServiceRole.entities.Resident.filter({ id: residentId });
    if (!residents || residents.length === 0) {
      return Response.json({ 
        success: false, 
        error: 'Resident not found' 
      }, { status: 404 });
    }

    const resident = residents[0];

    if (!resident.managing_agent_email) {
      return Response.json({ 
        success: false, 
        error: 'No managing agent email set for this resident' 
      }, { status: 400 });
    }

    // Get building and unit details
    const buildings = await base44.asServiceRole.entities.Building.filter({ id: resident.building_id });
    const building = buildings && buildings.length > 0 ? buildings[0] : null;

    const units = await base44.asServiceRole.entities.Unit.filter({ id: resident.unit_id });
    const unit = units && units.length > 0 ? units[0] : null;

    // Ensure user account exists for the managing agent
    const existingUsers = await base44.asServiceRole.entities.User.filter({ 
      email: resident.managing_agent_email 
    });

    // Send invitation email
    const portalUrl = `${req.headers.get('origin') || 'https://app.base44.com'}/ManagingAgentPortal`;
    
    const emailBody = `
      <h2>Managing Agent Portal Invitation</h2>
      
      <p>Dear ${resident.managing_agent_company || 'Managing Agent'},</p>
      
      <p>You have been assigned as the managing agent for a property in our building management system.</p>
      
      <h3>Property Details:</h3>
      <ul>
        <li><strong>Building:</strong> ${building?.name || 'N/A'}</li>
        <li><strong>Unit:</strong> ${unit?.unit_number || 'N/A'}</li>
        <li><strong>Tenant:</strong> ${resident.first_name} ${resident.last_name}</li>
      </ul>
      
      <h3>Portal Access:</h3>
      <p>You can access the Managing Agent Portal to:</p>
      <ul>
        <li>View and manage your tenants</li>
        <li>Upload tenancy agreements (AI will auto-process them)</li>
        <li>Access tenant information and lease details</li>
        <li>System automatically books move-in/out lifts</li>
        <li>Sends welcome emails and bylaws to tenants</li>
      </ul>
      
      <p><a href="${portalUrl}" style="display: inline-block; background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 16px 0;">Access Managing Agent Portal</a></p>
      
      ${existingUsers && existingUsers.length > 0 ? 
        `<p>You can log in using your existing account credentials.</p>` :
        `<p>When you click the link above, you'll be able to set up your account using passwordless authentication.</p>`
      }
      
      <p>Once logged in, you'll only see properties and tenants where you are listed as the managing agent.</p>
      
      <p>If you have any questions, please contact the building manager.</p>
      
      <p>Best regards,<br/>Building Management</p>
    `;

    await base44.integrations.Core.SendEmail({
      from_name: building?.name || 'Building Management',
      to: resident.managing_agent_email,
      subject: `Managing Agent Portal Access - ${building?.name || 'Property'}`,
      body: emailBody
    });

    return Response.json({ 
      success: true,
      message: 'Invitation sent successfully'
    });

  } catch (error) {
    console.error('Managing agent invite error:', error);
    return Response.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
});