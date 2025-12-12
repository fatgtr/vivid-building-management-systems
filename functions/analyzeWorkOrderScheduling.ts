import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { workOrderId } = await req.json();

    if (!workOrderId) {
      return Response.json({ error: 'workOrderId is required' }, { status: 400 });
    }

    // Get work order details
    const workOrders = await base44.asServiceRole.entities.WorkOrder.filter({ id: workOrderId });
    const workOrder = workOrders[0];

    if (!workOrder) {
      return Response.json({ error: 'Work order not found' }, { status: 404 });
    }

    // Get related data
    const [allWorkOrders, amenityBookings, leaseAnalyses] = await Promise.all([
      base44.asServiceRole.entities.WorkOrder.filter({ 
        building_id: workOrder.building_id,
        status: { $in: ['open', 'in_progress'] }
      }),
      base44.asServiceRole.entities.AmenityBooking.filter({ 
        building_id: workOrder.building_id,
        status: { $in: ['approved', 'pending'] }
      }),
      base44.asServiceRole.entities.LeaseAnalysis.list()
    ]);

    // Get unit info if available
    let unitInfo = null;
    if (workOrder.unit_id) {
      const units = await base44.asServiceRole.entities.Unit.filter({ id: workOrder.unit_id });
      unitInfo = units[0];
    }

    // Prepare context for AI
    const context = {
      workOrder: {
        id: workOrder.id,
        title: workOrder.title,
        description: workOrder.description,
        category: workOrder.category,
        priority: workOrder.priority,
        unit_id: workOrder.unit_id,
        due_date: workOrder.due_date
      },
      otherWorkOrders: allWorkOrders.filter(wo => wo.id !== workOrder.id).map(wo => ({
        title: wo.title,
        category: wo.category,
        priority: wo.priority,
        status: wo.status,
        unit_id: wo.unit_id,
        due_date: wo.due_date
      })),
      amenityBookings: amenityBookings.filter(booking => {
        if (!booking.booking_date) return false;
        const bookingDate = new Date(booking.booking_date);
        const today = new Date();
        const futureDate = new Date();
        futureDate.setDate(today.getDate() + 30);
        return bookingDate >= today && bookingDate <= futureDate;
      }).map(b => ({
        booking_date: b.booking_date,
        start_time: b.start_time,
        end_time: b.end_time,
        purpose: b.purpose,
        unit_number: b.unit_number
      })),
      leaseInfo: leaseAnalyses
        .filter(la => la.lease_start_date || la.lease_end_date)
        .map(la => ({
          lease_start_date: la.lease_start_date,
          lease_end_date: la.lease_end_date
        }))
    };

    const prompt = `You are a maintenance scheduling AI assistant. Analyze this work order and provide optimal scheduling recommendations.

Work Order: ${JSON.stringify(context.workOrder, null, 2)}

Other Active Work Orders: ${JSON.stringify(context.otherWorkOrders.slice(0, 10), null, 2)}

Upcoming Amenity Bookings (next 30 days): ${JSON.stringify(context.amenityBookings, null, 2)}

Active Lease Dates: ${JSON.stringify(context.leaseInfo.slice(0, 5), null, 2)}

Consider:
1. Work order priority and urgency
2. Conflicts with amenity bookings (especially move-in/out)
3. Other scheduled maintenance in the same area
4. Best time windows based on resident availability
5. Dependencies between work orders

Provide practical scheduling recommendations.`;

    const analysis = await base44.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: "object",
        properties: {
          recommended_date: { 
            type: "string", 
            description: "Recommended date in YYYY-MM-DD format"
          },
          recommended_time_window: { 
            type: "string",
            description: "Recommended time window (e.g., 9AM-12PM)"
          },
          scheduling_score: {
            type: "number",
            description: "Scheduling priority score 1-10"
          },
          conflicts: {
            type: "array",
            items: { type: "string" },
            description: "List of potential conflicts or concerns"
          },
          recommendations: {
            type: "array",
            items: { type: "string" },
            description: "3-5 specific scheduling recommendations"
          },
          alternative_dates: {
            type: "array",
            items: { type: "string" },
            description: "2-3 alternative dates in YYYY-MM-DD format"
          }
        },
        required: ["scheduling_score", "recommendations"]
      }
    });

    return Response.json(analysis);

  } catch (error) {
    console.error('Error analyzing scheduling:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});