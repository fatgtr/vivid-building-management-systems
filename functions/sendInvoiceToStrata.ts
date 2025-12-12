import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);

        const user = await base44.auth.me();
        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { buildingId, invoiceFileUrl, workOrderTitle, invoiceNumber, totalAmount } = await req.json();

        if (!buildingId || !invoiceFileUrl || !workOrderTitle || !invoiceNumber || !totalAmount) {
            return Response.json({ success: false, error: 'Missing required parameters' }, { status: 400 });
        }

        const building = await base44.asServiceRole.entities.Building.get(buildingId);

        if (!building) {
            return Response.json({ success: false, error: 'Building not found' }, { status: 404 });
        }

        const strataInvoicingEmail = building.strata_managing_agent_invoicing_email;

        if (!strataInvoicingEmail) {
            return Response.json({ success: false, error: 'Strata managing agent invoicing email not configured for this building' }, { status: 400 });
        }

        const emailBody = `Dear Strata Manager,

This email is to inform you that work has been completed for Work Order: ${workOrderTitle} and the invoice is now ready for payment.

Invoice Number: ${invoiceNumber}
Total Amount: $${totalAmount}

Please find the invoice attached for your review and processing.

Best regards,
Property Management Team`;

        await base44.asServiceRole.integrations.Core.SendEmail({
            to: strataInvoicingEmail,
            subject: `Invoice for Work Order: ${workOrderTitle} - Ready for Payment`,
            body: emailBody,
            file_urls: [invoiceFileUrl]
        });

        return Response.json({ success: true, message: 'Invoice sent to strata managing agent' });

    } catch (error) {
        console.error('Error sending invoice to strata:', error);
        return Response.json({ success: false, error: error.message }, { status: 500 });
    }
});