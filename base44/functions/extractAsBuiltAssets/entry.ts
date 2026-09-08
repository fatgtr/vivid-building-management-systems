import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import {
  upsertAssets,
  linkDocumentToAssets,
  ensureDocument,
  buildSummary
} from '../../shared/assetImport.js';

const CATEGORY_MAP = {
  electrical: 'electrical_services',
  mechanical: 'mechanical_services',
  plumbing: 'hydraulic_plumbing'
};

const DOC_CATEGORY_MAP = {
  electrical: 'as_built_electrical',
  mechanical: 'as_built_mechanical',
  plumbing: 'as_built_plumbing'
};

export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { file_url, buildingId, documentId, fileName, assetCategory } = await req.json();
    if (!file_url || !buildingId || !assetCategory) {
      return Response.json({ success: false, error: 'Missing required parameters: file_url, buildingId and assetCategory' }, { status: 400 });
    }

    const mainCategory = CATEGORY_MAP[assetCategory] || assetCategory;
    const docCategory = DOC_CATEGORY_MAP[assetCategory] || 'other';

    let prompt = '';
    let assetSchema: any = {};

    if (assetCategory === 'electrical') {
      prompt = `You are analyzing an as-built electrical plan for a building. Extract all electrical assets including main switchboards, distribution boards, panels, meters, circuit breakers, transformers, emergency power systems, risers and key connections. For each extract type, name, location, identifiers, capacity/ratings. Be thorough.`;
      assetSchema = baseSchema('main_switchboard, distribution_board, meter, circuit_breaker, generator, transformer');
    } else if (assetCategory === 'mechanical') {
      prompt = `You are analyzing an as-built mechanical plan for a building. Extract all mechanical/HVAC assets including HVAC units, AHUs, FCUs, chillers, boilers, cooling towers, pumps, ventilation fans, ductwork, BMS panels. For each extract type, name, location, manufacturer, model, capacity, identifiers. Be thorough.`;
      assetSchema = baseSchema('hvac_unit, ahu, fcu, chiller, boiler, cooling_tower, pump, ventilation_fan, bms_panel');
    } else if (assetCategory === 'plumbing') {
      prompt = `You are analyzing an as-built plumbing plan for a building. Extract all plumbing assets including water meters, hot water systems, pumps, tanks, backflow preventers, isolation valves, risers, drainage, grease traps, treatment systems. For each extract type, name, location, manufacturer, model, capacity, identifiers. Be thorough.`;
      assetSchema = baseSchema('water_meter, hot_water_system, pump, water_tank, backflow_preventer, isolation_valve, riser');
    } else {
      return Response.json({ success: false, error: 'Unsupported asset category. Supported: electrical, mechanical, plumbing' }, { status: 400 });
    }

    const extractedData: any = await base44.integrations.Core.InvokeLLM({
      prompt,
      file_urls: [file_url],
      response_json_schema: assetSchema
    });

    const rawAssets = (extractedData && extractedData.assets) || [];
    const assetFields = rawAssets.map((a: any) => ({
      building_id: buildingId,
      asset_main_category: mainCategory,
      asset_type: a.asset_type,
      name: a.name,
      identifier: a.identifier || null,
      location: a.location,
      floor: a.floor || null,
      manufacturer: a.manufacturer || null,
      model: a.model || null,
      notes: a.notes || null,
      service_frequency: 'yearly',
      compliance_status: 'unknown',
      status: 'active'
    }));

    const existing = await base44.entities.Asset.filter({ building_id: buildingId });
    const { created, updated, createdCount, updatedCount } = await upsertAssets(base44, existing, assetFields);
    const allAssets = created.concat(updated);

    const docId = await ensureDocument(base44, {
      documentId,
      building_id: buildingId,
      category: docCategory,
      file_url,
      title: fileName ? `As-Built ${assetCategory} - ${fileName}` : `As-Built ${assetCategory} Plan`
    });
    const linked = await linkDocumentToAssets(base44, docId, allAssets);

    return Response.json(buildSummary({ created: createdCount, updated: updatedCount, unmatched: 0, documentId: docId, linked }));
  } catch (error) {
    console.error('As-built extraction error:', error);
    return Response.json({ success: false, error: error.message || 'Failed to extract as-built assets' }, { status: 500 });
  }
}

function baseSchema(typeExamples: string) {
  return {
    type: 'object',
    properties: {
      building_name: { type: 'string' },
      plan_title: { type: 'string' },
      plan_date: { type: 'string' },
      assets: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            asset_type: { type: 'string', description: `e.g., ${typeExamples}` },
            name: { type: 'string' },
            identifier: { type: 'string' },
            location: { type: 'string' },
            floor: { type: 'string' },
            manufacturer: { type: 'string' },
            model: { type: 'string' },
            capacity: { type: 'string' },
            specifications: { type: 'string' },
            notes: { type: 'string' }
          },
          required: ['asset_type', 'name', 'location']
        }
      }
    },
    required: ['assets']
  };
}