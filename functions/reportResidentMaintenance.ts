import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Authenticate user
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { title, description, category, priority, photoUrls } = await req.json();

    if (!title || !category) {
      return Response.json({ 
        success: false, 
        error: 'Missing required fields' 
      }, { status: 400 });
    }

    // Get resident profile
    const residents = await base44.asServiceRole.entities.Resident.filter({ 
      email: user.email 
    });

    if (!residents || residents.length === 0) {
      return Response.json({ 
        success: false, 
        error: 'Resident profile not found' 
      }, { status: 404 });
    }

    const resident = residents[0];

    // Determine workflow based on resident type
    const isTenant = resident.resident_type === 'tenant';
    const isOwner = resident.resident_type === 'owner';

    // Create work order with appropriate status
    let workOrderStatus = 'open';
    if (isTenant) {
      workOrderStatus = 'tenant_reported_awaiting_agent';
    } else if (isOwner) {
      workOrderStatus = 'owner_choice_pending';
    }

    const workOrderData = {
      building_id: resident.building_id,
      unit_id: resident.unit_id,
      title: title,
      description: description,
      category: category,
      priority: priority || 'medium',
      status: workOrderStatus,
      reported_by: user.email,
      reported_by_name: `${resident.first_name} ${resident.last_name}`,
      photos: photoUrls || [],
      escalation_count: 0,
    };

    const workOrder = await base44.asServiceRole.entities.WorkOrder.create(workOrderData);

    // Handle tenant workflow - notify managing agent immediately
    if (isTenant && resident.managing_agent_email) {
      const buildings = await base44.asServiceRole.entities.Building.filter({ 
        id: resident.building_id 
      });
      const building = buildings && buildings.length > 0 ? buildings[0] : null;

      const units = await base44.asServiceRole.entities.Unit.filter({ 
        id: resident.unit_id 
      });
      const unit = units && units.length > 0 ? units[0] : null;

      const emailBody = `
        <h2>New Tenant Maintenance Request</h2>
        
        <p>Dear ${resident.managing_agent_contact_name || 'Managing Agent'},</p>
        
        <p>A tenant under your management has reported a maintenance issue that requires your attention.</p>
        
        <h3>Property Details:</h3>
        <ul>
          <li><strong>Building:</strong> ${building?.name || 'N/A'}</li>
          <li><strong>Unit:</strong> ${unit?.unit_number || 'N/A'}</li>
          <li><strong>Tenant:</strong> ${resident.first_name} ${resident.last_name}</li>
        </ul>
        
        <h3>Issue Details:</h3>
        <ul>
          <li><strong>Title:</strong> ${title}</li>
          <li><strong>Category:</strong> ${category.replace(/_/g, ' ')}</li>
          <li><strong>Priority:</strong> ${priority || 'medium'}</li>
          <li><strong>Description:</strong> ${description}</li>
        </ul>
        
        <p><strong>Action Required:</strong> As the managing agent, you are responsible for arranging repairs for issues within the tenant's unit. Please coordinate with a qualified contractor to address this issue promptly.</p>
        
        <p>This maintenance request has been logged in the building management system for tracking purposes.</p>
        
        <p>If you have any questions, please contact the building management team.</p>
        
        <p>Best regards,<br/>Building Management</p>
      `;

      await base44.integrations.Core.SendEmail({
        from_name: building?.name || 'Building Management',
        to: resident.managing_agent_email,
        subject: `Tenant Maintenance Request - ${building?.name || 'Property'} Unit ${unit?.unit_number || 'N/A'}`,
        body: emailBody
      });

      // Update work order with email sent info
      await base44.asServiceRole.entities.WorkOrder.update(workOrder.id, {
        email_sent_date: new Date().toISOString(),
        email_recipient: resident.managing_agent_email,
      });
    }

    return Response.json({ 
      success: true,
      workOrderId: workOrder.id,
      requiresOwnerChoice: isOwner,
      residentType: resident.resident_type,
    });

  } catch (error) {
    console.error('Resident maintenance report error:', error);
    return Response.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
});