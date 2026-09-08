import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import {
  upsertAssets,
  linkDocumentToAssets,
  ensureDocument,
  buildAssetIndex,
  matchAsset
} from '../../shared/assetImport.js';

const DEFAULT_BATCH_SIZE = 5;

function addMonthsISO(isoDate: string, months: number) {
  const parts = String(isoDate).split('-').map(Number);
  const y = parts[0], m = parts[1], d = parts[2];
  if (!y || !m || !d) return isoDate;
  const total = (y * 12 + (m - 1)) + months;
  const ny = Math.floor(total / 12);
  const nm = (total % 12) + 1;
  const nd = Math.min(d, new Date(ny, nm, 0).getDate());
  return `${ny}-${String(nm).padStart(2, '0')}-${String(nd).padStart(2, '0')}`;
}

const FITTING_LABELS: Record<string, string> = {
  emergency_spitfire_recessed: 'Emergency Spitfire (Recessed)',
  emergency_spitfire_surface: 'Emergency Spitfire (Surface)',
  emergency_4ft_weatherproof: 'Emergency 4ft (Weatherproof)',
  emergency_2ft_weatherproof: 'Emergency 2ft (Weatherproof)',
  exit_quickfit: 'Exit Quickfit',
  exit_weatherproof: 'Exit Weatherproof',
  other: 'Emergency/Exit Fitting'
};

