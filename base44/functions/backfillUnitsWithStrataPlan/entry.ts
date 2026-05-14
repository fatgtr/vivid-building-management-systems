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
    const building = await base44.entities.Building.filter({ id: buildingId });
    if (!building || building.length === 0) {
      return Response.json({ error: 'Building not found' }, { status: 404 });
    }

    const currentBuilding = building[0];

    // Get existing units - sort by lot_number to ensure consistent ordering
    const existingUnits = await base44.entities.Unit.filter({ building_id: buildingId });
    if (existingUnits.length === 0) {
      return Response.json({ message: 'No units to update' });
    }

    // Sort units by lot_number
    existingUnits.sort((a, b) => {
      const lotA = parseInt(a.lot_number || a.unit_number) || 0;
      const lotB = parseInt(b.lot_number || b.unit_number) || 0;
      return lotA - lotB;
    });

    let updatedCount = 0;

    if (currentBuilding.is_bmc && currentBuilding.bmc_strata_plans?.length > 0) {
      // For BMC: distribute units across strata plans based on lot count
      let unitIndex = 0;
      
      for (const plan of currentBuilding.bmc_strata_plans) {
        const numLots = Number(plan.strata_lots) || 0;
        
        for (let i = 0; i < numLots && unitIndex < existingUnits.length; i++) {
          const unitToUpdate = existingUnits[unitIndex];
          if (!unitToUpdate.strata_plan_number) {
            await base44.entities.Unit.update(unitToUpdate.id, {
              strata_plan_number: plan.plan_number
            });
            updatedCount++;
          }
          unitIndex++;
        }
      }
    } else if (!currentBuilding.is_bmc && currentBuilding.strata_plan_number) {
      // For non-BMC: assign single strata plan number to all units
      for (const unit of existingUnits) {
        if (!unit.strata_plan_number) {
          await base44.entities.Unit.update(unit.id, {
            strata_plan_number: currentBuilding.strata_plan_number
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
    console.error('Error in backfillUnitsWithStrataPlan:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});