import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Get all buildings
    const buildings = await base44.asServiceRole.entities.Building.list();
    
    const results = [];
    
    for (const building of buildings) {
      try {
        // Run prediction for each building
        const response = await base44.asServiceRole.functions.invoke('predictMaintenanceIssues', {
          buildingId: building.id
        });
        
        results.push({
          buildingId: building.id,
          buildingName: building.name,
          success: true,
          predictions: response.data?.predictions?.length || 0,
          alertsSent: response.data?.alertsSent || false
        });
      } catch (error) {
        console.error(`Failed to run predictions for ${building.name}:`, error);
        results.push({
          buildingId: building.id,
          buildingName: building.name,
          success: false,
          error: error.message
        });
      }
    }
    
    return Response.json({ 
      success: true,
      totalBuildings: buildings.length,
      results
    });
  } catch (error) {
    console.error('Scheduled predictions failed:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});