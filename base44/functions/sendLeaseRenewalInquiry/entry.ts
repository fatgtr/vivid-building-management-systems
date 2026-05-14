import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Authenticate user
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { residentEmail, leaseEndDate, message } = await req.json();

    if (!residentEmail || !message) {
      return Response.json({ 
        success: false, 
        error: 'Missing required fields' 
      }, { status: 400 });
    }

    // Get resident info
    const residents = await base44.asServiceRole.entities.Resident.filter({ 
      email: residentEmail 
    });

    if (!residents || residents.length === 0) {
      return Response.json({ 
        success: false, 
        error: 'Resident not found' 
      }, { status: 404 });
    }

    const resident = residents[0];

    // Get building info
    const buildings = await base44.asServiceRole.entities.Building.filter({ 
      id: resident.building_id 
    });
    const building = buildings && buildings.length > 0 ? buildings[0] : null;

    // Get unit info
    const units = await base44.asServiceRole.entities.Unit.filter({ 
      id: resident.unit_id 
    });
    const unit = units && units.length > 0 ? units[0] : null;

    // Send email to building manager
    const buildingManagerEmail = building?.manager_email;

    if (!buildingManagerEmail) {
      return Response.json({ 
        success: false, 
        error: 'Building manager email not configured' 
      }, { status: 400 });
    }

    const emailBody = `
      <h2>Lease Inquiry from Resident</h2>
      
      <p>Dear Building Manager,</p>
      
      <p>A resident has sent an inquiry regarding their lease agreement.</p>
      
      <h3>Resident Information:</h3>
      <ul>
        <li><strong>Name:</strong> ${resident.first_name} ${resident.last_name}</li>
        <li><strong>Email:</strong> ${resident.email}</li>
        <li><strong>Phone:</strong> ${resident.phone || 'N/A'}</li>
        <li><strong>Building:</strong> ${building?.name || 'N/A'}</li>
        <li><strong>Unit:</strong> ${unit?.unit_number || 'N/A'}</li>
        ${leaseEndDate ? `<li><strong>Current Lease Ends:</strong> ${new Date(leaseEndDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</li>` : ''}
      </ul>
      
      <h3>Resident's Message:</h3>
      <div style="background: #f8f9fa; padding: 16px; border-radius: 8px; margin: 16px 0;">
        <p style="white-space: pre-wrap;">${message}</p>
      </div>
      
      <p>Please respond to the resident at ${resident.email} or ${resident.phone || 'their phone number'} at your earliest convenience.</p>
      
      <p>Best regards,<br/>Building Management System</p>
    `;

    await base44.integrations.Core.SendEmail({
      from_name: building?.name || 'Building Management',
      to: buildingManagerEmail,
      subject: `Lease Inquiry - ${resident.first_name} ${resident.last_name} - ${building?.name || 'Property'} Unit ${unit?.unit_number || 'N/A'}`,
      body: emailBody
    });

    // Send confirmation to resident
    const confirmationEmail = `
      <h2>Your Message Has Been Sent</h2>
      
      <p>Dear ${resident.first_name},</p>
      
      <p>Thank you for contacting us. Your message has been forwarded to the building management team.</p>
      
      <h3>Your Message:</h3>
      <div style="background: #f8f9fa; padding: 16px; border-radius: 8px; margin: 16px 0;">
        <p style="white-space: pre-wrap;">${message}</p>
      </div>
      
      <p>The management team will review your inquiry and respond within 2-3 business days.</p>
      
      <p>If you have an urgent matter, please contact building management directly.</p>
      
      <p>Best regards,<br/>Building Management</p>
    `;

    await base44.integrations.Core.SendEmail({
      from_name: building?.name || 'Building Management',
      to: resident.email,
      subject: `Message Received - ${building?.name || 'Property'}`,
      body: confirmationEmail
    });

    return Response.json({ 
      success: true,
      message: 'Inquiry sent successfully'
    });

  } catch (error) {
    console.error('Lease renewal inquiry error:', error);
    return Response.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
});