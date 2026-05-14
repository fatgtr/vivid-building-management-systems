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

    // Define the JSON schema for AFSS asset extraction
    const assetSchema = {
      type: "object",
      properties: {
        document_type: {
          type: "string",
          description: "Type of AFSS document (e.g., Annual Fire Safety Statement, Fire Safety Certificate)"
        },
        building_name: {
          type: "string",
          description: "Building name from the document"
        },
        building_address: {
          type: "string",
          description: "Building address"
        },
        inspection_date: {
          type: "string",
          description: "Date of AFSS inspection"
        },
        next_inspection_date: {
          type: "string",
          description: "Next scheduled AFSS inspection date"
        },
        fire_safety_practitioner: {
          type: "object",
          properties: {
            name: { type: "string" },
            company: { type: "string" },
            license_number: { type: "string" }
          }
        },
        assets: {
          type: "array",
          description: "List of fire safety assets identified in the document",
          items: {
            type: "object",
            properties: {
              asset_type: {
                type: "string",
                description: "Type of asset (e.g., fire_extinguisher, smoke_detector, fire_panel, sprinkler_system, emergency_lighting, exit_sign, fire_door, fire_hose_reel)"
              },
              name: {
                type: "string",
                description: "Asset name or description"
              },
              identifier: {
                type: "string",
                description: "Asset ID, serial number, or tag number"
              },
              location: {
                type: "string",
                description: "Location in building (e.g., Level 1 Lobby, Basement Car Park)"
              },
              floor: {
                type: "string",
                description: "Floor or level"
              },
              manufacturer: {
                type: "string",
                description: "Manufacturer name if mentioned"
              },
              model: {
                type: "string",
                description: "Model number if mentioned"
              },
              last_service_date: {
                type: "string",
                description: "Last service/inspection date"
              },
              next_service_date: {
                type: "string",
                description: "Next service/inspection due date"
              },
              service_frequency: {
                type: "string",
                description: "Required service frequency (e.g., monthly, quarterly, yearly, half_yearly)"
              },
              compliance_status: {
                type: "string",
                description: "Compliance status (compliant, requires_attention, overdue)"
              },
              notes: {
                type: "string",
                description: "Any additional notes or observations"
              }
            },
            required: ["asset_type", "name", "location"]
          }
        },
        deficiencies: {
          type: "array",
          description: "Any deficiencies or issues noted",
          items: {
            type: "object",
            properties: {
              description: { type: "string" },
              location: { type: "string" },
              severity: { type: "string" },
              recommended_action: { type: "string" }
            }
          }
        }
      },
      required: ["assets"]
    };

    const prompt = `You are analyzing an AFSS (Annual Fire Safety Statement) document for a building.

Extract all fire safety assets mentioned in the document including:
- Fire extinguishers (portable and wheeled)
- Smoke detectors and fire alarms
- Fire panels and control systems
- Sprinkler systems
- Emergency lighting
- Exit signs
- Fire doors and smoke doors
- Fire hose reels
- Any other fire safety equipment

For each asset, extract:
- The type of asset
- Location in the building
- Any identification numbers or tags
- Service dates (last and next)
- Compliance status
- Service frequency requirements

Also extract:
- The inspection date
- Next inspection due date
- Fire safety practitioner details
- Any deficiencies or issues noted

Be thorough and extract all assets mentioned in the document.`;

    const extractedData = await base44.integrations.Core.InvokeLLM({
      prompt: prompt,
      file_urls: [file_url],
      response_json_schema: assetSchema
    });

    return Response.json({
      success: true,
      data: extractedData
    });

  } catch (error) {
    console.error('AFSS extraction error:', error);
    return Response.json({
      success: false,
      error: error.message || 'Failed to extract AFSS assets'
    }, { status: 500 });
  }
});