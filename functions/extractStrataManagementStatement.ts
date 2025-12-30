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

    // Define the JSON schema for strata management statement extraction
    const managementSchema = {
      type: "object",
      properties: {
        management_items: {
          type: "array",
          items: {
            type: "object",
            properties: {
              info_type: {
                type: "string",
                enum: ["committee_structure", "meeting_requirements", "levy_structure", "insurance", "maintenance_responsibilities", "service_contracts", "financial_reporting", "dispute_resolution", "voting_procedures", "proxy_rules", "other"]
              },
              title: { type: "string" },
              description: { type: "string" },
              requirements: { type: "string" },
              frequency: { type: "string" },
              responsible_party: { type: "string" },
              notes: { type: "string" },
              effective_date: { type: "string" }
            },
            required: ["info_type", "title", "description"]
          }
        },
        summary: { type: "string" }
      },
      required: ["management_items"]
    };

    // Extract data using LLM
    const extractionPrompt = `
You are analyzing a Strata Management Statement document. Extract all management structure, responsibilities, and requirements.

For each item, identify:
- The type (committee_structure, meeting_requirements, levy_structure, insurance, maintenance_responsibilities, service_contracts, financial_reporting, dispute_resolution, voting_procedures, proxy_rules, or other)
- A clear title
- Detailed description
- Specific requirements or obligations
- Frequency if applicable (e.g., annually, quarterly, monthly)
- Who is responsible
- Any additional notes
- Effective date if mentioned

Extract all management-related information comprehensively, including:
- Committee composition and roles
- Meeting frequency and requirements
- Levy structures (admin fund, sinking fund)
- Insurance requirements
- Maintenance responsibilities
- Service contract details
- Financial reporting requirements
- Dispute resolution procedures
- Voting procedures and quorum requirements
- Proxy rules
`;

    const result = await base44.integrations.Core.InvokeLLM({
      prompt: extractionPrompt,
      file_urls: [file_url],
      response_json_schema: managementSchema
    });

    // Return the extracted data
    return Response.json({
      success: true,
      data: result,
      building_id,
      document_id
    });

  } catch (error) {
    console.error('Strata management extraction error:', error);
    return Response.json({ 
      success: false,
      error: error.message 
    }, { status: 500 });
  }
});