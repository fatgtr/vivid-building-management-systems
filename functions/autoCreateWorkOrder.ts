import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { 
      buildingId, 
      title, 
      description, 
      category, 
      priority, 
      location, 
      assetId,
      unitId,
      reportedBy,
      source // 'prediction' or 'resident_report'
    } = await req.json();

    // Create work order
    const workOrder = await base44.asServiceRole.entities.WorkOrder.create({
      building_id: buildingId,
      title: title,
      description: description,
      category: category || 'general',
      priority: priority || 'medium',
      status: 'open',
      location: location,
      asset_id: assetId,
      unit_id: unitId,
      reported_by: reportedBy || 'AI System',
      auto_generated: true,
      source_type: source || 'prediction'
    });

    // Get building name for notification
    const building = await base44.entities.Building.get(buildingId);

    // Send notification to building manager
    if (building.manager_email) {
      await base44.integrations.Core.SendEmail({
        to: building.manager_email,
        subject: `New ${source === 'prediction' ? 'Predicted' : 'Reported'} Maintenance Issue - ${building.name}`,
        body: `A new work order has been automatically created:

Title: ${title}
Priority: ${priority}
Category: ${category}
Location: ${location || 'Not specified'}
Source: ${source === 'prediction' ? 'AI Prediction' : 'Resident Report'}

Description:
${description}

Please review and assign this work order in the Vivid BMS platform.`
      });
    }

    return Response.json({ 
      success: true, 
      work_order_id: workOrder.id,
      message: 'Work order created successfully'
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});