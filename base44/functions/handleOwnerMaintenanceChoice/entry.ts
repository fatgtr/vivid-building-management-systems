import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Authenticate user
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { workOrderId, choice } = await req.json();

    if (!workOrderId || !choice) {
      return Response.json({ 
        success: false, 
        error: 'Missing required parameters' 
      }, { status: 400 });
    }

    if (choice !== 'bm_facilitated' && choice !== 'self_manage') {
      return Response.json({ 
        success: false, 
        error: 'Invalid choice' 
      }, { status: 400 });
    }

    // Get work order
    const workOrders = await base44.asServiceRole.entities.WorkOrder.filter({ 
      id: workOrderId 
    });

    if (!workOrders || workOrders.length === 0) {
      return Response.json({ 
        success: false, 
        error: 'Work order not found' 
      }, { status: 404 });
    }

    const workOrder = workOrders[0];

    // Get resident and building info
    const residents = await base44.asServiceRole.entities.Resident.filter({ 
      email: user.email 
    });
    const resident = residents && residents.length > 0 ? residents[0] : null;

    const buildings = await base44.asServiceRole.entities.Building.filter({ 
      id: workOrder.building_id 
    });
    const building = buildings && buildings.length > 0 ? buildings[0] : null;

    const units = await base44.asServiceRole.entities.Unit.filter({ 
      id: workOrder.unit_id 
    });
    const unit = units && units.length > 0 ? units[0] : null;

    if (choice === 'bm_facilitated') {
      // Owner chose building manager to facilitate
      await base44.asServiceRole.entities.WorkOrder.update(workOrderId, {
        status: 'owner_reported_bm_facilitated',
        owner_billing_notes: 'Owner has chosen building manager facilitation. Additional service fee applies.',
      });

      // Notify building manager
      const buildingManagerEmail = building?.manager_email;
      
      if (buildingManagerEmail) {
        const emailBody = `
          <h2>Owner-Requested Maintenance - Building Manager Facilitation</h2>
          
          <p>Dear Building Manager,</p>
          
          <p>An owner has requested building management assistance with a maintenance issue in their unit.</p>
          
          <h3>Property Details:</h3>
          <ul>
            <li><strong>Building:</strong> ${building?.name || 'N/A'}</li>
            <li><strong>Unit:</strong> ${unit?.unit_number || 'N/A'}</li>
            <li><strong>Owner:</strong> ${resident?.first_name} ${resident?.last_name}</li>
          </ul>
          
          <h3>Issue Details:</h3>
          <ul>
            <li><strong>Title:</strong> ${workOrder.title}</li>
            <li><strong>Category:</strong> ${workOrder.category.replace(/_/g, ' ')}</li>
            <li><strong>Priority:</strong> ${workOrder.priority}</li>
            <li><strong>Description:</strong> ${workOrder.description}</li>
          </ul>
          
          <p><strong>Billing Note:</strong> The owner has acknowledged that an additional service fee will apply for building manager facilitation. Please track time and costs accordingly.</p>
          
          <p>Please coordinate with contractors and keep the owner informed of progress.</p>
          
          <p>Best regards,<br/>Building Management System</p>
        `;

        await base44.integrations.Core.SendEmail({
          from_name: building?.name || 'Building Management',
          to: buildingManagerEmail,
          subject: `Owner Maintenance Request - BM Facilitation - ${building?.name || 'Property'} Unit ${unit?.unit_number || 'N/A'}`,
          body: emailBody
        });
      }

    } else if (choice === 'self_manage') {
      // Owner chose to self-manage
      await base44.asServiceRole.entities.WorkOrder.update(workOrderId, {
        status: 'owner_reported_self_manage',
        owner_billing_notes: 'Owner has chosen to arrange their own contractor.',
      });

      // Send confirmation email to owner
      if (resident?.email) {
        const emailBody = `
          <h2>Maintenance Request Confirmation</h2>
          
          <p>Dear ${resident.first_name},</p>
          
          <p>Thank you for reporting the maintenance issue. As requested, you will be arranging your own contractor for this repair.</p>
          
          <h3>Issue Details:</h3>
          <ul>
            <li><strong>Title:</strong> ${workOrder.title}</li>
            <li><strong>Category:</strong> ${workOrder.category.replace(/_/g, ' ')}</li>
            <li><strong>Priority:</strong> ${workOrder.priority}</li>
            <li><strong>Description:</strong> ${workOrder.description}</li>
          </ul>
          
          <p><strong>Important Reminders:</strong></p>
          <ul>
            <li>Please ensure any contractor you hire is licensed and insured</li>
            <li>You may need to coordinate access with building management for certain repairs</li>
            <li>This issue has been logged in our system for your records</li>
          </ul>
          
          <p>If you have any questions or need assistance, please don't hesitate to contact building management.</p>
          
          <p>Best regards,<br/>Building Management</p>
        `;

        await base44.integrations.Core.SendEmail({
          from_name: building?.name || 'Building Management',
          to: resident.email,
          subject: `Maintenance Request Confirmation - ${building?.name || 'Property'} Unit ${unit?.unit_number || 'N/A'}`,
          body: emailBody
        });
      }
    }

    return Response.json({ 
      success: true,
      message: 'Owner choice processed successfully'
    });

  } catch (error) {
    console.error('Owner maintenance choice error:', error);
    return Response.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
});