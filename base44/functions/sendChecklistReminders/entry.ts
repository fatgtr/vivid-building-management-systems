import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Get all pending and in-progress checklists
    const checklists = await base44.asServiceRole.entities.MoveChecklist.filter({
      status: { $in: ['pending', 'in_progress'] }
    });

    const now = new Date();
    const remindersSent = [];

    for (const checklist of checklists) {
      const checklistDate = new Date(checklist.checklist_date);
      const daysUntil = Math.ceil((checklistDate - now) / (1000 * 60 * 60 * 24));

      // Send reminders 7 days before and 1 day before
      if (daysUntil === 7 || daysUntil === 1) {
        const incompleteTasks = checklist.tasks?.filter(t => !t.is_completed) || [];

        if (incompleteTasks.length === 0) continue;

        // Get resident details
        const residents = await base44.asServiceRole.entities.Resident.filter({ 
          id: checklist.resident_id 
        });
        const resident = residents[0];

        if (!resident) continue;

        // Group tasks by assignee
        const tasksByAssignee = incompleteTasks.reduce((acc, task) => {
          if (!acc[task.assigned_to]) acc[task.assigned_to] = [];
          acc[task.assigned_to].push(task);
          return acc;
        }, {});

        // Send reminders to tenant
        if (tasksByAssignee.tenant && resident.email) {
          const taskList = tasksByAssignee.tenant.map(t => `- ${t.task_name}`).join('\n');
          
          try {
            await base44.asServiceRole.integrations.Core.SendEmail({
              to: resident.email,
              subject: `Reminder: ${checklist.move_type === 'move_in' ? 'Move-In' : 'Move-Out'} Tasks - ${daysUntil} Day${daysUntil > 1 ? 's' : ''} Away`,
              body: `
                <h2>Move ${checklist.move_type === 'move_in' ? 'In' : 'Out'} Reminder</h2>
                <p>Your ${checklist.move_type === 'move_in' ? 'move-in' : 'move-out'} date is ${daysUntil} day${daysUntil > 1 ? 's' : ''} away (${checklistDate.toLocaleDateString()}).</p>
                <p>You still have the following tasks to complete:</p>
                <pre>${taskList}</pre>
                <p>Please log in to your portal to complete these tasks.</p>
              `
            });
            remindersSent.push({ to: resident.email, type: 'tenant' });
          } catch (error) {
            console.error('Error sending reminder to tenant:', error);
          }
        }

        // Send reminders to managing agent
        if (tasksByAssignee.managing_agent && resident.managing_agent_email) {
          const taskList = tasksByAssignee.managing_agent.map(t => `- ${t.task_name}`).join('\n');
          
          try {
            await base44.asServiceRole.integrations.Core.SendEmail({
              to: resident.managing_agent_email,
              subject: `Reminder: ${checklist.move_type === 'move_in' ? 'Move-In' : 'Move-Out'} Tasks for ${resident.first_name} ${resident.last_name}`,
              body: `
                <h2>Move ${checklist.move_type === 'move_in' ? 'In' : 'Out'} Reminder</h2>
                <p>The ${checklist.move_type === 'move_in' ? 'move-in' : 'move-out'} for ${resident.first_name} ${resident.last_name} is ${daysUntil} day${daysUntil > 1 ? 's' : ''} away (${checklistDate.toLocaleDateString()}).</p>
                <p>You still have the following tasks to complete:</p>
                <pre>${taskList}</pre>
                <p><strong>Important:</strong> Please ensure the dilapidation report for common property is completed.</p>
                <p>Please log in to your portal to complete these tasks.</p>
              `
            });
            remindersSent.push({ to: resident.managing_agent_email, type: 'managing_agent' });
          } catch (error) {
            console.error('Error sending reminder to managing agent:', error);
          }
        }

        // Send reminders to building manager
        if (tasksByAssignee.building_manager) {
          const taskList = tasksByAssignee.building_manager.map(t => `- ${t.task_name}`).join('\n');
          
          try {
            const building = await base44.asServiceRole.entities.Building.filter({ 
              id: checklist.building_id 
            });
            
            if (building[0]?.manager_email) {
              await base44.asServiceRole.integrations.Core.SendEmail({
                to: building[0].manager_email,
                subject: `Reminder: ${checklist.move_type === 'move_in' ? 'Move-In' : 'Move-Out'} Tasks - ${resident.first_name} ${resident.last_name}`,
                body: `
                  <h2>Move ${checklist.move_type === 'move_in' ? 'In' : 'Out'} Reminder</h2>
                  <p>The ${checklist.move_type === 'move_in' ? 'move-in' : 'move-out'} for ${resident.first_name} ${resident.last_name} is ${daysUntil} day${daysUntil > 1 ? 's' : ''} away (${checklistDate.toLocaleDateString()}).</p>
                  <p>You have the following tasks to complete:</p>
                  <pre>${taskList}</pre>
                  <p>Please log in to complete these tasks.</p>
                `
              });
              remindersSent.push({ to: building[0].manager_email, type: 'building_manager' });
            }
          } catch (error) {
            console.error('Error sending reminder to building manager:', error);
          }
        }
      }
    }

    return Response.json({ 
      success: true,
      reminders_sent: remindersSent.length,
      details: remindersSent
    });

  } catch (error) {
    console.error('Error sending checklist reminders:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});