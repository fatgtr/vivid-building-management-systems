import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const payload = await req.json();
    const { workOrderId, notificationType } = payload || {};

    if (!workOrderId) {
      return Response.json({ error: 'workOrderId is required' }, { status: 400 });
    }

    const workOrder = await base44.asServiceRole.entities.WorkOrder.get(workOrderId);
    if (!workOrder) {
      return Response.json({ error: 'Work order not found' }, { status: 404 });
    }

    const building = await base44.asServiceRole.entities.Building.get(workOrder.building_id);

    let subject, body, recipients = [];

    switch (notificationType) {
      case 'created':
        subject = `New Work Order: ${workOrder.title}`;
        body = `
          <h2>New Work Order Created</h2>
          <p>A new work order has been created and requires attention.</p>
          
          <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3>${workOrder.title}</h3>
            <p><strong>Building:</strong> ${building.name}</p>
            <p><strong>Category:</strong> ${workOrder.main_category}</p>
            <p><strong>Priority:</strong> ${workOrder.priority}</p>
            <p><strong>Status:</strong> ${workOrder.status}</p>
            ${workOrder.description ? `<p><strong>Description:</strong> ${workOrder.description}</p>` : ''}
          </div>
        `;
        if (building.manager_email) recipients.push(building.manager_email);
        break;

      case 'status_changed':
        subject = `Work Order Status Update: ${workOrder.title}`;
        body = `
          <h2>Work Order Status Updated</h2>
          <p>The status of work order "${workOrder.title}" has been updated.</p>
          
          <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3>${workOrder.title}</h3>
            <p><strong>New Status:</strong> <span style="color: #3b82f6; font-weight: bold;">${workOrder.status}</span></p>
            <p><strong>Building:</strong> ${building.name}</p>
          </div>
        `;
        if (workOrder.reported_by) recipients.push(workOrder.reported_by);
        break;

      case 'completed':
        subject = `Work Order Completed: ${workOrder.title}`;
        body = `
          <h2>Work Order Completed</h2>
          <p>The work order "${workOrder.title}" has been completed.</p>
          
          <div style="background: #f0fdf4; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #22c55e;">
            <h3>${workOrder.title}</h3>
            <p><strong>Completed Date:</strong> ${workOrder.completed_date}</p>
            <p><strong>Building:</strong> ${building.name}</p>
            ${workOrder.resolution_notes ? `<p><strong>Resolution:</strong> ${workOrder.resolution_notes}</p>` : ''}
            ${workOrder.actual_cost ? `<p><strong>Cost:</strong> $${workOrder.actual_cost}</p>` : ''}
          </div>
          
          <p>If you're satisfied with the work, please consider rating this service.</p>
        `;
        if (workOrder.reported_by) recipients.push(workOrder.reported_by);
        break;

      case 'assigned':
        subject = `Work Order Assigned: ${workOrder.title}`;
        body = `
          <h2>Work Order Assigned to You</h2>
          <p>You have been assigned to work order "${workOrder.title}".</p>
          
          <div style="background: #eff6ff; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3>${workOrder.title}</h3>
            <p><strong>Building:</strong> ${building.name}</p>
            <p><strong>Priority:</strong> ${workOrder.priority}</p>
            ${workOrder.due_date ? `<p><strong>Due Date:</strong> ${workOrder.due_date}</p>` : ''}
            ${workOrder.description ? `<p><strong>Description:</strong> ${workOrder.description}</p>` : ''}
          </div>
        `;
        if (workOrder.assigned_to) recipients.push(workOrder.assigned_to);
        break;
    }

    // Send notifications
    for (const email of recipients) {
      try {
        await base44.asServiceRole.integrations.Core.SendEmail({
          to: email,
          subject,
          body
        });
      } catch (error) {
        console.error(`Failed to send email to ${email}:`, error);
      }
    }

    return Response.json({ 
      success: true, 
      notificationsSent: recipients.length 
    });
  } catch (error) {
    console.error('Notification failed:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});