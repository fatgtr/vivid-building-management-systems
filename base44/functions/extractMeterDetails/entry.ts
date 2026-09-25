import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { file_url } = await req.json();

        if (!file_url) {
            return Response.json({ error: 'file_url is required' }, { status: 400 });
        }

        // Extract meter details from photo using vision-capable LLM
        const extracted = await base44.integrations.Core.InvokeLLM({
            prompt: `You are an OCR assistant for Australian electricity meters.
Analyze this photo of an electrical meter installation and extract the following identifiers.

Look specifically for:
1. UNIT NUMBER — Usually printed on a small sticker/label ABOVE the meter, often formatted as "APT <number>" (e.g. "APT 1003"). Return just the number portion (e.g. "1003"). If the label shows a full apartment reference, return it verbatim.
2. NMI NUMBER — The National Meter Identifier, a 10 or 11-digit number printed on a label marked "NMI" (often on an ActiveStream sticker below the meter, e.g. "4104045429"). Return only the digits.
3. METER MODEL — The meter model (e.g. "ATLAS Mk7C"), if visible.
4. METER SERIAL — The serial/barcode number on the meter faceplate, if visible.

Rules:
- Only return values you can clearly read in the image. If something is not visible or illegible, return null for that field.
- Do NOT guess or fabricate numbers.
- Return digits only for NMI and unit number (strip spaces/dashes).`,
            file_urls: [file_url],
            response_json_schema: {
                type: "object",
                properties: {
                    unit_number: { type: "string" },
                    nmi_number: { type: "string" },
                    meter_model: { type: "string" },
                    meter_serial: { type: "string" }
                }
            }
        });

        return Response.json({
            success: true,
            data: extracted,
            message: 'Meter details extracted successfully'
        });

    } catch (error) {
        console.error('Error extracting meter details:', error);
        return Response.json({
            error: error.message,
            success: false
        }, { status: 500 });
    }
});