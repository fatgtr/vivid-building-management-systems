import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import Stripe from 'npm:stripe@17.5.0';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'), {
  apiVersion: '2024-12-18.acacia'
});

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { sessionId } = await req.json();

    // Retrieve the checkout session
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (session.payment_status !== 'paid') {
      return Response.json({ error: 'Payment not completed' }, { status: 400 });
    }

    const levyId = session.metadata.levy_id;
    
    // Update levy payment status
    await base44.asServiceRole.entities.LevyPayment.update(levyId, {
      status: 'paid',
      paid_date: new Date().toISOString().split('T')[0],
      payment_method: 'stripe',
      stripe_payment_intent_id: session.payment_intent
    });

    // Send confirmation email
    const levy = await base44.asServiceRole.entities.LevyPayment.get(levyId);
    if (levy.resident_email) {
      await base44.asServiceRole.integrations.Core.SendEmail({
        to: levy.resident_email,
        subject: 'Levy Payment Confirmation',
        body: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #16a34a;">Payment Received</h2>
            <p>Your levy payment has been successfully processed.</p>
            <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <p><strong>Period:</strong> ${levy.period}</p>
              <p><strong>Amount:</strong> $${levy.amount.toFixed(2)}</p>
              <p><strong>Payment Date:</strong> ${new Date().toLocaleDateString()}</p>
              <p><strong>Payment Method:</strong> Credit Card</p>
            </div>
            <p>Thank you for your payment.</p>
          </div>
        `
      });
    }

    return Response.json({ success: true, levy });
  } catch (error) {
    console.error('Payment processing failed:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});