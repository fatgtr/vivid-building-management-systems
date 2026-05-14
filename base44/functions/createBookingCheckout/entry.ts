import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import Stripe from 'npm:stripe@17.5.0';

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY"));

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { bookingId } = await req.json();
    
    const booking = await base44.asServiceRole.entities.AmenityBooking.get(bookingId);
    const amenity = await base44.asServiceRole.entities.Amenity.get(booking.amenity_id);
    const building = await base44.asServiceRole.entities.Building.get(booking.building_id);

    if (booking.fee_paid) {
      return Response.json({ error: 'Booking already paid' }, { status: 400 });
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'usd',
          product_data: {
            name: `${amenity.name} Booking`,
            description: `${building.name} - ${booking.booking_date} ${booking.start_time}-${booking.end_time}`,
          },
          unit_amount: Math.round(amenity.booking_fee * 100),
        },
        quantity: 1,
      }],
      mode: 'payment',
      success_url: `${req.headers.get('origin')}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${req.headers.get('origin')}/amenities`,
      customer_email: user.email,
      metadata: {
        base44_app_id: Deno.env.get("BASE44_APP_ID"),
        booking_id: bookingId,
        amenity_id: amenity.id,
        building_id: building.id,
        resident_email: user.email
      }
    });

    return Response.json({ 
      sessionId: session.id,
      url: session.url 
    });
  } catch (error) {
    console.error('Checkout creation failed:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});