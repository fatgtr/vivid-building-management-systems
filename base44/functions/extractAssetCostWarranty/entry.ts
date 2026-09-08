import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

// Accepts an uploaded cost/warranty file (CSV/XLSX/PDF) plus building_id,
// extracts per-asset cost + warranty values, matches each row to an existing
// Asset by identifier / fitting_number / name (case-insensitive, fallback to
// barcode), and bulk-updates matched records.
export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const file_url = body.file_url;
    const building_id = body.building_id;

    if (!file_url) {
      return Response.json({ success: false, error: 'Missing required parameter: file_url' }, { status: 400 });
    }
    if (!building_id) {
      return Response.json({ success: false, error: 'Missing required parameter: building_id' }, { status: 400 });
    }

    // 1. Extract structured rows from the uploaded file (CSV/XLSX/PDF supported).
    const rowSchema = {
      type: 'object',
      properties: {
        identifier: { type: 'string', description: 'Serial number, model number, or unique asset ID' },
        fitting_number: { type: 'string', description: 'Fitting number (e.g., 4.1, FS1) for emergency/exit lighting' },
        name: { type: 'string', description: 'Asset name / description' },
        barcode: { type: 'string', description: 'Barcode or QR code value' },
        asset_cost_ex_gst: { type: 'number', description: 'Cost of the asset itself, excluding GST (AUD)' },
        labour_cost_ex_gst: { type: 'number', description: 'Installation / labour cost, excluding GST (AUD)' },
        warranty_period: { type: 'number', description: 'Warranty period in months (e.g., 24 for 2 years)' },
        warranty_terms: { type: 'string', description: 'Warranty coverage details / provider / terms' }
      }
    };

    const extracted: any = await base44.integrations.Core.ExtractDataFromUploadedFile({
      file_url,
      json_schema: rowSchema
    });

    if (!extracted || extracted.status === 'error') {
      return Response.json({
        success: false,
        error: (extracted && extracted.details) || 'Could not extract data from the uploaded file.'
      }, { status: 422 });
    }

    let out = extracted.output;
    if (out == null) {
      out = [];
    } else if (!Array.isArray(out)) {
      // output may be a single dict or an object wrapping a list — normalise to a list
      out = Array.isArray(out.rows) ? out.rows
        : Array.isArray(out.assets) ? out.assets
        : Array.isArray(out.data) ? out.data
        : [out];
    }
    const rows: any[] = out;

    // 2. Load existing assets for the building and build case-insensitive lookups.
    const assets: any[] = await base44.entities.Asset.filter({ building_id });

    const norm = (v: any) => (v == null ? '' : String(v).trim().toLowerCase());
    const buildIndex = (key: string) => {
      const m = new Map<string, any>();
      assets.forEach((a) => {
        const v = norm(a[key]);
        if (v) m.set(v, a);
      });
      return m;
    };
    const byIdentifier = buildIndex('identifier');
    const byFitting = buildIndex('fitting_number');
    const byName = buildIndex('name');
    const byBarcode = buildIndex('barcode');

    const num = (v: any) => {
      if (v == null || v === '') return null;
      const n = Number(String(v).replace(/[^0-9.\-]/g, ''));
      return isNaN(n) ? null : n;
    };

    const updates: any[] = [];
    const unmatched: any[] = [];

    rows.forEach((r) => {
      if (!r || typeof r !== 'object') return;

      const id = norm(r.identifier);
      const fit = norm(r.fitting_number);
      const nm = norm(r.name);
      const bc = norm(r.barcode);

      const match =
        (id && byIdentifier.get(id)) ||
        (fit && byFitting.get(fit)) ||
        (nm && byName.get(nm)) ||
        (bc && byBarcode.get(bc)) ||
        null;

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
      updates.push({ id: match.id, ...patch });
    });

    let updated = 0;
    if (updates.length) {
      // bulkUpdate handles up to 500 records per call
      await base44.entities.Asset.bulkUpdate(updates);
      updated = updates.length;
    }

    return Response.json({
      success: true,
      totalRows: rows.length,
      updated,
      unmatched: unmatched.length,
      unmatchedSample: unmatched.slice(0, 10)
    });
  } catch (error) {
    console.error('Asset cost/warranty extraction error:', error);
    return Response.json({
      success: false,
      error: error.message || 'Failed to extract asset cost/warranty data'
    }, { status: 500 });
  }
}