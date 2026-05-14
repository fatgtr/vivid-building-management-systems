import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { application_id, reason } = await req.json();

    if (!application_id) {
      return Response.json({ error: 'application_id required' }, { status: 400 });
    }

    // Get application
    const application = await base44.asServiceRole.entities.ContractorApplication.get(application_id);

    if (application.status !== 'pending_review') {
      return Response.json({ 
        error: 'Application is not pending review' 
      }, { status: 400 });
    }

    // Update application
    await base44.asServiceRole.entities.ContractorApplication.update(application_id, {
      status: 'rejected',
      rejection_reason: reason || 'Application did not meet requirements',
      reviewed_by: user.email,
      reviewed_at: new Date().toISOString()
    });

    // Send rejection email to contractor
    try {
      await base44.asServiceRole.integrations.Core.SendEmail({
        to: application.email,
        subject: 'Contractor Application Status Update',
        body: `
<h2>Application Status Update</h2>

<p>Hi ${application.contact_name},</p>

<p>Thank you for your interest in joining the Vivid BMS Contractor Network.</p>

<p>After careful review, we are unable to approve your application for <strong>${application.company_name}</strong> at this time.</p>

${reason ? `<p><strong>Reason:</strong> ${reason}</p>` : ''}

<p>If you believe this decision was made in error or would like to reapply in the future, please contact our support team.</p>

<p>Thank you for your understanding.</p>
        `
      });
    } catch (emailError) {
      console.error('Failed to send rejection email:', emailError);
    }

    return Response.json({ 
      success: true 
    });

  } catch (error) {
    console.error('Error rejecting contractor application:', error);
    return Response.json({ 
      error: error.message 
    }, { status: 500 });
  }
});