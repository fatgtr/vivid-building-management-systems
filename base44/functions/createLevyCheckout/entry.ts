import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import Stripe from 'npm:stripe@17.5.0';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'), {
  apiVersion: '2024-12-18.acacia'
});

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { levyId, successUrl, cancelUrl } = await req.json();

    // Get levy payment details
    const levy = await base44.asServiceRole.entities.LevyPayment.get(levyId);
    if (!levy) {
      return Response.json({ error: 'Levy payment not found' }, { status: 404 });
    }

    // Get building details
    const building = await base44.asServiceRole.entities.Building.get(levy.building_id);

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'aud',
            product_data: {
              name: `Strata Levy - ${levy.period}`,
              description: `${building?.name || 'Building'} - Unit ${levy.unit_id || 'N/A'}`,
            },
            unit_amount: Math.round(levy.amount * 100), // Convert to cents
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: successUrl || `${req.headers.get('origin')}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: cancelUrl || `${req.headers.get('origin')}/cancel`,
      metadata: {
        base44_app_id: Deno.env.get('BASE44_APP_ID'),
        levy_id: levyId,
        building_id: levy.building_id,
        unit_id: levy.unit_id || '',
        type: 'levy_payment'
      },
      customer_email: levy.resident_email || undefined
    });

    // Update levy with payment intent
    await base44.asServiceRole.entities.LevyPayment.update(levyId, {
      stripe_payment_intent_id: session.id,
      status: 'pending'
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