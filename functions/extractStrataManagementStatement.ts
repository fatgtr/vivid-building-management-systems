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
                enum: ["committee_structure", "meeting_requirements", "levy_structure", "insurance", "maintenance_responsibilities", "service_contracts", "financial_reporting", "dispute_resolution", "voting_procedures", "proxy_rules", "shared_facility_schedule", "other"]
              },
              title: { type: "string" },
              description: { type: "string" },
              item_number: { type: "string" },
              shared_facility_name: { type: "string" },
              shared_facility_description: { type: "string" },
              member_benefit: { type: "string" },
              facility_location: { type: "string" },
              requirements: { type: "string" },
              frequency: { type: "string" },
              responsible_party: { type: "string" },
              notes: { type: "string" },
              effective_date: { type: "string" }
            },
            required: ["info_type", "title"]
          }
        },
        summary: { type: "string" }
      },
      required: ["management_items"]
    };

    // Extract data using LLM
    const extractionPrompt = `
You are analyzing a Strata Management Statement document. Extract all management structure, responsibilities, and requirements.

CRITICAL: Pay special attention to "Schedule 1: List of Shared Facilities" and "Schedule 2" (if it relates to shared facilities).

For general management items, identify:
- The type (committee_structure, meeting_requirements, levy_structure, insurance, maintenance_responsibilities, service_contracts, financial_reporting, dispute_resolution, voting_procedures, proxy_rules, or other)
- A clear title
- Detailed description
- Specific requirements or obligations
- Frequency if applicable (e.g., annually, quarterly, monthly)
- Who is responsible
- Any additional notes
- Effective date if mentioned

For items within "Schedule 1: List of Shared Facilities" and "Schedule 2" (if related to shared facilities), use 'info_type: "shared_facility_schedule"' and extract:
- item_number: The item number from the schedule (e.g., "1", "8", "12")
- title: Use the shared facility name as the title
- shared_facility_name: The name of the shared facility
- shared_facility_description: A description of the shared facility
- member_benefit: The member benefit related to this facility (may be "N/A" or specific benefit)
- facility_location: The physical location of the shared facility (e.g., "Level B5", "Throughout site", "Members, Engineers, Office Level B5")
- description: A combined summary of the facility details

For facilities marked "N/A" in location or member benefit, still include them and mark those fields as "N/A".

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
- ALL shared facilities from Schedule 1 and Schedule 2 with complete details
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