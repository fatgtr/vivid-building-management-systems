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

        // Extract meter details from photo using vision-capable LLM.
        // Handles electricity, gas and water meters.
        const extracted = await base44.integrations.Core.InvokeLLM({
            prompt: `You are an OCR assistant for Australian utility meters.
Analyze this photo of a utility meter installation and extract the following details.

First, identify the METER TYPE: one of "electricity", "gas", or "water".

Then extract every field you can read:

UNIT NUMBER:
- For electricity meters: usually a small sticker ABOVE the meter, often "APT <number>" (e.g. "APT 1003" → "1003").
- For gas/water meters: may be handwritten on the mounting bracket/pipe, printed on a tag, or on a sticker. Return just the identifier (e.g. "902").
- Return digits/identifier only, no label words.

NMI NUMBER (electricity only): the National Meter Identifier, 10-11 digits printed under "NMI" (often on an ActiveStream label). Gas/water meters have no NMI — return null.

METER MODEL: the model name (e.g. "ATLAS Mk7C", "BK-G1.6M").

METER SERIAL: the serial / barcode / S/N number on the meter (e.g. "700587326", "QR130106").

METER READING: the current registered consumption shown on the display/dials, as a number. For gas meters use the main index reading (e.g. "00224.45" → "224.45"). Return the numeric value only.

READING UNIT: the unit of the reading (e.g. "kWh", "m³", "L"). Null if not visible.

MANUFACTURER: the maker if printed (e.g. "EDMI", "Honeywell", "Elster").

Rules:
- Only return values you can clearly read. If a field is not visible or illegible, return null.
- Never guess or fabricate numbers.
- For numbers, return digits only (strip spaces; keep a single decimal point for readings).`,
            file_urls: [file_url],
            response_json_schema: {
                type: "object",
                properties: {
                    meter_type: { type: "string", enum: ["electricity", "gas", "water", "hot_water", "unknown"] },
                    unit_number: { type: "string" },
                    nmi_number: { type: "string" },
                    meter_model: { type: "string" },
                    meter_serial: { type: "string" },
                    meter_reading: { type: "number" },
                    reading_unit: { type: "string" },
                    manufacturer: { type: "string" }
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