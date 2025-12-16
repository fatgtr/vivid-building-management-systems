import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { file_url, buildingId, documentId, assetCategory } = await req.json();

    if (!file_url || !buildingId || !assetCategory) {
      return Response.json({ 
        success: false, 
        error: 'Missing required parameters: file_url, buildingId, and assetCategory' 
      }, { status: 400 });
    }

    // Define prompts and schemas based on asset category
    let prompt = '';
    let assetSchema = {};

    if (assetCategory === 'electrical') {
      prompt = `You are analyzing an as-built electrical plan for a building.

Extract all electrical assets and infrastructure including:
- Main switchboards and distribution boards
- Electrical panels and sub-boards
- Meters (electricity meters, sub-meters)
- Circuit breakers
- Transformers
- Emergency power systems (generators, UPS)
- Electrical risers and shafts
- Key electrical services and connections

For each asset, extract:
- Asset type and name
- Location in the building (floor, room, area)
- Any identification numbers or labels
- Technical specifications if mentioned
- Capacity or ratings if mentioned

Be thorough and extract all electrical assets shown in the plans.`;

      assetSchema = {
        type: "object",
        properties: {
          building_name: { type: "string" },
          plan_title: { type: "string" },
          plan_date: { type: "string" },
          assets: {
            type: "array",
            items: {
              type: "object",
              properties: {
                asset_type: { type: "string", description: "e.g., main_switchboard, distribution_board, meter, circuit_breaker, generator, transformer" },
                name: { type: "string" },
                identifier: { type: "string" },
                location: { type: "string" },
                floor: { type: "string" },
                capacity: { type: "string" },
                specifications: { type: "string" },
                notes: { type: "string" }
              },
              required: ["asset_type", "name", "location"]
            }
          }
        },
        required: ["assets"]
      };

    } else if (assetCategory === 'mechanical') {
      prompt = `You are analyzing an as-built mechanical plan for a building.

Extract all mechanical assets and HVAC systems including:
- HVAC units (rooftop units, split systems, VRV/VRF systems)
- Air handling units (AHUs)
- Fan coil units (FCUs)
- Chillers
- Boilers
- Cooling towers
- Pumps (water, HVAC circulation)
- Ventilation fans and exhaust systems
- Ductwork (main ducts and risers)
- Building management system (BMS) panels

For each asset, extract:
- Asset type and name
- Location in the building
- Model and manufacturer if shown
- Capacity or specifications
- Any identification numbers

Be thorough and extract all mechanical assets shown in the plans.`;

      assetSchema = {
        type: "object",
        properties: {
          building_name: { type: "string" },
          plan_title: { type: "string" },
          plan_date: { type: "string" },
          assets: {
            type: "array",
            items: {
              type: "object",
              properties: {
                asset_type: { type: "string", description: "e.g., hvac_unit, ahu, fcu, chiller, boiler, cooling_tower, pump, ventilation_fan, bms_panel" },
                name: { type: "string" },
                identifier: { type: "string" },
                location: { type: "string" },
                floor: { type: "string" },
                manufacturer: { type: "string" },
                model: { type: "string" },
                capacity: { type: "string" },
                specifications: { type: "string" },
                notes: { type: "string" }
              },
              required: ["asset_type", "name", "location"]
            }
          }
        },
        required: ["assets"]
      };

    } else if (assetCategory === 'plumbing') {
      prompt = `You are analyzing an as-built plumbing plan for a building.

Extract all plumbing assets and infrastructure including:
- Water meters and sub-meters
- Hot water systems (tanks, heaters, solar systems)
- Water pumps (pressure boosting, fire service)
- Water tanks (storage, header tanks)
- Backflow prevention devices
- Isolation valves (key valve locations)
- Water risers and stacks
- Drainage systems
- Sewer connections
- Grease traps
- Water treatment systems

For each asset, extract:
- Asset type and name
- Location in the building
- Model and manufacturer if shown
- Capacity or size
- Any identification numbers

Be thorough and extract all plumbing assets shown in the plans.`;

      assetSchema = {
        type: "object",
        properties: {
          building_name: { type: "string" },
          plan_title: { type: "string" },
          plan_date: { type: "string" },
          assets: {
            type: "array",
            items: {
              type: "object",
              properties: {
                asset_type: { type: "string", description: "e.g., water_meter, hot_water_system, pump, water_tank, backflow_preventer, isolation_valve, riser" },
                name: { type: "string" },
                identifier: { type: "string" },
                location: { type: "string" },
                floor: { type: "string" },
                manufacturer: { type: "string" },
                model: { type: "string" },
                capacity: { type: "string" },
                specifications: { type: "string" },
                notes: { type: "string" }
              },
              required: ["asset_type", "name", "location"]
            }
          }
        },
        required: ["assets"]
      };
    } else {
      return Response.json({
        success: false,
        error: 'Unsupported asset category. Supported: electrical, mechanical, plumbing'
      }, { status: 400 });
    }

    const extractedData = await base44.integrations.Core.InvokeLLM({
      prompt: prompt,
      file_urls: [file_url],
      response_json_schema: assetSchema
    });

    return Response.json({
      success: true,
      data: extractedData,
      assetCategory: assetCategory
    });

  } catch (error) {
    console.error('As-built extraction error:', error);
    return Response.json({
      success: false,
      error: error.message || 'Failed to extract as-built assets'
    }, { status: 500 });
  }
});