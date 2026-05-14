import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { workOrderId, previousStatus, newStatus } = await req.json();

    if (!workOrderId || !newStatus) {
      return Response.json({ error: 'workOrderId and newStatus are required' }, { status: 400 });
    }

    // Get work order details
    const workOrders = await base44.asServiceRole.entities.WorkOrder.filter({ id: workOrderId });
    const workOrder = workOrders[0];

    if (!workOrder || !workOrder.reported_by) {
      return Response.json({ error: 'Work order not found or no reporter' }, { status: 404 });
    }

    // Get notification preferences
    const preferences = await base44.asServiceRole.entities.NotificationPreference.filter({ 
      resident_email: workOrder.reported_by 
    });
    const prefs = preferences[0] || {
      email_work_order_updates: true,
      in_app_work_order_updates: true
    };

    const statusMessages = {
      in_progress: 'is now being worked on',
      on_hold: 'has been put on hold',
      completed: 'has been completed',
      cancelled: 'has been cancelled'
    };

    const message = `Your maintenance request "${workOrder.title}" ${statusMessages[newStatus] || `status changed to ${newStatus}`}`;

    // Create in-app notification
    if (prefs.in_app_work_order_updates) {
      await base44.asServiceRole.entities.Notification.create({
        recipient_email: workOrder.reported_by,
        title: 'Work Order Update',
        message: message,
        type: 'work_order_update',
        related_id: workOrder.id
      });
    }

    // Send email notification
    if (prefs.email_work_order_updates) {
      const building = await base44.asServiceRole.entities.Building.filter({ id: workOrder.building_id });
      const unit = await base44.asServiceRole.entities.Unit.filter({ id: workOrder.unit_id });
      
      const buildingName = building[0]?.name || 'Your Building';
      const unitNumber = unit[0]?.unit_number || 'N/A';

      await base44.asServiceRole.integrations.Core.SendEmail({
        to: workOrder.reported_by,
        subject: `Work Order Update: ${workOrder.title}`,
        body: `
          <h2>Work Order Status Update</h2>
          <p><strong>Status:</strong> ${newStatus.replace(/_/g, ' ').toUpperCase()}</p>
          <hr>
          <p><strong>Request:</strong> ${workOrder.title}</p>
          <p><strong>Building:</strong> ${buildingName}</p>
          <p><strong>Unit:</strong> ${unitNumber}</p>
          <p><strong>Category:</strong> ${workOrder.category}</p>
          <p><strong>Priority:</strong> ${workOrder.priority}</p>
          ${workOrder.description ? `<p><strong>Description:</strong> ${workOrder.description}</p>` : ''}
          ${workOrder.resolution_notes && newStatus === 'completed' ? `
            <div style="margin-top: 20px; padding: 15px; background: #f0fdf4; border-left: 4px solid #22c55e;">
              <strong>Resolution Notes:</strong>
              <p>${workOrder.resolution_notes}</p>
            </div>
          ` : ''}
          <p style="margin-top: 20px; color: #666;">
            Log in to the Resident Portal to view more details.
          </p>
        `
      });
    }

    return Response.json({ 
      success: true,
      notified: workOrder.reported_by
    });

  } catch (error) {
    console.error('Error sending work order notification:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});