import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';

export default async function(req) {
    try {
        const base44 = createClientFromRequest(req);
        
        // Authenticate user
        const user = await base44.auth.me();
        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Parse request body
        const { buildingId } = await req.json();
        
        if (typeof buildingId !== 'string' || !buildingId.trim()) {
            return Response.json({ success: false, error: 'Building ID is required' }, { status: 400 });
        }

        // Confirm the building exists and is visible to this user before deleting children.
        await base44.entities.Building.get(buildingId);

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
            'AmenityBooking',
            'Amenity',
            'VisitorLog',
            'SmartDeviceIntegration',
            'ImportantNumber',
            'ComplianceRecord',
        ];

        // Stop on any child-deletion failure; never remove the parent or report success after an incomplete cascade.
        for (const entityName of relatedEntities) {
            await serviceRole.entities[entityName].deleteMany({ building_id: buildingId });
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
            success: false,
            error: error.message || 'Failed to delete building'
        }, { status: error.status || 500 });
    }
}