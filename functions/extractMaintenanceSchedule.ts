import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { fileUrl, buildingId } = await req.json();

    if (!fileUrl || !buildingId) {
      return Response.json({ error: 'fileUrl and buildingId are required' }, { status: 400 });
    }

    // Use LLM to extract maintenance schedule data
    const extractionResult = await base44.integrations.Core.InvokeLLM({
      prompt: `Extract maintenance schedule information from the NSW Initial Maintenance Schedule document.

For each maintenance item found, extract:
- Category (structural_components, fire_safety_systems, hvac, etc.)
- Item name
- Whether maintenance or inspection or both is required
- Description of maintenance/inspection required
- Frequency (daily, weekly, monthly, quarterly, half_yearly, yearly, bi_yearly)
- Estimated cost per activity
- Manufacturer name and contact details
- Installer name and contact details
- Whether manufacturer manual is attached
- Whether warranty is attached

Return the data in this exact JSON structure:
{
  "items": [
    {
      "category": "fire_safety_systems",
      "item_name": "Fire extinguishers",
      "maintenance_type": "both",
      "description": "Annual inspection and servicing",
      "frequency": "yearly",
      "estimated_cost": 50,
      "manufacturer_name": "Company Name",
      "manufacturer_contact": "Contact details",
      "installer_name": "Installer Name",
      "installer_contact": "Installer contact",
      "has_manual": true,
      "has_warranty": true
    }
  ]
}`,
      file_urls: [fileUrl],
      response_json_schema: {
        type: 'object',
        properties: {
          items: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                category: { type: 'string' },
                item_name: { type: 'string' },
                maintenance_type: { type: 'string' },
                description: { type: 'string' },
                frequency: { type: 'string' },
                estimated_cost: { type: 'number' },
                manufacturer_name: { type: 'string' },
                manufacturer_contact: { type: 'string' },
                installer_name: { type: 'string' },
                installer_contact: { type: 'string' },
                has_manual: { type: 'boolean' },
                has_warranty: { type: 'boolean' }
              }
            }
          }
        }
      }
    });

    const items = extractionResult.items || [];
    const warnings = [];
    let schedulesCreated = 0;
    let assetsLinked = 0;

    // Get existing assets to try linking
    const assets = await base44.entities.Asset.filter({ building_id: buildingId });

    // Create maintenance schedules
    const schedulesToCreate = [];
    const now = new Date();

    for (const item of items) {
      if (!item.item_name || !item.frequency) {
        warnings.push(`Skipped item without name or frequency`);
        continue;
      }

      // Try to find matching asset
      let assetId = null;
      const matchingAsset = assets.find(a => 
        a.name?.toLowerCase().includes(item.item_name.toLowerCase()) ||
        a.asset_type?.toLowerCase().includes(item.item_name.toLowerCase())
      );

      if (matchingAsset) {
        assetId = matchingAsset.id;
        assetsLinked++;
      }

      schedulesToCreate.push({
        building_id: buildingId,
        asset_id: assetId,
        category: item.category || 'other',
        item_name: item.item_name,
        subject: `${item.item_name} - ${item.maintenance_type || 'Maintenance'}`,
        description: item.description || '',
        maintenance_type: item.maintenance_type || 'both',
        recurrence: item.frequency,
        scheduled_date: now.toISOString().split('T')[0],
        next_due_date: now.toISOString().split('T')[0],
        estimated_cost: item.estimated_cost || 0,
        manufacturer_name: item.manufacturer_name || '',
        manufacturer_contact: item.manufacturer_contact || '',
        installer_name: item.installer_name || '',
        installer_contact: item.installer_contact || '',
        status: 'active',
        from_nsw_initial_schedule: true
      });
    }

    if (schedulesToCreate.length > 0) {
      await base44.entities.MaintenanceSchedule.bulkCreate(schedulesToCreate);
      schedulesCreated = schedulesToCreate.length;
    }

    return Response.json({
      success: true,
      schedules_created: schedulesCreated,
      assets_linked: assetsLinked,
      warnings: warnings.length > 0 ? warnings : undefined
    });

  } catch (error) {
    console.error('Extract maintenance schedule error:', error);
    return Response.json({ 
      success: false,
      error: error.message 
    }, { status: 500 });
  }
});