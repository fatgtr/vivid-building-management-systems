import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { file_url } = await req.json();
    if (!file_url) {
      return Response.json({ success: false, error: 'Missing required parameter: file_url' }, { status: 400 });
    }

    // 1. Fetch the PDF and extract its text (fast, non-LLM)
    const pdfResp = await fetch(file_url);
    if (!pdfResp.ok) {
      return Response.json({ success: false, error: 'Failed to download PDF' }, { status: 502 });
    }
    const buf = new Uint8Array(await pdfResp.arrayBuffer());

    let text = '';
    try {
      const mod: any = await import('npm:unpdf@0.11.0');
      const result = await mod.extractText(buf, { mergePages: true });
      text = result.text || '';
    } catch (e) {
      console.error('unpdf extractText failed:', e);
      return Response.json({
        success: false,
        error: 'Could not extract text from this PDF. Try a text-based (not scanned) AS 2293.1 register.'
      }, { status: 422 });
    }

    if (!text.trim()) {
      return Response.json({
        success: false,
        error: 'No extractable text found in the PDF. It may be a scanned image.'
      }, { status: 422 });
    }

    // 2. Fast text-only LLM extraction
    const extractionSchema = {
      type: 'object',
      properties: {
        contractor: {
          type: 'object',
          properties: {
            company: { type: 'string', description: 'Contracting company name (e.g., AFT Fire Protection)' },
            contact_name: { type: 'string', description: 'Contact name if present' },
            phone: { type: 'string' },
            abn: { type: 'string' },
            job_number: { type: 'string', description: 'Job number from the document header' }
          }
        },
        inspection_date: { type: 'string', description: 'Primary inspection date in yyyy-mm-dd format' },
        building_name: { type: 'string' },
        building_address: { type: 'string' },
        fittings: {
          type: 'array',
          description: 'Every emergency/exit lighting fitting row in the register',
          items: {
            type: 'object',
            properties: {
              asset_id: { type: 'string', description: 'Asset ID column value (e.g., 170882)' },
              fitting_number: { type: 'string', description: 'Fitting No. column value (e.g., 4.1, FS1)' },
              building_and_level: { type: 'string', description: 'Building & Level column (e.g., "Palermo -Level 4")' },
              building_part: { type: 'string', description: 'Building name portion (e.g., "Palermo")' },
              level: { type: 'string', description: 'Level portion (e.g., "Level 4", "Level Ground")' },
              location: { type: 'string', description: 'Location column (e.g., "Adj U124", "Adj F/S")' },
              fitting_type: { type: 'string', description: 'Raw Fitting Type text (e.g., "Emergency Spitfire (Recessed)")' },
              fitting_type_code: {
                type: 'string',
                enum: ['emergency_spitfire_recessed', 'emergency_spitfire_surface', 'emergency_4ft_weatherproof', 'emergency_2ft_weatherproof', 'exit_quickfit', 'exit_weatherproof', 'other'],
                description: 'Normalised fitting type code from the controlled vocabulary'
              },
              is_exit_sign: { type: 'boolean', description: 'True if this is an exit sign, false if an emergency light' },
              inspection_date: { type: 'string', description: 'Row inspection date in yyyy-mm-dd format' },
              service_interval: { type: 'string', description: 'Service interval text (e.g., "6 Monthly")' },
              result: { type: 'string', enum: ['Pass', 'Fail'], description: 'Pass/Fail column value' },
              failure_points: { type: 'string', description: 'Failure Points / Recommendation text for failed rows; empty string if passed' }
            },
            required: ['asset_id', 'fitting_number', 'location', 'fitting_type', 'fitting_type_code', 'is_exit_sign', 'result']
          }
        }
      },
      required: ['fittings']
    };

    const prompt = `You are analyzing the extracted text of an AS 2293.1 Emergency and Exit Lighting asset register (typically produced by a fire protection contractor such as AFT Fire Protection).

The text contains one or more tables titled "Asset Register - Emergency and Exit Lighting - AS2293.1" with columns:
- Asset ID (a number, e.g. 170882)
- Fitting No. (e.g. 4.1, 3.2, FS1, G3)
- Building & Level (e.g. "Palermo -Level 4", "Milano - Level Ground")
- Location (e.g. "Adj U124", "Adj F/S", "Walkway to U116", "Fire Stairs")
- Fitting Type (e.g. "Emergency Spitfire (Recessed)", "Emergency Spitfire (Surface)", "Emergency 4 foot (weatherproof)", "Emergency 2 foot (weatherproof)", "Exit Quickfit", "Exit weatherproof")
- Date (inspection date for that row)
- Service (e.g. "6 Monthly")
- Pass / Fail
- Failure Points (a sub-line under failed fittings with the recommendation, e.g. "EXIT LIGHT – failed the 90-minute discharge test or defective/damaged Recommendation: * Quick fit exit light - replace")

Extract EVERY fitting row as one entry in the fittings array. For each fitting:
- Set asset_id, fitting_number, building_and_level, building_part (building name before the hyphen), level (level text after the hyphen), location, fitting_type (raw text).
- Map fitting_type to fitting_type_code: "Emergency Spitfire (Recessed)" -> emergency_spitfire_recessed; "Emergency Spitfire (Surface)" -> emergency_spitfire_surface; "Emergency 4 foot (weatherproof)" -> emergency_4ft_weatherproof; "Emergency 2 foot (weatherproof)" -> emergency_2ft_weatherproof; "Exit Quickfit" -> exit_quickfit; "Exit weatherproof" -> exit_weatherproof; anything else -> other.
- Set is_exit_sign true for exit signs (Exit Quickfit, Exit weatherproof), false for emergency lights.
- Set result to "Pass" or "Fail" exactly as shown.
- For failed rows, set failure_points to the full Failure Points / Recommendation text found on the line(s) beneath that fitting (often prefixed "Failure Points"). For passed rows, set failure_points to an empty string.
- Convert ALL dates to ISO yyyy-mm-dd format. Source dates appear as dd/mm/yyyy (Australian) — convert 07/11/2022 to 2022-11-07.

Also extract the contractor block (company, contact_name, phone, abn, job_number) and the overall inspection_date from the document header.

Be exhaustive: capture every fitting row across all pages and all buildings/levels in the register.

REGISTER TEXT BEGINS:
${text}`;

    const extracted: any = await base44.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: extractionSchema
    });

    return Response.json({ success: true, data: extracted });
  } catch (error) {
    console.error('Emergency lighting register extraction error:', error);
    return Response.json({
      success: false,
      error: error.message || 'Failed to extract emergency lighting register'
    }, { status: 500 });
  }
}