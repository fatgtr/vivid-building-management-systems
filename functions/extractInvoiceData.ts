import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { file_url, document_id } = await req.json();

        if (!file_url) {
            return Response.json({ error: 'file_url is required' }, { status: 400 });
        }

        // Extract financial data from invoice using AI
        const extractedData = await base44.integrations.Core.InvokeLLM({
            prompt: `Analyze this invoice or financial statement and extract all key financial information.
            
            Extract:
            - Invoice number and date
            - Vendor/supplier name and details
            - Line items with descriptions, quantities, and amounts
            - Subtotal, tax (GST), and total amounts
            - Payment terms and due date
            - Any discount or special conditions
            - Bank account details if present
            
            Be thorough and accurate. If a field is not found, set it to null.`,
            file_urls: [file_url],
            response_json_schema: {
                type: "object",
                properties: {
                    invoice_number: { type: "string" },
                    invoice_date: { type: "string" },
                    due_date: { type: "string" },
                    vendor_name: { type: "string" },
                    vendor_abn: { type: "string" },
                    vendor_address: { type: "string" },
                    vendor_email: { type: "string" },
                    vendor_phone: { type: "string" },
                    line_items: {
                        type: "array",
                        items: {
                            type: "object",
                            properties: {
                                description: { type: "string" },
                                quantity: { type: "number" },
                                unit_price: { type: "number" },
                                amount: { type: "number" }
                            }
                        }
                    },
                    subtotal: { type: "number" },
                    tax_amount: { type: "number" },
                    total_amount: { type: "number" },
                    payment_terms: { type: "string" },
                    bank_account_name: { type: "string" },
                    bank_bsb: { type: "string" },
                    bank_account_number: { type: "string" },
                    notes: { type: "string" },
                    payment_status: { 
                        type: "string",
                        enum: ["pending", "paid", "overdue", "unknown"]
                    }
                }
            }
        });

        // Update document with extracted data if document_id provided
        if (document_id) {
            await base44.entities.Document.update(document_id, {
                extracted_invoice_data: extractedData,
                ai_processed: true,
                ai_processed_date: new Date().toISOString()
            });
        }

        return Response.json({
            success: true,
            data: extractedData,
            message: 'Financial data extracted successfully'
        });

    } catch (error) {
        console.error('Error extracting invoice data:', error);
        return Response.json({ 
            error: error.message,
            success: false
        }, { status: 500 });
    }
});