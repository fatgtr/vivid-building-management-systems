import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { bookingId } = await req.json();

    const booking = await base44.asServiceRole.entities.AmenityBooking.get(bookingId);
    const amenity = await base44.asServiceRole.entities.Amenity.get(booking.amenity_id);
    const building = await base44.asServiceRole.entities.Building.get(booking.building_id);
    
    const resident = await base44.asServiceRole.entities.Resident.get(booking.resident_id);

    const emailBody = `
      <h2>Booking Confirmation</h2>
      <p>Dear ${booking.resident_name},</p>
      <p>Your booking has been confirmed!</p>
      
      <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3>${amenity.name}</h3>
        <p><strong>Building:</strong> ${building.name}</p>
        <p><strong>Date:</strong> ${booking.booking_date}</p>
        <p><strong>Time:</strong> ${booking.start_time} - ${booking.end_time}</p>
        ${booking.guests ? `<p><strong>Guests:</strong> ${booking.guests}</p>` : ''}
        ${amenity.booking_fee > 0 ? `<p><strong>Fee:</strong> $${amenity.booking_fee}</p>` : ''}
      </div>
      
      ${amenity.rules ? `
        <div style="background: #eff6ff; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <h4>Important Rules & Guidelines:</h4>
          <p>${amenity.rules}</p>
        </div>
      ` : ''}
      
      ${amenity.booking_fee > 0 && !booking.fee_paid ? `
        <p><strong>Payment Required:</strong> Please complete payment of $${amenity.booking_fee} before your booking date.</p>
      ` : ''}
      
      <p>If you need to cancel or modify your booking, please contact building management.</p>
      <p>Best regards,<br>${building.name} Management</p>
    `;

    await base44.asServiceRole.integrations.Core.SendEmail({
      to: resident.email,
      subject: `Booking Confirmed - ${amenity.name}`,
      body: emailBody
    });

    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});