import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

// Maps a Document category to the Asset asset_main_category it relates to.
const DOC_TO_ASSET_CATEGORY: Record<string, string> = {
  afss_documentation: 'fire_life_safety',
  as_built_electrical: 'electrical_services',
  as_built_mechanical: 'mechanical_services',
  as_built_plumbing: 'hydraulic_plumbing',
  lift_plant_registration: 'vertical_transportation'
};

// Asset main-category enum values that are also used directly as document categories
// (generic asset-category documents share the same key).
const ASSET_MAIN_CATEGORIES = [
  'core_building_structure', 'mechanical_services', 'electrical_services', 'fire_life_safety',
  'vertical_transportation', 'hydraulic_plumbing', 'security_access_control', 'communications_it',
  'building_management_systems', 'external_grounds', 'common_area_fixtures_fittings',
  'waste_management', 'parking_traffic', 'compliance_safety', 'commercial_specific',
  'residential_specific', 'documentation_registers'
];

const CHUNK = 150;

export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden — admin only' }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    const buildingId = body.building_id || null; // optional scope

    const docQuery: any = { status: 'active' };
    if (buildingId) docQuery.building_id = buildingId;
    const documents: any[] = await base44.entities.Document.filter(docQuery);

    const byBuilding = new Map<string, any[]>();
    for (const d of documents) {
      if (!d.building_id) continue;
      if (!byBuilding.has(d.building_id)) byBuilding.set(d.building_id, []);
      byBuilding.get(d.building_id).push(d);
    }

    const report: any[] = [];
    let totalLinks = 0;

    for (const [bId, docs] of byBuilding.entries()) {
      const assets: any[] = await base44.entities.Asset.filter({ building_id: bId });
      if (!assets.length) continue;

      const updates: any[] = [];

      for (const doc of docs) {
        let mainCategory: string | null = null;
        let subcategories: string[] | null = null;

        if (DOC_TO_ASSET_CATEGORY[doc.category]) {
          mainCategory = DOC_TO_ASSET_CATEGORY[doc.category];
        } else if (ASSET_MAIN_CATEGORIES.includes(doc.category)) {
          mainCategory = doc.category;
        } else if (doc.category === 'compliance') {
          // emergency lighting / exit signage assets
          mainCategory = 'fire_life_safety';
          subcategories = ['emergency_lighting', 'exit_signage'];
        } else {
          continue;
        }

        const matches = assets.filter((a) => {
          if (a.asset_main_category !== mainCategory) return false;
          if (subcategories && !subcategories.includes(a.asset_subcategory)) return false;
          // skip assets already linked to this document
          return !(a.documents || []).includes(doc.id);
        });

        for (const a of matches) {
          updates.push({
            id: a.id,
            documents: Array.from(new Set([...(a.documents || []), doc.id]))
          });
        }

        if (matches.length) {
          report.push({ building_id: bId, document_id: doc.id, category: doc.category, linked: matches.length });
        }
      }

      // Dedupe updates by asset id (an asset may match multiple docs)
      const seen = new Map<string, any>();
      for (const u of updates) {
        if (seen.has(u.id)) {
          seen.get(u.id).documents = Array.from(new Set([...seen.get(u.id).documents, ...u.documents]));
        } else {
          seen.set(u.id, { id: u.id, documents: [...u.documents] });
        }
      }
      const deduped = Array.from(seen.values());

      for (let i = 0; i < deduped.length; i += CHUNK) {
        await base44.entities.Asset.bulkUpdate(deduped.slice(i, i + CHUNK));
      }
      totalLinks += deduped.length;
    }

    return Response.json({
      success: true,
      buildingsProcessed: byBuilding.size,
      documentsScanned: documents.length,
      linksCreated: totalLinks,
      report
    });
  } catch (error) {
    console.error('Backfill asset document links error:', error);
    return Response.json({ success: false, error: error.message || 'Failed to backfill asset document links' }, { status: 500 });
  }
}