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
                description: "Official registration number (e.g., L6-245232-20)"
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
                description: "Type of lift (Goods/Passenger, Passenger only, etc.)"
              },
              control_type: {
                type: "string",
                description: "Control type (Automatic, Manual, etc.)"
              },
              drive_suspension_type: {
                type: "string",
                description: "Drive and suspension type (Electric/Traction, Hydraulic, etc.)"
              },
              carriage_type: {
                type: "string",
                description: "Carriage type"
              },
              rated_load_kg: {
                type: "number",
                description: "Rated load in kilograms"
              },
              max_passengers: {
                type: "number",
                description: "Maximum number of passengers"
              },
              travel_m: {
                type: "number",
                description: "Travel distance in meters"
              },
              designer_rated_speed: {
                type: "number",
                description: "Designer's rated speed in m/s"
              },
              manufacturer: {
                type: "string",
                description: "Manufacturer name (e.g., OTIS ELEVATOR COMPANY PTY LTD)"
              },
              model_name: {
                type: "string",
                description: "Model name or number"
              },
              year_of_manufacture: {
                type: "number",
                description: "Year of manufacture"
              },
              serial_number: {
                type: "string",
                description: "Serial number (e.g., 31NF8510)"
              },
              design_registration_number: {
                type: "string",
                description: "Design registration number (e.g., LEM6-221171/18)"
              },
              plant_location: {
                type: "string",
                description: "Fixed plant location address"
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
- Item registration number (e.g., L6-245232-20)
- Registration numbers and plant numbers
- Issue date and MOST IMPORTANTLY the expiry/renewal date
- Next inspection date if mentioned
- Certifying body and inspector details
- Lift specifications including:
  * Type of lift (Goods/Passenger, Passenger only, etc.)
  * Control type (Automatic, Manual, etc.)
  * Drive and suspension type (Electric/Traction, Hydraulic, etc.)
  * Carriage type
  * Rated load in kg
  * Maximum number of passengers
  * Travel distance in meters
  * Designer's rated speed in m/s
- Manufacturer details (company name, model, year of manufacture, serial number)
- Design registration number
- Plant location (fixed address)
- Any conditions or compliance notes

CRITICAL: Make sure to extract the expiry date accurately as this will be used for automated renewal reminders.
Extract ALL technical plant item details as these are crucial for asset management and compliance tracking.

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