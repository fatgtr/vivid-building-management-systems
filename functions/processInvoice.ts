import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        try {
            await base44.auth.me();
        } catch (e) {
            // Allow unauthenticated for internal calls
        }

        const { file_url } = await req.json();

        if (!file_url) {
            return Response.json({ success: false, error: 'File URL is required' }, { status: 400 });
        }

        const jsonSchema = {
            type: "object",
            properties: {
                invoice_number: { type: "string", description: "The invoice number" },
                invoice_date: { type: "string", format: "date", description: "The date of the invoice in YYYY-MM-DD format" },
                total_amount: { type: "number", description: "The total amount due on the invoice" }
            },
            required: ["invoice_number", "invoice_date", "total_amount"]
        };

        const response = await base44.asServiceRole.integrations.Core.ExtractDataFromUploadedFile({
            file_url: file_url,
            json_schema: jsonSchema,
        });

        if (response && response.output) {
            return Response.json({ success: true, extracted_data: response.output });
        } else {
            return Response.json({ success: false, error: response.details || 'Failed to extract data from invoice' }, { status: 500 });
        }

    } catch (error) {
        console.error('Error processing invoice:', error);
        return Response.json({ success: false, error: error.message }, { status: 500 });
    }
});