export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const file_url = body.file_url;
    const start_page = Math.max(0, Number(body.start_page || 0));
    const batch_size = Math.max(1, Number(body.batch_size || DEFAULT_BATCH_SIZE));
    const building_id = body.building_id || null;
    const documentId = body.documentId || null;
    const fileName = body.fileName || null;

    if (!file_url) return Response.json({ success: false, error: 'Missing required parameter: file_url' }, { status: 400 });

    // 1. Fetch + extract per-page text
    const pdfResp = await fetch(file_url);
    if (!pdfResp.ok) return Response.json({ success: false, error: 'Failed to download PDF' }, { status: 502 });
    const buf = new Uint8Array(await pdfResp.arrayBuffer());

    let pages: string[] = [];
    let totalPages = 0;
    try {
      const mod: any = await import('npm:unpdf@0.11.0');
      const result = await mod.extractText(buf, { mergePages: false });
      if (Array.isArray(result.text)) pages = result.text.map((p: any) => (p == null ? '' : String(p)));
      else if (typeof result.text === 'string') pages = [result.text];
      totalPages = result.totalPages || pages.length;
    } catch (e) {
      return Response.json({ success: false, error: 'Could not extract text from this PDF. Try a text-based (not scanned) AS 2293.1 register.' }, { status: 422 });
    }

    if (!totalPages) totalPages = pages.length;
    if (!pages.length || !pages.some((p) => p && p.trim())) {
      return Response.json({ success: false, error: 'No extractable text found in the PDF. It may be a scanned image.' }, { status: 422 });
    }

    const batchEnd = Math.min(start_page + batch_size, totalPages);
    const batchText = pages.slice(start_page, batchEnd).join('\n\n');

    if (!batchText.trim()) {
      return Response.json({
        success: true,
        data: { fittings: [], contractor: null, inspection_date: null, building_name: null, building_address: null },
        totalPages, batchStart: start_page, batchEnd, done: batchEnd >= totalPages, documentId
      });
    }

    // 2. LLM extraction
    const extractionSchema = {
      type: 'object',
      properties: {
        contractor: {
          type: 'object',
          properties: {
            company: { type: 'string' },
            contact_name: { type: 'string' },
            phone: { type: 'string' },
            abn: { type: 'string' },
            job_number: { type: 'string' }
          }
        },
        inspection_date: { type: 'string', description: 'yyyy-mm-dd' },
        building_name: { type: 'string' },
        building_address: { type: 'string' },
        fittings: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              asset_id: { type: 'string' },
              fitting_number: { type: 'string' },
              building_and_level: { type: 'string' },
              building_part: { type: 'string' },
              level: { type: 'string' },
              location: { type: 'string' },
              fitting_type: { type: 'string' },
              fitting_type_code: { type: 'string', enum: ['emergency_spitfire_recessed', 'emergency_spitfire_surface', 'emergency_4ft_weatherproof', 'emergency_2ft_weatherproof', 'exit_quickfit', 'exit_weatherproof', 'other'] },
              is_exit_sign: { type: 'boolean' },
              inspection_date: { type: 'string', description: 'yyyy-mm-dd' },
              service_interval: { type: 'string' },
              result: { type: 'string', enum: ['Pass', 'Fail'] },
              failure_points: { type: 'string' }
            },
            required: ['asset_id', 'fitting_number', 'location', 'fitting_type', 'fitting_type_code', 'is_exit_sign', 'result']
          }
        }
      },
      required: ['fittings']
    };

    const isFirstBatch = start_page === 0;
    const prompt = `You are analyzing the extracted text of an AS 2293.1 Emergency and Exit Lighting asset register.
The register is paginated. You are being shown ONLY pages ${start_page + 1} through ${batchEnd} of ${totalPages}. Extract every fitting row in THIS batch only.
Columns: Asset ID, Fitting No., Building & Level, Location, Fitting Type, Date, Service, Pass/Fail, Failure Points.
Map fitting_type to fitting_type_code. Set is_exit_sign true for exit signs. Set result to Pass/Fail. For failed rows set failure_points; else empty string. Convert dates to yyyy-mm-dd.
${isFirstBatch ? 'ALSO extract the contractor block and overall inspection_date, building_name, building_address from the header.' : 'NOT the first batch — do NOT extract the contractor header. Set contractor to null.'}

BATCH TEXT (pages ${start_page + 1}-${batchEnd} of ${totalPages}) BEGINS:
${batchText}`;

    const extracted: any = await base44.integrations.Core.InvokeLLM({ prompt, response_json_schema: extractionSchema });
    const fittings = (extracted && extracted.fittings) || [];
    const contractor = isFirstBatch ? (extracted && extracted.contractor) || null : null;
    const inspection_date = isFirstBatch ? (extracted && extracted.inspection_date) || null : null;
    const building_name = isFirstBatch ? (extracted && extracted.building_name) || null : null;
    const building_address = isFirstBatch ? (extracted && extracted.building_address) || null : null;

    // 3. Persist (only when building_id provided)
    let batchSummary = { assetsCreated: 0, assetsUpdated: 0, complianceRecords: 0, workOrdersCreated: 0, linked: 0, documentId: null as any };

    if (building_id) {
      const existing = await base44.entities.Asset.filter({ building_id });

      const assetFields = fittings.map((f: any) => {
        const subcategory = f.is_exit_sign ? 'exit_signage' : 'emergency_lighting';
        const fittingLabel = FITTING_LABELS[f.fitting_type_code] || f.fitting_type || 'Emergency/Exit Fitting';
        const inspDate = f.inspection_date || inspection_date || null;
        const nextDue = inspDate ? addMonthsISO(inspDate, 6) : null;
        const failed = String(f.result).toLowerCase() === 'fail';
        return {
          building_id,
          asset_main_category: 'fire_life_safety',
          asset_subcategory: subcategory,
          asset_type: fittingLabel,
          name: `${subcategory === 'exit_signage' ? 'Exit Sign' : 'Emergency Light'} ${f.fitting_number} - ${f.location || f.building_and_level || ''}`.trim(),
          identifier: String(f.asset_id),
          fitting_number: f.fitting_number,
          location: f.location,
          floor: f.level || f.building_part || null,
          last_service_date: inspDate,
          next_service_date: nextDue,
          service_frequency: 'half_yearly',
          compliance_status: failed ? 'requires_attention' : 'compliant',
          criticality: failed ? 'high' : 'medium',
          operational_status: failed ? 'degraded' : 'operational',
          notes: f.failure_points || null,
          status: 'active'
        };
      });

      const { created, updated, createdCount, updatedCount } = await upsertAssets(base44, existing, assetFields);
      const allAssets = created.concat(updated);

      // Resolve contractor once
      let contractorId: any = null;
      if (isFirstBatch && contractor && contractor.company) {
        try {
          const m = await base44.entities.Contractor.filter({ company_name: contractor.company });
          if (m && m.length) contractorId = m[0].id;
        } catch (_) {}
      }

      const docId = await ensureDocument(base44, {
        documentId,
        building_id,
        category: 'compliance',
        file_url,
        title: fileName ? `Emergency Lighting Register - ${fileName}` : 'AS 2293.1 Emergency Lighting Register'
      });
      const linked = await linkDocumentToAssets(base44, docId, allAssets);

      // Map each fitting's asset_id to its resulting Asset id (created or matched existing)
      const index = buildAssetIndex(existing);
      const createdById = new Map<string, string>();
      for (const a of created) if (a.identifier) createdById.set(String(a.identifier), a.id);
      const idByAssetId = new Map<string, string>();
      for (const f of fittings) {
        const ex = matchAsset(index, { identifier: String(f.asset_id), fitting_number: f.fitting_number });
        if (ex) idByAssetId.set(String(f.asset_id), ex.id);
        else {
          const cid = createdById.get(String(f.asset_id));
          if (cid) idByAssetId.set(String(f.asset_id), cid);
        }
      }

      // Compliance records
      const complianceToCreate = [];
      for (const f of fittings) {
        const assetId = idByAssetId.get(String(f.asset_id));
        const inspDate = f.inspection_date || inspection_date;
        if (!assetId || !inspDate) continue;
        const failed = String(f.result).toLowerCase() === 'fail';
        const nextDue = addMonthsISO(inspDate, 6);
        complianceToCreate.push({
          asset_id: assetId,
          building_id,
          compliance_type: 'emergency_lighting',
          inspection_date: inspDate,
          next_due_date: nextDue,
          status: failed ? 'failed' : 'passed',
          inspector_company: (contractor && contractor.company) || null,
          contractor_id: contractorId,
          certificate_number: (contractor && contractor.job_number) || null,
          findings: f.failure_points || null,
          defects: failed ? [f.failure_points || 'Failed 90-minute discharge test'] : [],
          recommendations: failed ? (f.failure_points || 'Replace fitting') : null
        });
      }
      if (complianceToCreate.length) {
        for (let i = 0; i < complianceToCreate.length; i += 150) {
          await base44.entities.ComplianceRecord.bulkCreate(complianceToCreate.slice(i, i + 150));
        }
      }

      // Work orders for failed fittings
      let workOrdersCreated = 0;
      for (let i = 0; i < fittings.length; i++) {
        const f = fittings[i];
        if (String(f.result).toLowerCase() !== 'fail') continue;
        const assetId = idByAssetId.get(String(f.asset_id));
        if (!assetId) continue;
        try {
          const wos = await base44.entities.WorkOrder.filter({ asset_id: assetId });
          const hasOpen = wos.some((w: any) => ['open', 'in_progress', 'on_hold'].includes(w.status));
          if (hasOpen) continue;
          await base44.entities.WorkOrder.create({
            building_id,
            asset_id: assetId,
            title: `Emergency Lighting Failure - Fitting ${f.fitting_number} (${f.asset_id})`,
            description: `Failed 90-minute discharge test during AS 2293.1 inspection on ${f.inspection_date || inspection_date || 'N/A'}.\nLocation: ${f.location || 'N/A'} (${f.building_and_level || 'N/A'})\nFitting type: ${f.fitting_type}\nFailure points: ${f.failure_points || 'Replace fitting'}`,
            main_category: 'fire_life_safety',
            subcategory: f.is_exit_sign ? 'exit_signage' : 'emergency_lighting',
            priority: 'high',
            status: 'open',
            job_area: `${f.building_and_level || ''} - ${f.location || ''}`.trim(),
            auto_generated: true,
            source_type: 'manual',
            reported_by: user.email,
            notes: f.failure_points || null
          });
          workOrdersCreated++;
        } catch (e) {
          console.error('WO create failed for fitting', f.asset_id, e);
        }
      }

      batchSummary = {
        assetsCreated: createdCount,
        assetsUpdated: updatedCount,
        complianceRecords: complianceToCreate.length,
        workOrdersCreated,
        linked,
        documentId: docId
      };
    }

    return Response.json({
      success: true,
      data: {
        fittings,
        contractor,
        inspection_date,
        building_name,
        building_address,
        ...batchSummary
      },
      totalPages,
      batchStart: start_page,
      batchEnd,
      done: batchEnd >= totalPages,
      documentId: batchSummary.documentId
    });
  } catch (error) {
    console.error('Emergency lighting register extraction error:', error);
    return Response.json({ success: false, error: error.message || 'Failed to extract emergency lighting register' }, { status: 500 });
  }
}