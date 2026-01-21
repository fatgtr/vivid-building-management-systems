import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const { recipients, reportHTML, reportTitle, period } = await req.json();

    if (!recipients || recipients.length === 0) {
      return Response.json({ error: 'No recipients specified' }, { status: 400 });
    }

    let sentCount = 0;
    const errors = [];

    for (const email of recipients) {
      try {
        await base44.asServiceRole.integrations.Core.SendEmail({
          to: email,
          subject: `${reportTitle} - ${period}`,
          body: `
            <p>Please find your requested report attached below.</p>
            <hr style="margin: 20px 0; border: none; border-top: 1px solid #e2e8f0;" />
            ${reportHTML}
          `
        });
        sentCount++;
      } catch (error) {
        console.error(`Failed to send report to ${email}:`, error);
        errors.push({ email, error: error.message });
      }
    }

    return Response.json({ 
      success: true, 
      sent: sentCount,
      failed: errors.length,
      errors: errors.length > 0 ? errors : undefined
    });
  } catch (error) {
    console.error('Report sending failed:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});