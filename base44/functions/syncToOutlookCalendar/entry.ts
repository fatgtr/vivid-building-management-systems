import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

async function getValidAccessToken(base44, user) {
  if (!user.outlook_refresh_token) {
    throw new Error('No Outlook refresh token available');
  }

  // Check if token is expired
  const expiryDate = new Date(user.outlook_token_expiry);
  if (expiryDate > new Date()) {
    return user.outlook_access_token;
  }

  // Refresh the token
  const tokenResponse = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: Deno.env.get('MICROSOFT_CLIENT_ID'),
      client_secret: Deno.env.get('MICROSOFT_CLIENT_SECRET'),
      refresh_token: user.outlook_refresh_token,
      grant_type: 'refresh_token',
      scope: 'Calendars.ReadWrite offline_access'
    })
  });

  if (!tokenResponse.ok) {
    throw new Error('Failed to refresh Outlook token');
  }

  const tokens = await tokenResponse.json();
  
  await base44.auth.updateMe({
    outlook_access_token: tokens.access_token,
    outlook_refresh_token: tokens.refresh_token,
    outlook_token_expiry: new Date(Date.now() + tokens.expires_in * 1000).toISOString()
  });

  return tokens.access_token;
}

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

    const accessToken = await getValidAccessToken(base44, user);
    
    // Create Outlook calendar event
    const eventData = {
      subject: `${amenity.name} - ${booking.resident_name}`,
      body: {
        contentType: 'HTML',
        content: `
          <h3>Amenity Booking</h3>
          <p><strong>Amenity:</strong> ${amenity.name}</p>
          <p><strong>Resident:</strong> ${booking.resident_name}</p>
          ${booking.unit_number ? `<p><strong>Unit:</strong> ${booking.unit_number}</p>` : ''}
          ${booking.guests ? `<p><strong>Guests:</strong> ${booking.guests}</p>` : ''}
          ${booking.purpose ? `<p><strong>Purpose:</strong> ${booking.purpose}</p>` : ''}
          <p><strong>Building:</strong> ${building.name}</p>
        `
      },
      start: {
        dateTime: `${booking.booking_date}T${booking.start_time}:00`,
        timeZone: 'UTC'
      },
      end: {
        dateTime: `${booking.booking_date}T${booking.end_time}:00`,
        timeZone: 'UTC'
      },
      location: {
        displayName: `${building.address}${amenity.location ? ', ' + amenity.location : ''}`
      },
      attendees: booking.resident_email ? [{
        emailAddress: { address: booking.resident_email, name: booking.resident_name },
        type: 'required'
      }] : [],
      isReminderOn: true,
      reminderMinutesBeforeStart: 1440
    };

    const response = await fetch('https://graph.microsoft.com/v1.0/me/events', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(eventData)
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('Outlook Calendar API error:', error);
      throw new Error(`Outlook Calendar API error: ${error}`);
    }

    const event = await response.json();

    // Update booking with Outlook event ID
    await base44.asServiceRole.entities.AmenityBooking.update(bookingId, {
      outlook_event_id: event.id
    });

    return Response.json({ 
      success: true, 
      eventId: event.id,
      eventLink: event.webLink 
    });
  } catch (error) {
    console.error('Outlook calendar sync failed:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});