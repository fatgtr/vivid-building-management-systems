import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

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

        // 3. Delete Work Orders
        const workOrders = await serviceRole.entities.WorkOrder.filter({ building_id: buildingId });
        for (const wo of workOrders) {
            await serviceRole.entities.WorkOrder.delete(wo.id);
        }

        // 4. Delete Maintenance Schedules
        const schedules = await serviceRole.entities.MaintenanceSchedule.filter({ building_id: buildingId });
        for (const schedule of schedules) {
            await serviceRole.entities.MaintenanceSchedule.delete(schedule.id);
        }

        // 5. Delete Inspections
        const inspections = await serviceRole.entities.Inspection.filter({ building_id: buildingId });
        for (const inspection of inspections) {
            await serviceRole.entities.Inspection.delete(inspection.id);
        }

        // 6. Delete Documents
        const documents = await serviceRole.entities.Document.filter({ building_id: buildingId });
        for (const doc of documents) {
            await serviceRole.entities.Document.delete(doc.id);
        }

        // 7. Delete Announcements
        const announcements = await serviceRole.entities.Announcement.filter({ building_id: buildingId });
        for (const announcement of announcements) {
            await serviceRole.entities.Announcement.delete(announcement.id);
        }

        // 8. Delete Amenities
        const amenities = await serviceRole.entities.Amenity.filter({ building_id: buildingId });
        for (const amenity of amenities) {
            await serviceRole.entities.Amenity.delete(amenity.id);
        }

        // 9. Delete Amenity Bookings
        const bookings = await serviceRole.entities.AmenityBooking.filter({ building_id: buildingId });
        for (const booking of bookings) {
            await serviceRole.entities.AmenityBooking.delete(booking.id);
        }

        // 10. Delete Visitor Logs
        const visitors = await serviceRole.entities.VisitorLog.filter({ building_id: buildingId });
        for (const visitor of visitors) {
            await serviceRole.entities.VisitorLog.delete(visitor.id);
        }

        // 11. Delete Smart Device Integrations
        const devices = await serviceRole.entities.SmartDeviceIntegration.filter({ building_id: buildingId });
        for (const device of devices) {
            await serviceRole.entities.SmartDeviceIntegration.delete(device.id);
        }

        // 12. Delete Important Numbers
        const numbers = await serviceRole.entities.ImportantNumber.filter({ building_id: buildingId });
        for (const number of numbers) {
            await serviceRole.entities.ImportantNumber.delete(number.id);
        }

        // 13. Finally, delete the Building itself
        await serviceRole.entities.Building.delete(buildingId);

        return Response.json({ 
            success: true,
            message: 'Building and all associated data deleted successfully'
        });

    } catch (error) {
        return Response.json({ 
            error: error.message || 'Failed to delete building'
        }, { status: 500 });
    }
});