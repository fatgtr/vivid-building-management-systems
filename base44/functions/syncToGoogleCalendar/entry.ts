import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const { bookingId } = await req.json();
    
    const booking = await base44.asServiceRole.entities.AmenityBooking.get(bookingId);
    const amenity = await base44.asServiceRole.entities.Amenity.get(booking.amenity_id);
    const building = await base44.asServiceRole.entities.Building.get(booking.building_id);

    // Get Google Calendar access token
    const accessToken = await base44.asServiceRole.connectors.getAccessToken("googlecalendar");
    
    // Create calendar event
    const eventData = {
      summary: `${amenity.name} - ${booking.resident_name}`,
      description: `Booking for ${amenity.name}\n\nResident: ${booking.resident_name}\nUnit: ${booking.unit_number || 'N/A'}\nGuests: ${booking.guests || 0}\n\nPurpose: ${booking.purpose || 'N/A'}\n\nBuilding: ${building.name}`,
      location: `${building.address}, ${amenity.location || ''}`,
      start: {
        dateTime: `${booking.booking_date}T${booking.start_time}:00`,
        timeZone: 'UTC'
      },
      end: {
        dateTime: `${booking.booking_date}T${booking.end_time}:00`,
        timeZone: 'UTC'
      },
      attendees: booking.resident_email ? [{ email: booking.resident_email }] : [],
      reminders: {
        useDefault: false,
        overrides: [
          { method: 'email', minutes: 24 * 60 },
          { method: 'popup', minutes: 60 }
        ]
      }
    };

    const response = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(eventData)
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Google Calendar API error: ${error}`);
    }

    const event = await response.json();

    // Update booking with calendar event ID
    await base44.asServiceRole.entities.AmenityBooking.update(bookingId, {
      calendar_event_id: event.id
    });

    return Response.json({ 
      success: true, 
      eventId: event.id,
      eventLink: event.htmlLink 
    });
  } catch (error) {
    console.error('Calendar sync failed:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});