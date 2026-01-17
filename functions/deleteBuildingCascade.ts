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

        // Use service role for comprehensive deletion
        const serviceRole = base44.asServiceRole;

        // Delete all related entities in order (children first, then parent)
        
        // 1. Delete Residents
        const residents = await serviceRole.entities.Resident.filter({ building_id: buildingId });
        for (const resident of residents) {
            await serviceRole.entities.Resident.delete(resident.id);
        }

        // 2. Delete Units
        const units = await serviceRole.entities.Unit.filter({ building_id: buildingId });
        for (const unit of units) {
            await serviceRole.entities.Unit.delete(unit.id);
        }

        // 3. Delete Assets
        const assets = await serviceRole.entities.Asset.filter({ building_id: buildingId });
        for (const asset of assets) {
            await serviceRole.entities.Asset.delete(asset.id);
        }

        // 4. Delete Locations
        const locations = await serviceRole.entities.Location.filter({ building_id: buildingId });
        for (const location of locations) {
            await serviceRole.entities.Location.delete(location.id);
        }

        // 5. Delete Work Orders
        const workOrders = await serviceRole.entities.WorkOrder.filter({ building_id: buildingId });
        for (const wo of workOrders) {
            await serviceRole.entities.WorkOrder.delete(wo.id);
        }

        // 6. Delete Maintenance Schedules
        const schedules = await serviceRole.entities.MaintenanceSchedule.filter({ building_id: buildingId });
        for (const schedule of schedules) {
            await serviceRole.entities.MaintenanceSchedule.delete(schedule.id);
        }

        // 7. Delete Inspections
        const inspections = await serviceRole.entities.Inspection.filter({ building_id: buildingId });
        for (const inspection of inspections) {
            await serviceRole.entities.Inspection.delete(inspection.id);
        }

        // 8. Delete Documents
        const documents = await serviceRole.entities.Document.filter({ building_id: buildingId });
        for (const doc of documents) {
            await serviceRole.entities.Document.delete(doc.id);
        }

        // 9. Delete Announcements
        const announcements = await serviceRole.entities.Announcement.filter({ building_id: buildingId });
        for (const announcement of announcements) {
            await serviceRole.entities.Announcement.delete(announcement.id);
        }

        // 10. Delete Amenities
        const amenities = await serviceRole.entities.Amenity.filter({ building_id: buildingId });
        for (const amenity of amenities) {
            await serviceRole.entities.Amenity.delete(amenity.id);
        }

        // 11. Delete Amenity Bookings
        const bookings = await serviceRole.entities.AmenityBooking.filter({ building_id: buildingId });
        for (const booking of bookings) {
            await serviceRole.entities.AmenityBooking.delete(booking.id);
        }

        // 12. Delete Visitor Logs
        const visitors = await serviceRole.entities.VisitorLog.filter({ building_id: buildingId });
        for (const visitor of visitors) {
            await serviceRole.entities.VisitorLog.delete(visitor.id);
        }

        // 13. Delete Smart Device Integrations
        const devices = await serviceRole.entities.SmartDeviceIntegration.filter({ building_id: buildingId });
        for (const device of devices) {
            await serviceRole.entities.SmartDeviceIntegration.delete(device.id);
        }

        // 14. Delete Important Numbers
        const numbers = await serviceRole.entities.ImportantNumber.filter({ building_id: buildingId });
        for (const number of numbers) {
            await serviceRole.entities.ImportantNumber.delete(number.id);
        }

        // 15. Delete Compliance Records
        const complianceRecords = await serviceRole.entities.ComplianceRecord.filter({ building_id: buildingId });
        for (const record of complianceRecords) {
            await serviceRole.entities.ComplianceRecord.delete(record.id);
        }

        // 16. Finally, delete the Building itself
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