import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { residentId, moveType, moveDate } = await req.json();

    if (!residentId || !moveType || !moveDate) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Fetch resident details
    const residents = await base44.asServiceRole.entities.Resident.filter({ id: residentId });
    const resident = residents[0];

    if (!resident) {
      return Response.json({ error: 'Resident not found' }, { status: 404 });
    }

    // Check if checklist already exists
    const existingChecklists = await base44.asServiceRole.entities.MoveChecklist.filter({
      resident_id: residentId,
      move_type: moveType
    });

    if (existingChecklists.length > 0) {
      return Response.json({ 
        success: true, 
        checklist: existingChecklists[0],
        message: 'Checklist already exists'
      });
    }

    // Define tasks based on move type
    const moveInTasks = [
      {
        id: 'key-handover',
        task_name: 'Key Handover',
        description: 'Collect keys, access cards, and mailbox keys from building manager',
        assigned_to: 'tenant',
        requires_upload: false,
        priority: 'high'
      },
      {
        id: 'dilapidation-before',
        task_name: 'Pre-Move Dilapidation Report (Common Property)',
        description: 'Managing agent must inspect and document the condition of common property areas (hallways, elevator, entry) before tenant moves in',
        assigned_to: 'managing_agent',
        requires_upload: true,
        priority: 'high'
      },
      {
        id: 'unit-inspection',
        task_name: 'Unit Condition Inspection',
        description: 'Inspect unit condition and document any pre-existing damage',
        assigned_to: 'tenant',
        requires_upload: true,
        priority: 'high'
      },
      {
        id: 'utility-setup',
        task_name: 'Utility Setup',
        description: 'Transfer utilities (electricity, gas, water) to tenant name',
        assigned_to: 'tenant',
        requires_upload: false,
        priority: 'medium'
      },
      {
        id: 'building-rules',
        task_name: 'Review Building Rules & Bylaws',
        description: 'Read and acknowledge building rules, bylaws, and regulations',
        assigned_to: 'tenant',
        requires_upload: false,
        priority: 'medium'
      },
      {
        id: 'parking-permit',
        task_name: 'Parking Permit Registration',
        description: 'Register vehicle and obtain parking permit if applicable',
        assigned_to: 'tenant',
        requires_upload: false,
        priority: 'low'
      },
      {
        id: 'emergency-contacts',
        task_name: 'Emergency Contact Submission',
        description: 'Provide emergency contact information to building management',
        assigned_to: 'tenant',
        requires_upload: false,
        priority: 'medium'
      },
      {
        id: 'bond-payment',
        task_name: 'Bond Payment Confirmation',
        description: 'Confirm bond payment has been received',
        assigned_to: 'building_manager',
        requires_upload: false,
        priority: 'high'
      },
      {
        id: 'welcome-pack',
        task_name: 'Welcome Pack Delivery',
        description: 'Provide tenant with welcome pack including building information',
        assigned_to: 'building_manager',
        requires_upload: false,
        priority: 'low'
      }
    ];

    const moveOutTasks = [
      {
        id: 'move-notice',
        task_name: 'Move-Out Notice Submission',
        description: 'Submit formal notice of intention to vacate',
        assigned_to: 'tenant',
        requires_upload: true,
        priority: 'high'
      },
      {
        id: 'final-rent',
        task_name: 'Final Rent Payment',
        description: 'Ensure all rent payments are up to date',
        assigned_to: 'tenant',
        requires_upload: false,
        priority: 'high'
      },
      {
        id: 'utility-disconnect',
        task_name: 'Utility Disconnection',
        description: 'Arrange disconnection or transfer of utilities',
        assigned_to: 'tenant',
        requires_upload: false,
        priority: 'medium'
      },
      {
        id: 'cleaning',
        task_name: 'Professional Cleaning',
        description: 'Arrange professional cleaning of the unit',
        assigned_to: 'tenant',
        requires_upload: false,
        priority: 'high'
      },
      {
        id: 'dilapidation-after',
        task_name: 'Post-Move Dilapidation Report (Common Property)',
        description: 'Managing agent must inspect common property areas for any damage caused during move-out',
        assigned_to: 'managing_agent',
        requires_upload: true,
        priority: 'high'
      },
      {
        id: 'final-inspection',
        task_name: 'Final Unit Inspection',
        description: 'Building manager conducts final inspection of unit condition',
        assigned_to: 'building_manager',
        requires_upload: true,
        priority: 'high'
      },
      {
        id: 'key-return',
        task_name: 'Key Return',
        description: 'Return all keys, access cards, and mailbox keys',
        assigned_to: 'tenant',
        requires_upload: false,
        priority: 'high'
      },
      {
        id: 'forwarding-address',
        task_name: 'Forwarding Address',
        description: 'Provide forwarding address for mail and bond return',
        assigned_to: 'tenant',
        requires_upload: false,
        priority: 'medium'
      },
      {
        id: 'bond-return',
        task_name: 'Bond Return Processing',
        description: 'Process bond return after inspection and any deductions',
        assigned_to: 'building_manager',
        requires_upload: false,
        priority: 'high'
      }
    ];

    const tasks = moveType === 'move_in' ? moveInTasks : moveOutTasks;

    // Create the checklist
    const checklist = await base44.asServiceRole.entities.MoveChecklist.create({
      resident_id: residentId,
      resident_name: `${resident.first_name} ${resident.last_name}`,
      building_id: resident.building_id,
      unit_id: resident.unit_id,
      move_type: moveType,
      checklist_date: moveDate,
      status: 'pending',
      tasks: tasks
    });

    // Send notification to relevant parties
    try {
      await base44.asServiceRole.integrations.Core.SendEmail({
        to: resident.email,
        subject: `${moveType === 'move_in' ? 'Move-In' : 'Move-Out'} Checklist Created`,
        body: `
          <h2>${moveType === 'move_in' ? 'Welcome!' : 'Move-Out Process'}</h2>
          <p>A ${moveType === 'move_in' ? 'move-in' : 'move-out'} checklist has been created for your upcoming move on ${new Date(moveDate).toLocaleDateString()}.</p>
          <p>Please log in to your portal to view your tasks and track your progress.</p>
          <p>If you have any questions, please contact your building manager.</p>
        `
      });

      if (resident.managing_agent_email) {
        await base44.asServiceRole.integrations.Core.SendEmail({
          to: resident.managing_agent_email,
          subject: `New ${moveType === 'move_in' ? 'Move-In' : 'Move-Out'} Checklist - ${resident.first_name} ${resident.last_name}`,
          body: `
            <h2>New ${moveType === 'move_in' ? 'Move-In' : 'Move-Out'} Checklist</h2>
            <p>A checklist has been created for ${resident.first_name} ${resident.last_name}.</p>
            <p>Date: ${new Date(moveDate).toLocaleDateString()}</p>
            <p><strong>Important:</strong> You need to complete the dilapidation report for common property areas.</p>
            <p>Please log in to your portal to view and complete your assigned tasks.</p>
          `
        });
      }
    } catch (emailError) {
      console.error('Error sending notification emails:', emailError);
    }

    return Response.json({ 
      success: true, 
      checklist,
      message: 'Checklist created successfully'
    });

  } catch (error) {
    console.error('Error generating checklist:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});