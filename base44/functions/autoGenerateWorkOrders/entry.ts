import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Get all active maintenance schedules
    const schedules = await base44.asServiceRole.entities.MaintenanceSchedule.filter({
      status: 'active'
    });

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let workOrdersCreated = 0;
    let tasksCreated = 0;

    for (const schedule of schedules) {
      if (!schedule.next_due_date) continue;

      const dueDate = new Date(schedule.next_due_date);
      dueDate.setHours(0, 0, 0, 0);

      // Check if maintenance is due today or overdue
      if (dueDate <= today) {
        // Create work order
        const workOrderData = {
          building_id: schedule.building_id,
          asset_id: schedule.asset_id,
          title: schedule.subject,
          description: schedule.description,
          main_category: schedule.category || 'other',
          priority: 'medium',
          status: 'open',
          estimated_cost: schedule.estimated_cost || 0,
          notes: `Auto-generated from maintenance schedule. Frequency: ${schedule.recurrence}`,
          auto_generated: true,
          source_type: 'scheduled_maintenance'
        };

        const workOrder = await base44.asServiceRole.entities.WorkOrder.create(workOrderData);
        workOrdersCreated++;

        // Update schedule with work order ID
        const workOrderIds = schedule.work_order_ids || [];
        workOrderIds.push(workOrder.id);

        // Calculate next due date
        let nextDueDate = new Date(dueDate);
        
        switch (schedule.recurrence) {
          case 'daily':
            nextDueDate.setDate(nextDueDate.getDate() + 1);
            break;
          case 'weekly':
            nextDueDate.setDate(nextDueDate.getDate() + 7);
            break;
          case 'monthly':
            nextDueDate.setMonth(nextDueDate.getMonth() + 1);
            break;
          case 'quarterly':
            nextDueDate.setMonth(nextDueDate.getMonth() + 3);
            break;
          case 'half_yearly':
            nextDueDate.setMonth(nextDueDate.getMonth() + 6);
            break;
          case 'yearly':
            nextDueDate.setFullYear(nextDueDate.getFullYear() + 1);
            break;
          case 'bi_yearly':
            nextDueDate.setFullYear(nextDueDate.getFullYear() + 2);
            break;
          default:
            nextDueDate = null;
        }

        await base44.asServiceRole.entities.MaintenanceSchedule.update(schedule.id, {
          work_order_ids: workOrderIds,
          next_due_date: nextDueDate ? nextDueDate.toISOString().split('T')[0] : null
        });
      }
    }

    return Response.json({
      success: true,
      work_orders_created: workOrdersCreated,
      tasks_created: tasksCreated,
      schedules_processed: schedules.length
    });

  } catch (error) {
    console.error('Auto-generate work orders error:', error);
    return Response.json({ 
      error: error.message 
    }, { status: 500 });
  }
});