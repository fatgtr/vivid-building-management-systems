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

    // Get existing units
    const existingUnits = await base44.entities.Unit.filter({ building_id: buildingId });
    if (existingUnits.length === 0) {
      return Response.json({ message: 'No units to update' });
    }

    let updatedCount = 0;

    if (building.is_bmc && building.bmc_strata_plans?.length > 0) {
      // For BMC: distribute units across strata plans based on lot count
      let lotIndex = 1;
      
      for (const plan of building.bmc_strata_plans) {
        const numLots = Number(plan.strata_lots) || 0;
        
        for (let i = 0; i < numLots; i++) {
          if (lotIndex <= existingUnits.length) {
            const unitToUpdate = existingUnits[lotIndex - 1];
            if (!unitToUpdate.strata_plan_number) {
              await base44.entities.Unit.update(unitToUpdate.id, {
                strata_plan_number: plan.plan_number
              });
              updatedCount++;
            }
            lotIndex++;
          }
        }
      }
    } else if (!building.is_bmc && building.strata_plan_number) {
      // For non-BMC: assign single strata plan number to all units
      for (const unit of existingUnits) {
        if (!unit.strata_plan_number) {
          await base44.entities.Unit.update(unit.id, {
            strata_plan_number: building.strata_plan_number
          });
          updatedCount++;
        }
      }
    }

    return Response.json({
      success: true,
      updatedCount,
      message: `Updated ${updatedCount} units with strata plan numbers`
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});