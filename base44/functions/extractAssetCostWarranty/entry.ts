import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { ensureDocument, buildSummary } from '../../shared/assetImport.js';

const norm = (v: any) => (v == null ? '' : String(v).trim().toLowerCase());
const num = (v: any) => {
  if (v == null || v === '') return null;
  const n = Number(String(v).replace(/[^0-9.\-]/g, ''));
  return isNaN(n) ? null : n;
};

export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const file_url = body.file_url;
    const building_id = body.building_id;
    const documentId = body.documentId;
    const fileName = body.fileName;

    if (!file_url) return Response.json({ success: false, error: 'Missing required parameter: file_url' }, { status: 400 });
    if (!building_id) return Response.json({ success: false, error: 'Missing required parameter: building_id' }, { status: 400 });

    const rowSchema = {
      type: 'object',
      properties: {
        identifier: { type: 'string' },
        fitting_number: { type: 'string' },
        name: { type: 'string' },
        barcode: { type: 'string' },
        asset_cost_ex_gst: { type: 'number' },
        labour_cost_ex_gst: { type: 'number' },
        warranty_period: { type: 'number' },
        warranty_terms: { type: 'string' }
      }
    };

    const extracted: any = await base44.integrations.Core.ExtractDataFromUploadedFile({ file_url, json_schema: rowSchema });
    if (!extracted || extracted.status === 'error') {
      return Response.json({ success: false, error: (extracted && extracted.details) || 'Could not extract data from the uploaded file.' }, { status: 422 });
    }

    let out: any = extracted.output;
    if (out == null) out = [];
    else if (!Array.isArray(out)) {
      out = Array.isArray(out.rows) ? out.rows : Array.isArray(out.assets) ? out.assets : Array.isArray(out.data) ? out.data : [out];
    }
    const rows: any[] = out;

    const assets: any[] = await base44.entities.Asset.filter({ building_id: building_id });
    const buildIndex = (key: string) => {
      const m = new Map();
      assets.forEach((a) => { const v = norm(a[key]); if (v) m.set(v, a); });
      return m;
    };
    const byIdentifier = buildIndex('identifier');
    const byFitting = buildIndex('fitting_number');
    const byName = buildIndex('name');
    const byBarcode = buildIndex('barcode');

    const docId = await ensureDocument(base44, {
      documentId,
      building_id: building_id,
      category: 'other',
      file_url,
      title: fileName ? `Cost & Warranty - ${fileName}` : 'Asset Cost & Warranty Import'
    });

    const updates: any[] = [];
    const unmatched: any[] = [];

    rows.forEach((r) => {
      if (!r || typeof r !== 'object') return;
      const id = norm(r.identifier);
      const fit = norm(r.fitting_number);
      const nm = norm(r.name);
      const bc = norm(r.barcode);
      const match = (id && byIdentifier.get(id)) || (fit && byFitting.get(fit)) || (nm && byName.get(nm)) || (bc && byBarcode.get(bc)) || null;

      if (!match) {
        unmatched.push({ identifier: r.identifier || '', fitting_number: r.fitting_number || '', name: r.name || '' });
        return;
      }

      const patch: any = {};
      const ac = num(r.asset_cost_ex_gst);
      const lc = num(r.labour_cost_ex_gst);
      const wp = num(r.warranty_period);
      const wt = r.warranty_terms != null ? String(r.warranty_terms).trim() : '';
      if (ac != null) patch.asset_cost_ex_gst = ac;
      if (lc != null) patch.labour_cost_ex_gst = lc;
      if (wp != null) patch.warranty_period = wp;
      if (wt) patch.warranty_terms = wt;

      if (Object.keys(patch).length === 0) {
        unmatched.push({ identifier: r.identifier || '', fitting_number: r.fitting_number || '', name: r.name || '', reason: 'No cost/warranty values' });
        return;
      }
      // Link the source document into the asset's documents array (deduped)
      patch.documents = Array.from(new Set([...(match.documents || []), docId]));
      updates.push({ id: match.id, ...patch });
    });

    let updated = 0;
    let linked = 0;
    if (updates.length) {
      for (let i = 0; i < updates.length; i += 150) {
        await base44.entities.Asset.bulkUpdate(updates.slice(i, i + 150));
      }
      updated = updates.length;
      linked = updates.length;
    }

    return Response.json({
      ...buildSummary({ created: 0, updated, unmatched: unmatched.length, documentId: docId, linked }),
      totalRows: rows.length,
      unmatchedSample: unmatched.slice(0, 10)
    });
  } catch (error) {
    console.error('Asset cost/warranty extraction error:', error);
    return Response.json({ success: false, error: error.message || 'Failed to extract asset cost/warranty data' }, { status: 500 });
  }
}