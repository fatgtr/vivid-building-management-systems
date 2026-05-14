import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const schedules = await base44.asServiceRole.entities.MaintenanceSchedule.filter({ status: 'active' });
    const contractors = await base44.asServiceRole.entities.Contractor.list();
    const buildings = await base44.asServiceRole.entities.Building.list();

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const generatedTasks = [];

    for (const schedule of schedules) {
      const building = buildings.find(b => b.id === schedule.building_id);
      if (!building) continue;

      const nextDueDate = new Date(schedule.next_due_date || schedule.scheduled_date);
      nextDueDate.setHours(0, 0, 0, 0);

      // Check if task should be generated
      if (nextDueDate <= today) {
        // Check if recurrence has ended
        if (schedule.recurrence_end_date) {
          const endDate = new Date(schedule.recurrence_end_date);
          if (nextDueDate > endDate) {
            await base44.asServiceRole.entities.MaintenanceSchedule.update(schedule.id, {
              status: 'completed'
            });
            continue;
          }
        }

        // Find contractor
        let assignedContractor = null;
        if (schedule.assigned_contractor_id) {
          assignedContractor = contractors.find(c => c.id === schedule.assigned_contractor_id);
        } else if (schedule.assigned_contractor_type) {
          const compliantContractors = contractors.filter(c => 
            c.specialty?.includes(schedule.assigned_contractor_type) &&
            c.status === 'active' &&
            (c.compliance_score || 0) >= 70
          );
          assignedContractor = compliantContractors[0];
        }

        if (!assignedContractor) {
          await base44.asServiceRole.entities.MaintenanceSchedule.update(schedule.id, {
            status: 'pending_assignment'
          });
          continue;
        }

        // Create task
        const newTask = await base44.asServiceRole.entities.Task.create({
          title: schedule.subject,
          description: schedule.description,
          building_id: schedule.building_id,
          maintenance_schedule_id: schedule.id,
          asset_id: schedule.asset_id,
          assigned_to_contractor_id: assignedContractor.id,
          assigned_to_name: assignedContractor.company_name,
          due_date: nextDueDate.toISOString().split('T')[0],
          status: 'pending',
          priority: 'medium',
          tags: ['scheduled_maintenance', schedule.recurrence || 'one-time']
        });
        generatedTasks.push(newTask);

        // Calculate next due date
        let newNextDueDate = new Date(nextDueDate);
        switch (schedule.recurrence) {
          case 'daily': newNextDueDate.setDate(newNextDueDate.getDate() + 1); break;
          case 'weekly': newNextDueDate.setDate(newNextDueDate.getDate() + 7); break;
          case 'monthly': newNextDueDate.setMonth(newNextDueDate.getMonth() + 1); break;
          case 'quarterly': newNextDueDate.setMonth(newNextDueDate.getMonth() + 3); break;
          case 'half_yearly': newNextDueDate.setMonth(newNextDueDate.getMonth() + 6); break;
          case 'yearly': newNextDueDate.setFullYear(newNextDueDate.getFullYear() + 1); break;
          case 'none':
            await base44.asServiceRole.entities.MaintenanceSchedule.update(schedule.id, {
              status: 'completed',
              task_ids: [...(schedule.task_ids || []), newTask.id]
            });
            continue;
        }

        await base44.asServiceRole.entities.MaintenanceSchedule.update(schedule.id, {
          next_due_date: newNextDueDate.toISOString().split('T')[0],
          task_ids: [...(schedule.task_ids || []), newTask.id]
        });

        // Send notification
        if (assignedContractor.email) {
          try {
            await base44.asServiceRole.integrations.Core.SendEmail({
              to: assignedContractor.email,
              subject: `New Scheduled Maintenance: ${newTask.title}`,
              body: `
                <h3>New Scheduled Maintenance Task</h3>
                <p>Dear ${assignedContractor.contact_name || assignedContractor.company_name},</p>
                <p>A new maintenance task has been assigned:</p>
                <ul>
                  <li><strong>Task:</strong> ${newTask.title}</li>
                  <li><strong>Building:</strong> ${building.name}</li>
                  <li><strong>Address:</strong> ${building.address}</li>
                  <li><strong>Due Date:</strong> ${newTask.due_date}</li>
                </ul>
                <p>Please log in to view details and update status.</p>
              `
            });
            await base44.asServiceRole.entities.Task.update(newTask.id, { notification_sent: true });
          } catch (error) {
            console.error('Failed to send email:', error);
          }
        }
      }
    }

    return Response.json({
      success: true,
      generated_tasks_count: generatedTasks.length,
      task_ids: generatedTasks.map(t => t.id)
    });

  } catch (error) {
    console.error('Error generating scheduled maintenance tasks:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});