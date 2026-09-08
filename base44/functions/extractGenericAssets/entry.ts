import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import {
  upsertAssets,
  linkDocumentToAssets,
  ensureDocument,
  buildSummary
} from '../../shared/assetImport.js';

export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { file_url, buildingId, documentId, fileName, assetCategory, categoryLabel, subcategories, subcategory } = await req.json();
    if (!file_url || !buildingId || !assetCategory) {
      return Response.json({ success: false, error: 'Missing required parameters: file_url, buildingId and assetCategory' }, { status: 400 });
    }

    const subList = Array.isArray(subcategories) && subcategories.length ? subcategories.join(', ') : '';
    const enumItems = Array.isArray(subcategories) && subcategories.length ? subcategories : undefined;

    const schema = {
      type: 'object',
      properties: {
        assets: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string', description: 'Asset name/description including the equipment type' },
              asset_type: { type: 'string', description: 'Specific asset type from document' },
              asset_subcategory: {
                type: 'string',
                description: subList ? `MUST be one of: ${subList}. Choose the most appropriate.` : 'Most appropriate subcategory',
                ...(enumItems ? { enum: enumItems } : {})
              },
              identifier: { type: 'string' },
              manufacturer: { type: 'string' },
              model: { type: 'string' },
              location: { type: 'string' },
              floor: { type: 'string' },
              installation_date: { type: 'string', description: 'YYYY-MM-DD' },
              last_service_date: { type: 'string', description: 'YYYY-MM-DD' },
              service_frequency: {
                type: 'string',
                enum: ['monthly', 'bi_monthly', 'quarterly', 'half_yearly', 'yearly', 'bi_yearly', 'custom']
              },
              notes: { type: 'string' }
            },
            required: ['name', 'asset_type']
          }
        }
      },
      required: ['assets']
    };

    const prompt = `Analyze this ${categoryLabel || assetCategory} document and extract all assets, equipment and systems.
Building: ${buildingId}
${subcategory ? `All assets belong to the "${subcategory}" sub-category — tag each asset_subcategory as "${subcategory}".` : (subList ? `IMPORTANT: assign each asset the most appropriate subcategory from: ${subList}.` : '')}
Extract name (include equipment type), asset type, subcategory, manufacturer, model, location, floor, identifiers, installation date, service requirements. Be precise.`;

    const extractedData: any = await base44.integrations.Core.InvokeLLM({
      prompt,
      file_urls: [file_url],
      response_json_schema: schema
    });

    const rawAssets = (extractedData && extractedData.assets) || [];
    const assetFields = rawAssets.map((a: any) => ({
      building_id: buildingId,
      asset_main_category: assetCategory,
      asset_subcategory: subcategory || a.asset_subcategory || null,
      asset_type: a.asset_type,
      name: a.name,
      identifier: a.identifier || null,
      manufacturer: a.manufacturer || null,
      model: a.model || null,
      location: a.location || null,
      floor: a.floor || null,
      installation_date: a.installation_date || null,
      last_service_date: a.last_service_date || null,
      service_frequency: a.service_frequency || null,
      notes: a.notes || null,
      status: 'active'
    }));

    const existing = await base44.entities.Asset.filter({ building_id: buildingId });
    const { created, updated, createdCount, updatedCount } = await upsertAssets(base44, existing, assetFields);
    const allAssets = created.concat(updated);

    const docId = await ensureDocument(base44, {
      documentId,
      building_id: buildingId,
      category: 'other',
      file_url,
      title: fileName ? `${categoryLabel || assetCategory} - ${fileName}` : `${categoryLabel || assetCategory} Asset Import`
    });
    const linked = await linkDocumentToAssets(base44, docId, allAssets);

    return Response.json({
      ...buildSummary({ created: createdCount, updated: updatedCount, unmatched: 0, documentId: docId, linked }),
      extracted: rawAssets.length
    });
  } catch (error) {
    console.error('Generic asset extraction error:', error);
    return Response.json({ success: false, error: error.message || 'Failed to extract assets' }, { status: 500 });
  }
}