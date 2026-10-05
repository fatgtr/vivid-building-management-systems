import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        // Authenticate user
        const user = await base44.auth.me();
        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Parse request body
        const { buildingId } = await req.json();
        
        if (!buildingId) {
            return Response.json({ error: 'Building ID is required' }, { status: 400 });
        }

        // Use service role for comprehensive deletion.
        // Each deleteMany runs a single bulk delete for all matching records,
        // keeping us well under the per-function rate limit.
        const serviceRole = base44.asServiceRole;

        // Delete all child entities that reference this building.
        // Using deleteMany with a building_id filter removes every match in one call.
        const relatedEntities = [
            'Resident',
            'Unit',
            'Asset',
            'Location',
            'WorkOrder',
            'MaintenanceSchedule',
            'Inspection',
            'Document',
            'Announcement',
            'Amenity',
            'AmenityBooking',
            'VisitorLog',
            'SmartDeviceIntegration',
            'ImportantNumber',
            'ComplianceRecord',
        ];

        for (const entityName of relatedEntities) {
            try {
                await serviceRole.entities[entityName].deleteMany({ building_id: buildingId });
            } catch (err) {
                // Non-fatal: a related entity may have no matching records or
                // may not carry building_id — continue with the rest.
                console.error(`deleteMany ${entityName} failed:`, err?.message || err);
            }
        }

        // Finally, delete the Building itself.
        await serviceRole.entities.Building.delete(buildingId);

        return Response.json({ 
            success: true,
            message: 'Building and all associated data deleted successfully'
        });

    } catch (error) {
        console.error('Delete building error:', error);
        return Response.json({ 
            error: error.message || 'Failed to delete building'
        }, { status: 500 });
    }
});