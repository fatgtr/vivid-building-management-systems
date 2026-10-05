import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';

export default async function(req) {
    try {
        const base44 = createClientFromRequest(req);

        // Authenticate user
        const user = await base44.auth.me();
        if (!user) {
            return Response.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        // Parse request body
        const { buildingId } = await req.json();

        if (typeof buildingId !== 'string' || !buildingId.trim()) {
            return Response.json({ success: false, error: 'Building ID is required' }, { status: 400 });
        }

        // Confirm the building exists and is visible to this user before deleting children.
        await base44.entities.Building.get(buildingId);

        const serviceRole = base44.asServiceRole;

        // Every child entity that carries a building_id reference, ordered by operational importance.
        // Each deleteMany is one bulk call removing all matches for this building. The set is kept
        // within the per-function entity-API rate window; global records (building_id unset) are
        // never matched, so shared templates/registers are preserved.
        const relatedEntities = [
            'QueryNote',          // Abandoned Queries on the Dashboard
            'WorkOrder',
            'Document',
            'Resident',
            'Unit',
            'Asset',
            'Location',
            'Inspection',
            'InspectionFinding',
            'InspectionChecklist',
            'ServiceRecord',
            'ComplianceRecord',
            'MaintenanceSchedule',
            'Announcement',
            'BroadcastMessage',
            'Notification',
            'Note',
            'Task',
            'Amenity',
            'AmenityBooking',
            'VisitorLog',
            'VisitorParkingBooking',
            'KeyRegister',
            'PetRegistry',
            'MoveBooking',
            'Invoice',
            'LevyPayment',
            'FinancialReport',
            'CapitalWorksPlan',
        ];

        // Stop on any child-deletion failure; never remove the parent or report success after an incomplete cascade.
        for (const entityName of relatedEntities) {
            try {
                await serviceRole.entities[entityName].deleteMany({ building_id: buildingId });
            } catch (err) {
                const status = err?.status || err?.response?.status;
                const msg = (err?.message || '').toLowerCase();
                // 404 / "no records" means nothing to delete for this entity — safe to continue.
                if (status === 404 || msg.includes('not found') || msg.includes('no records')) {
                    continue;
                }
                console.error(`deleteMany ${entityName} failed:`, err?.message || err);
                throw err;
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
            success: false,
            error: error.message || 'Failed to delete building'
        }, { status: error.status || 500 });
    }
}