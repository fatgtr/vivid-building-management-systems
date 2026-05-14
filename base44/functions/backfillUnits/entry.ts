import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { buildingId } = await req.json();

    // Get the building
    const building = await base44.entities.Building.get(buildingId);
    if (!building) {
      return Response.json({ error: 'Building not found' }, { status: 404 });
    }

    // Check if units already exist for this building
    const existingUnits = await base44.entities.Unit.filter({ building_id: buildingId });
    if (existingUnits.length > 0) {
      return Response.json({ 
        message: 'Units already exist for this building', 
        unitsCount: existingUnits.length 
      });
    }

    // Create units based on building configuration
    const newUnits = [];

    if (building.is_bmc && building.bmc_strata_plans?.length > 0) {
      // BMC: create units for each strata plan
      building.bmc_strata_plans.forEach(plan => {
        const numLots = Number(plan.strata_lots) || 0;
        if (numLots > 0) {
          for (let i = 1; i <= numLots; i++) {
            newUnits.push({
              building_id: buildingId,
              unit_number: `Lot ${i}`,
              lot_number: String(i),
              strata_plan_number: plan.plan_number,
              status: 'vacant'
            });
          }
        }
      });
    } else if (!building.is_bmc && building.strata_lots) {
      // Non-BMC: create units based on strata_lots field
      const numLots = Number(building.strata_lots) || 0;
      if (numLots > 0) {
        for (let i = 1; i <= numLots; i++) {
          newUnits.push({
            building_id: buildingId,
            unit_number: `Lot ${i}`,
            lot_number: String(i),
            strata_plan_number: building.strata_plan_number,
            status: 'vacant'
          });
        }
      }
    }

    if (newUnits.length > 0) {
      await base44.entities.Unit.bulkCreate(newUnits);
      return Response.json({ 
        success: true, 
        unitsCreated: newUnits.length,
        message: `Successfully created ${newUnits.length} units for building ${building.name}`
      });
    }

    return Response.json({ 
      success: true,
      unitsCreated: 0,
      message: 'No units needed to be created (building has no strata lots configured)'
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});