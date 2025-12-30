import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { file_url, building_id, document_id } = await req.json();

    if (!file_url || !building_id) {
      return Response.json({ error: 'file_url and building_id are required' }, { status: 400 });
    }

    // Define the JSON schema for bylaw extraction
    const bylawSchema = {
      type: "object",
      properties: {
        bylaws: {
          type: "array",
          items: {
            type: "object",
            properties: {
              bylaw_type: {
                type: "string",
                enum: ["pets", "parking", "noise", "renovations", "rental", "common_property", "balcony_outdoor", "waste_disposal", "storage", "conduct", "amenity_usage", "other"]
              },
              title: { type: "string" },
              description: { type: "string" },
              restrictions: { type: "string" },
              penalties: { type: "string" },
              effective_date: { type: "string" },
              amended_date: { type: "string" },
              amendment_notes: { type: "string" }
            },
            required: ["bylaw_type", "title", "description"]
          }
        },
        summary: { type: "string" }
      },
      required: ["bylaws"]
    };

    // Extract data using LLM
    const extractionPrompt = `
You are analyzing a building's bylaws document. Extract all bylaws and rules from this document.

For each bylaw, identify:
- The type/category (pets, parking, noise, renovations, rental, common_property, balcony_outdoor, waste_disposal, storage, conduct, amenity_usage, or other)
- A clear title
- Detailed description of the bylaw
- Specific restrictions or requirements
- Any penalties for non-compliance
- Effective date if mentioned
- Amendment dates if mentioned
- Notes about amendments

Be comprehensive and extract all bylaws. Group related rules together logically.
`;

    const result = await base44.integrations.Core.InvokeLLM({
      prompt: extractionPrompt,
      file_urls: [file_url],
      response_json_schema: bylawSchema
    });

    // Return the extracted data
    return Response.json({
      success: true,
      data: result,
      building_id,
      document_id
    });

  } catch (error) {
    console.error('Bylaw extraction error:', error);
    return Response.json({ 
      success: false,
      error: error.message 
    }, { status: 500 });
  }
});