import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { workOrderId, contractorId, action } = await req.json();

    if (!workOrderId) {
      return Response.json({ error: 'Work order ID is required' }, { status: 400 });
    }

    // Get work order details
    const workOrders = await base44.asServiceRole.entities.WorkOrder.filter({ id: workOrderId });
    const workOrder = workOrders[0];

    if (!workOrder) {
      return Response.json({ error: 'Work order not found' }, { status: 404 });
    }

    // Get building details
    const buildings = await base44.asServiceRole.entities.Building.filter({ id: workOrder.building_id });
    const building = buildings[0];

    let emailSubject = '';
    let emailBody = '';
    let recipientEmail = '';

    if (action === 'assigned' && contractorId) {
      // Get contractor details
      const contractors = await base44.asServiceRole.entities.Contractor.filter({ id: contractorId });
      const contractor = contractors[0];

      if (contractor && contractor.email) {
        recipientEmail = contractor.email;
        emailSubject = `New Work Order Assignment: ${workOrder.title}`;
        emailBody = `
          <h2>New Work Order Assigned</h2>
          <p>Hello ${contractor.contact_name},</p>
          <p>You have been assigned a new work order:</p>
          
          <div style="background: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <h3>${workOrder.title}</h3>
            <p><strong>Building:</strong> ${building?.name || 'N/A'}</p>
            <p><strong>Category:</strong> ${workOrder.category}</p>
            <p><strong>Priority:</strong> ${workOrder.priority}</p>
            <p><strong>Description:</strong> ${workOrder.description || 'N/A'}</p>
            ${workOrder.due_date ? `<p><strong>Due Date:</strong> ${workOrder.due_date}</p>` : ''}
          </div>
          
          <p>Please log in to the system to view full details and update the status as you progress.</p>
          <p>Thank you,<br>PropManage Team</p>
        `;
      }
    } else if (action === 'status_changed') {
      // Notify building manager about status change
      if (building?.manager_email) {
        recipientEmail = building.manager_email;
        emailSubject = `Work Order Status Update: ${workOrder.title}`;
        emailBody = `
          <h2>Work Order Status Updated</h2>
          <p>Hello ${building.manager_name || 'Manager'},</p>
          <p>A work order has been updated:</p>
          
          <div style="background: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <h3>${workOrder.title}</h3>
            <p><strong>Building:</strong> ${building.name}</p>
            <p><strong>New Status:</strong> ${workOrder.status}</p>
            <p><strong>Category:</strong> ${workOrder.category}</p>
            <p><strong>Priority:</strong> ${workOrder.priority}</p>
          </div>
          
          <p>Log in to view full details and any updates from the contractor.</p>
          <p>PropManage System</p>
        `;
      }
    }

    // Send email if recipient is set
    if (recipientEmail) {
      await base44.asServiceRole.integrations.Core.SendEmail({
        from_name: 'PropManage',
        to: recipientEmail,
        subject: emailSubject,
        body: emailBody
      });
    }

    return Response.json({ success: true });
  } catch (error) {
    console.error('Notification error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});