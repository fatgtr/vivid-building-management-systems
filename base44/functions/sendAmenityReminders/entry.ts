import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Get all approved bookings
    const bookings = await base44.asServiceRole.entities.AmenityBooking.filter({ 
      status: 'approved' 
    });

    // Get all amenities
    const amenities = await base44.asServiceRole.entities.Amenity.list();

    // Get all buildings
    const buildings = await base44.asServiceRole.entities.Building.list();

    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(23, 59, 59, 999);

    let remindersSent = 0;

    for (const booking of bookings) {
      const bookingDate = new Date(booking.booking_date);
      
      // Check if booking is within next 24 hours
      if (bookingDate > now && bookingDate <= tomorrow) {
        const amenity = amenities.find(a => a.id === booking.amenity_id);
        const building = buildings.find(b => b.id === booking.building_id);

        if (!amenity || !booking.resident_name) continue;

        // Calculate hours until booking
        const hoursUntil = Math.round((bookingDate - now) / (1000 * 60 * 60));

        try {
          // Send reminder email (if resident has email)
          if (booking.resident_email) {
            await base44.asServiceRole.integrations.Core.SendEmail({
              to: booking.resident_email,
              subject: `Reminder: Your ${amenity.name} Booking Tomorrow`,
              body: `
Dear ${booking.resident_name},

This is a friendly reminder about your upcoming amenity booking:

📅 Amenity: ${amenity.name}
🏢 Building: ${building?.name || 'Your Building'}
📍 Location: ${amenity.location || 'See building directory'}
🕐 Date: ${bookingDate.toLocaleDateString()}
⏰ Time: ${booking.start_time} - ${booking.end_time}
${booking.guests ? `👥 Guests: ${booking.guests}` : ''}
${booking.purpose ? `📝 Purpose: ${booking.purpose}` : ''}

${amenity.rules ? `\n⚠️ Important Rules:\n${amenity.rules}\n` : ''}

${amenity.booking_fee > 0 ? `💵 Booking Fee: $${amenity.booking_fee}` : ''}

If you need to cancel or modify your booking, please contact building management as soon as possible.

We hope you enjoy your time at ${amenity.name}!

Best regards,
${building?.name || 'Building'} Management Team
              `.trim()
            });
          }

          // Create in-app notification
          await base44.asServiceRole.entities.Notification.create({
            recipient_email: booking.resident_email || booking.resident_name,
            title: `Upcoming Booking: ${amenity.name}`,
            message: `Your booking for ${amenity.name} is scheduled for ${bookingDate.toLocaleDateString()} at ${booking.start_time}`,
            type: 'announcement',
            priority: 'medium',
            building_id: booking.building_id,
            link_url: `/amenities?building_id=${booking.building_id}`,
            link_text: 'View Amenities',
            reference_id: booking.id,
            reference_type: 'amenity_booking',
          });

          remindersSent++;
        } catch (emailError) {
          console.error(`Failed to send reminder for booking ${booking.id}:`, emailError);
        }
      }
    }

    return Response.json({ 
      success: true, 
      remindersSent,
      message: `Sent ${remindersSent} amenity booking reminders` 
    });
  } catch (error) {
    console.error('Error sending amenity reminders:', error);
    return Response.json({ 
      error: error.message 
    }, { status: 500 });
  }
});