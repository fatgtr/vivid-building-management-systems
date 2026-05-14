import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Get tomorrow's date
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];

    // Find all approved bookings for tomorrow
    const bookings = await base44.asServiceRole.entities.AmenityBooking.filter({
      booking_date: tomorrowStr,
      status: 'approved'
    });

    let sentCount = 0;

    for (const booking of bookings) {
      try {
        const amenity = await base44.asServiceRole.entities.Amenity.get(booking.amenity_id);
        const building = await base44.asServiceRole.entities.Building.get(booking.building_id);
        const resident = await base44.asServiceRole.entities.Resident.get(booking.resident_id);

        const emailBody = `
          <h2>Booking Reminder</h2>
          <p>Dear ${booking.resident_name},</p>
          <p>This is a reminder about your upcoming amenity booking tomorrow.</p>
          
          <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3>${amenity.name}</h3>
            <p><strong>Building:</strong> ${building.name}</p>
            <p><strong>Date:</strong> ${booking.booking_date}</p>
            <p><strong>Time:</strong> ${booking.start_time} - ${booking.end_time}</p>
            ${amenity.location ? `<p><strong>Location:</strong> ${amenity.location}</p>` : ''}
          </div>
          
          ${amenity.booking_fee > 0 && !booking.fee_paid ? `
            <div style="background: #fef2f2; padding: 15px; border-radius: 8px; border-left: 4px solid #ef4444; margin: 20px 0;">
              <p><strong>⚠️ Payment Required:</strong> Your booking fee of $${amenity.booking_fee} is still pending. Please complete payment before your booking.</p>
            </div>
          ` : ''}
          
          <p>We look forward to seeing you!</p>
          <p>Best regards,<br>${building.name} Management</p>
        `;

        await base44.asServiceRole.integrations.Core.SendEmail({
          to: resident.email,
          subject: `Reminder: ${amenity.name} booking tomorrow`,
          body: emailBody
        });

        sentCount++;
      } catch (error) {
        console.error(`Failed to send reminder for booking ${booking.id}:`, error);
      }
    }

    return Response.json({ 
      success: true, 
      remindersSent: sentCount,
      bookingsChecked: bookings.length 
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});