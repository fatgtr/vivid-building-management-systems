import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { file_url, buildingId, documentId } = await req.json();

    if (!file_url || !buildingId) {
      return Response.json({ 
        success: false, 
        error: 'Missing required parameters: file_url and buildingId' 
      }, { status: 400 });
    }

    // Define the JSON schema for lift registration extraction
    const registrationSchema = {
      type: "object",
      properties: {
        building_name: {
          type: "string",
          description: "Building name from the certificate"
        },
        building_address: {
          type: "string",
          description: "Building address"
        },
        lifts: {
          type: "array",
          description: "List of lifts registered in the document",
          items: {
            type: "object",
            properties: {
              lift_identifier: {
                type: "string",
                description: "Lift identifier (e.g., Lift 1, Service Lift, Lift A)"
              },
              registration_number: {
                type: "string",
                description: "Official registration number"
              },
              plant_number: {
                type: "string",
                description: "Plant/equipment number if different from registration"
              },
              issue_date: {
                type: "string",
                description: "Certificate issue date (YYYY-MM-DD format)"
              },
              expiry_date: {
                type: "string",
                description: "Certificate expiry date (YYYY-MM-DD format)"
              },
              next_inspection_date: {
                type: "string",
                description: "Next scheduled inspection date if mentioned"
              },
              certifying_body: {
                type: "string",
                description: "Name of certifying body or inspector"
              },
              inspector_name: {
                type: "string",
                description: "Inspector's name"
              },
              inspector_license: {
                type: "string",
                description: "Inspector's license number"
              },
              lift_type: {
                type: "string",
                description: "Type of lift (e.g., passenger, goods, service)"
              },
              capacity: {
                type: "string",
                description: "Lift capacity (persons or kg)"
              },
              location: {
                type: "string",
                description: "Location in building"
              },
              conditions: {
                type: "string",
                description: "Any conditions or notes on the certificate"
              },
              compliance_status: {
                type: "string",
                description: "Compliance status (compliant, requires_attention, etc.)"
              }
            },
            required: ["lift_identifier", "expiry_date"]
          }
        }
      },
      required: ["lifts"]
    };

    const prompt = `You are analyzing a lift plant registration certificate for a building.

Extract all lift registration information including:
- Each lift's identifier (Lift 1, Lift 2, Service Lift, etc.)
- Registration numbers and plant numbers
- Issue date and MOST IMPORTANTLY the expiry/renewal date
- Next inspection date if mentioned
- Certifying body and inspector details
- Lift specifications (type, capacity, location)
- Any conditions or compliance notes

CRITICAL: Make sure to extract the expiry date accurately as this will be used for automated renewal reminders.

Be thorough and extract information for ALL lifts mentioned in the certificate.`;

    const extractedData = await base44.integrations.Core.InvokeLLM({
      prompt: prompt,
      file_urls: [file_url],
      response_json_schema: registrationSchema
    });

    return Response.json({
      success: true,
      data: extractedData
    });

  } catch (error) {
    console.error('Lift registration extraction error:', error);
    return Response.json({
      success: false,
      error: error.message || 'Failed to extract lift registration data'
    }, { status: 500 });
  }
});