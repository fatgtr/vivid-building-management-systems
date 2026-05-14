import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Authenticate - allow internal calls
    try {
      await base44.auth.me();
    } catch (e) {
      // Allow unauthenticated for scheduled/internal calls
    }

    // Get all tenant-reported work orders awaiting agent action
    const workOrders = await base44.asServiceRole.entities.WorkOrder.filter({ 
      status: 'tenant_reported_awaiting_agent' 
    });

    if (!workOrders || workOrders.length === 0) {
      return Response.json({ 
        success: true, 
        message: 'No work orders to escalate',
        processed: 0
      });
    }

    const now = new Date();
    const escalations = [];

    for (const workOrder of workOrders) {
      const createdDate = new Date(workOrder.created_date);
      const lastEscalation = workOrder.last_escalation_date ? new Date(workOrder.last_escalation_date) : null;
      const escalationCount = workOrder.escalation_count || 0;

      // Calculate days since creation or last escalation
      const daysSinceCreation = Math.floor((now - createdDate) / (1000 * 60 * 60 * 24));
      const daysSinceLastEscalation = lastEscalation ? 
        Math.floor((now - lastEscalation) / (1000 * 60 * 60 * 24)) : daysSinceCreation;

      // Escalation logic: send reminder every 3 days, max 3 times, then final to owner
      const shouldSendReminder = daysSinceLastEscalation >= 3 && escalationCount < 3;
      const shouldSendFinalToOwner = escalationCount >= 3 && daysSinceLastEscalation >= 3;

      if (!shouldSendReminder && !shouldSendFinalToOwner) {
        continue;
      }

      // Get resident, building, unit info
      const residents = await base44.asServiceRole.entities.Resident.filter({ 
        email: workOrder.reported_by 
      });
      const resident = residents && residents.length > 0 ? residents[0] : null;

      if (!resident || !resident.managing_agent_email) {
        continue;
      }

      const buildings = await base44.asServiceRole.entities.Building.filter({ 
        id: workOrder.building_id 
      });
      const building = buildings && buildings.length > 0 ? buildings[0] : null;

      const units = await base44.asServiceRole.entities.Unit.filter({ 
        id: workOrder.unit_id 
      });
      const unit = units && units.length > 0 ? units[0] : null;

      if (shouldSendReminder) {
        // Send reminder to managing agent
        const reminderNumber = escalationCount + 1;
        
        const emailBody = `
          <h2>Reminder ${reminderNumber}/3: Tenant Maintenance Request Pending</h2>
          
          <p>Dear ${resident.managing_agent_contact_name || 'Managing Agent'},</p>
          
          <p>This is reminder <strong>${reminderNumber} of 3</strong> regarding a pending maintenance request that requires your attention.</p>
          
          <h3>Property Details:</h3>
          <ul>
            <li><strong>Building:</strong> ${building?.name || 'N/A'}</li>
            <li><strong>Unit:</strong> ${unit?.unit_number || 'N/A'}</li>
            <li><strong>Tenant:</strong> ${resident.first_name} ${resident.last_name}</li>
          </ul>
          
          <h3>Issue Details:</h3>
          <ul>
            <li><strong>Title:</strong> ${workOrder.title}</li>
            <li><strong>Category:</strong> ${workOrder.category.replace(/_/g, ' ')}</li>
            <li><strong>Priority:</strong> ${workOrder.priority}</li>
            <li><strong>Reported:</strong> ${createdDate.toLocaleDateString()}</li>
            <li><strong>Description:</strong> ${workOrder.description}</li>
          </ul>
          
          <p><strong>Action Required:</strong> Please arrange for repairs as soon as possible. If you have already addressed this issue, please update the work order status in the system.</p>
          
          ${reminderNumber === 3 ? '<p><strong>Final Reminder:</strong> If we do not receive a response, the property owner will be notified directly.</p>' : ''}
          
          <p>Thank you for your prompt attention to this matter.</p>
          
          <p>Best regards,<br/>Building Management</p>
        `;

        await base44.integrations.Core.SendEmail({
          from_name: building?.name || 'Building Management',
          to: resident.managing_agent_email,
          subject: `REMINDER ${reminderNumber}/3: Tenant Maintenance Request - ${building?.name || 'Property'} Unit ${unit?.unit_number || 'N/A'}`,
          body: emailBody
        });

        // Update work order
        await base44.asServiceRole.entities.WorkOrder.update(workOrder.id, {
          escalation_count: reminderNumber,
          last_escalation_date: now.toISOString(),
        });

        escalations.push({
          workOrderId: workOrder.id,
          type: 'reminder',
          count: reminderNumber,
          recipient: resident.managing_agent_email
        });

      } else if (shouldSendFinalToOwner) {
        // Send final escalation to owner (CC managing agent)
        const ownerEmail = resident.investor_email || unit?.owner_email;
        
        if (ownerEmail) {
          const emailBody = `
            <h2>Maintenance Issue Escalation - Owner Notification</h2>
            
            <p>Dear Property Owner,</p>
            
            <p>We are writing to inform you of a maintenance issue in your property that has not been addressed by your managing agent despite multiple reminders.</p>
            
            <h3>Property Details:</h3>
            <ul>
              <li><strong>Building:</strong> ${building?.name || 'N/A'}</li>
              <li><strong>Unit:</strong> ${unit?.unit_number || 'N/A'}</li>
              <li><strong>Tenant:</strong> ${resident.first_name} ${resident.last_name}</li>
              <li><strong>Managing Agent:</strong> ${resident.managing_agent_company || 'N/A'}</li>
            </ul>
            
            <h3>Issue Details:</h3>
            <ul>
              <li><strong>Title:</strong> ${workOrder.title}</li>
              <li><strong>Category:</strong> ${workOrder.category.replace(/_/g, ' ')}</li>
              <li><strong>Priority:</strong> ${workOrder.priority}</li>
              <li><strong>Reported:</strong> ${createdDate.toLocaleDateString()}</li>
              <li><strong>Description:</strong> ${workOrder.description}</li>
            </ul>
            
            <p><strong>Escalation History:</strong> Three reminder emails were sent to your managing agent at ${resident.managing_agent_email} without response.</p>
            
            <p><strong>Action Recommended:</strong> Please contact your managing agent to ensure this issue is addressed promptly. Delayed maintenance can lead to further damage and tenant dissatisfaction.</p>
            
            <p>If you have any questions or concerns, please contact building management.</p>
            
            <p>Best regards,<br/>Building Management</p>
          `;

          await base44.integrations.Core.SendEmail({
            from_name: building?.name || 'Building Management',
            to: ownerEmail,
            subject: `Escalation: Unresolved Tenant Maintenance Issue - ${building?.name || 'Property'} Unit ${unit?.unit_number || 'N/A'}`,
            body: emailBody
          });

          // CC the managing agent
          if (resident.managing_agent_email) {
            const ccEmailBody = `
              <h2>Final Notice: Owner Has Been Notified</h2>
              
              <p>Dear ${resident.managing_agent_contact_name || 'Managing Agent'},</p>
              
              <p>The property owner has been notified of the unresolved maintenance issue at ${building?.name || 'Property'}, Unit ${unit?.unit_number || 'N/A'}.</p>
              
              <p>After three unanswered reminder emails, we have escalated this matter to the owner's attention as per our protocol.</p>
              
              <p>Please address this issue immediately to maintain good tenant relations and property condition.</p>
              
              <p>Best regards,<br/>Building Management</p>
            `;

            await base44.integrations.Core.SendEmail({
              from_name: building?.name || 'Building Management',
              to: resident.managing_agent_email,
              subject: `Owner Notified: Maintenance Issue - ${building?.name || 'Property'} Unit ${unit?.unit_number || 'N/A'}`,
              body: ccEmailBody
            });
          }

          // Update work order status
          await base44.asServiceRole.entities.WorkOrder.update(workOrder.id, {
            last_escalation_date: now.toISOString(),
            notes: `${workOrder.notes || ''}\n\n[${now.toISOString()}] Escalated to owner after 3 unanswered reminders to managing agent.`
          });

          escalations.push({
            workOrderId: workOrder.id,
            type: 'final_to_owner',
            ownerEmail: ownerEmail,
            agentEmail: resident.managing_agent_email
          });
        }
      }
    }

    return Response.json({ 
      success: true, 
      message: `Processed ${escalations.length} escalations`,
      processed: escalations.length,
      escalations: escalations
    });

  } catch (error) {
    console.error('Work order escalation error:', error);
    return Response.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
});