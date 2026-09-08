import React, { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { EMERGENCY_LIGHTING_FITTING_TYPES } from '@/components/categories/assetCategories';
import { Button } from '@/components/ui/button';
import { Loader2, UploadCloud, FileText, CheckCircle2, AlertTriangle, Wrench, Zap, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';

const FITTING_LABELS = Object.fromEntries(EMERGENCY_LIGHTING_FITTING_TYPES.map((f) => [f.code, f.label]));
const BATCH_SIZE = 5;
const BULK_CHUNK = 150;

function addMonthsISO(isoDate, months) {
  const parts = isoDate.split('-').map(Number);
  const y = parts[0], m = parts[1], d = parts[2];
  if (!y || !m || !d) return isoDate;
  const total = (y * 12 + (m - 1)) + months;
  const ny = Math.floor(total / 12);
  const nm = (total % 12) + 1;
  const nd = Math.min(d, new Date(ny, nm, 0).getDate());
  return `${ny}-${String(nm).padStart(2, '0')}-${String(nd).padStart(2, '0')}`;
}

async function sha256(file) {
  const buf = await file.arrayBuffer();
  const hash = await crypto.subtle.digest('SHA-256', buf);
  return Array.from(new Uint8Array(hash)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

async function chunkedBulkCreate(entityName, records, size = BULK_CHUNK) {
  const out = [];
  for (let i = 0; i < records.length; i += size) {
    const created = await base44.entities[entityName].bulkCreate(records.slice(i, i + size));
    out.push(...created);
  }
  return out;
}

const STAGE_LABEL = {
  extracting: 'Extracting AS 2293.1 register…',
  persisting: 'Saving fittings & compliance…'
};

export default function EmergencyLightingImporter({ selectedBuildingId, stats, onComplete }) {
  const [file, setFile] = useState(null);
  const [fileHash, setFileHash] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [stage, setStage] = useState(null);
  const [summary, setSummary] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const [progress, setProgress] = useState(null); // { processedPages, totalPages, fittingsSoFar }
  const [resumeInfo, setResumeInfo] = useState(null); // { pagesAlreadyImported } | null
  const queryClient = useQueryClient();

  const handleFile = async (f) => {
    if (!f) return;
    if (f.type !== 'application/pdf') { toast.error('Please select a PDF file'); return; }
    setFile(f);
    setSummary(null);
    setProgress(null);
    setResumeInfo(null);
    try {
      const hash = await sha256(f);
      setFileHash(hash);
    } catch (e) {
      // Hashing failed (e.g. private mode) — fall back to a name+size key
      setFileHash(`${f.name}:${f.size}`);
    }
  };

  const buildAssetFields = (f, selectedBuildingId, parsedGlobal) => {
    const subcategory = f.is_exit_sign ? 'exit_signage' : 'emergency_lighting';
    const fittingLabel = FITTING_LABELS[f.fitting_type_code] || f.fitting_type || 'Emergency/Exit Fitting';
    const inspDate = f.inspection_date || parsedGlobal.inspection_date || null;
    const nextDue = inspDate ? addMonthsISO(inspDate, 6) : null;
    const failed = String(f.result).toLowerCase() === 'fail';
    return {
      fields: {
        building_id: selectedBuildingId,
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
      },
      subcategory, inspDate, nextDue, failed
    };
  };

  const handleImport = async () => {
    if (!file) { toast.error('Select an AS 2293.1 register PDF first'); return; }
    if (!selectedBuildingId) { toast.error('Select a building first'); return; }
    if (!fileHash) { toast.error('File is still being prepared — try again'); return; }
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setUploading(false);
      setStage('extracting');

      // Resumability — look up prior progress for this exact file + building
      let progressRec = null;
      try {
        const existing = await base44.entities.ImportProgress.filter({
          building_id: selectedBuildingId,
          import_type: 'emergency_lighting',
          file_hash: fileHash
        });
        if (existing && existing.length) progressRec = existing[0];
      } catch (_) { /* entity may not exist yet — ignore */ }

      let importedSet = new Set();
      let progressId = null;
      if (progressRec && progressRec.completed) {
        // Fully imported before but user re-uploaded — start a fresh full re-import
        try { await base44.entities.ImportProgress.delete(progressRec.id); } catch (_) {}
        progressRec = null;
      }
      if (progressRec && !progressRec.completed) {
        importedSet = new Set((progressRec.imported_pages || []).map(Number));
        progressId = progressRec.id;
        if (importedSet.size > 0) {
          setResumeInfo({ pagesAlreadyImported: importedSet.size });
        }
      }

      // First unprocessed page
      let startPage = 0;
      while (importedSet.has(startPage)) startPage++;

      // Existing assets for dedup (fetched once, merged as we create)
      const existing = await base44.entities.Asset.filter({ building_id: selectedBuildingId });
      const existingByAssetId = new Map();
      for (const a of existing) {
        if ((a.asset_subcategory === 'emergency_lighting' || a.asset_subcategory === 'exit_signage') && a.identifier) {
          existingByAssetId.set(String(a.identifier), a);
        }
      }

      // Contractor lookup once
      let contractorId = null;
      let parsedGlobal = { contractor: null, inspection_date: null, building_name: null, building_address: null };
      let contractorResolved = false;

      const user = await base44.auth.me();

      let totals = { assetsCreated: 0, assetsUpdated: 0, complianceRecords: 0, workOrdersCreated: 0, passed: 0, failed: 0, totalFittings: 0 };
      let totalPages = 0;

      // Main batch loop — extract one batch, persist it, mark pages imported, repeat
      // eslint-disable-next-line no-constant-condition
      while (true) {
        setStage('extracting');
        const { data } = await base44.functions.invoke('extractEmergencyLightingRegister', {
          file_url,
          start_page: startPage,
          batch_size: BATCH_SIZE
        });
        if (!data.success) { setStage(null); toast.error(data.error || 'Extraction failed'); return; }

        const parsed = data.data || {};
        totalPages = data.totalPages || totalPages;
        const batchEnd = data.batchEnd;
        const done = data.done;

        // Capture contractor/header from the first batch only
        if (!contractorResolved && parsed.contractor) {
          parsedGlobal = {
            contractor: parsed.contractor,
            inspection_date: parsed.inspection_date,
            building_name: parsed.building_name,
            building_address: parsed.building_address
          };
          if (parsed.contractor.company) {
            try {
              const m = await base44.entities.Contractor.filter({ company_name: parsed.contractor.company });
              if (m && m.length) contractorId = m[0].id;
            } catch (_) { /* optional */ }
          }
          contractorResolved = true;
        }

        const fittings = parsed.fittings || [];
        setStage('persisting');

        // Build create/update/compliance/WO plans for this batch
        const toCreate = [], toUpdate = [], rowPlan = [];
        for (const f of fittings) {
          const { fields, subcategory, inspDate, nextDue, failed } = buildAssetFields(f, selectedBuildingId, parsedGlobal);
          const ex = existingByAssetId.get(String(f.asset_id));
          rowPlan.push({ f, subcategory, inspDate, nextDue, failed, existing: ex, assetFields: fields });
          if (ex) toUpdate.push({ id: ex.id, ...fields });
          else toCreate.push(fields);
        }

        // Persist assets (chunked) + merge created into the dedup map
        let createdAssets = [];
        if (toCreate.length) createdAssets = await chunkedBulkCreate('Asset', toCreate);
        for (const a of createdAssets) if (a.identifier) existingByAssetId.set(String(a.identifier), a);
        if (toUpdate.length) await base44.entities.Asset.bulkUpdate(toUpdate);
        totals.assetsCreated += toCreate.length;
        totals.assetsUpdated += toUpdate.length;

        // Map asset_id -> internal id for compliance + WOs
        const idByAssetId = new Map();
        for (const a of createdAssets) if (a.identifier) idByAssetId.set(String(a.identifier), a.id);
        for (const r of rowPlan) if (r.existing) idByAssetId.set(String(r.f.asset_id), r.existing.id);

        // Compliance records (chunked)
        const complianceToCreate = [];
        for (const r of rowPlan) {
          const assetId = idByAssetId.get(String(r.f.asset_id));
          if (!assetId || !r.inspDate) continue;
          complianceToCreate.push({
            asset_id: assetId,
            building_id: selectedBuildingId,
            compliance_type: 'emergency_lighting',
            inspection_date: r.inspDate,
            next_due_date: r.nextDue,
            status: r.failed ? 'failed' : 'passed',
            inspector_company: parsedGlobal.contractor?.company || null,
            contractor_id: contractorId,
            certificate_number: parsedGlobal.contractor?.job_number || null,
            findings: r.f.failure_points || null,
            defects: r.failed ? [r.f.failure_points || 'Failed 90-minute discharge test'] : [],
            recommendations: r.failed ? (r.f.failure_points || 'Replace fitting') : null
          });
        }
        if (complianceToCreate.length) await chunkedBulkCreate('ComplianceRecord', complianceToCreate);
        totals.complianceRecords += complianceToCreate.length;

        // Work orders for failed fittings (one each, guarded against duplicate open WOs)
        for (const r of rowPlan) {
          if (!r.failed) continue;
          const assetId = idByAssetId.get(String(r.f.asset_id));
          if (!assetId) continue;
          try {
            const wos = await base44.entities.WorkOrder.filter({ asset_id: assetId });
            const hasOpen = wos.some((w) => ['open', 'in_progress', 'on_hold'].includes(w.status));
            if (hasOpen) continue;
            await base44.entities.WorkOrder.create({
              building_id: selectedBuildingId,
              asset_id: assetId,
              title: `Emergency Lighting Failure - Fitting ${r.f.fitting_number} (${r.f.asset_id})`,
              description: `Failed 90-minute discharge test during AS 2293.1 inspection on ${r.inspDate}.\nLocation: ${r.f.location || 'N/A'} (${r.f.building_and_level || 'N/A'})\nFitting type: ${r.f.fitting_type}\nFailure points: ${r.f.failure_points || 'Replace fitting'}`,
              main_category: 'fire_life_safety',
              subcategory: r.subcategory,
              priority: 'high',
              status: 'open',
              job_area: `${r.f.building_and_level || ''} - ${r.f.location || ''}`.trim(),
              auto_generated: true,
              source_type: 'manual',
              reported_by: user.email,
              notes: r.f.failure_points || null
            });
            totals.workOrdersCreated++;
          } catch (e) {
            console.error('WO create failed for fitting', r.f.asset_id, e);
          }
        }

        totals.passed += rowPlan.filter((r) => !r.failed).length;
        totals.failed += rowPlan.filter((r) => r.failed).length;
        totals.totalFittings += fittings.length;

        // Mark this batch's pages imported (extraction + persistence complete for them)
        for (let p = startPage; p < batchEnd; p++) importedSet.add(p);

        // Persist / update the ImportProgress record
        const importedArr = Array.from(importedSet).sort((a, b) => a - b);
        try {
          if (!progressId) {
            const created = await base44.entities.ImportProgress.create({
              building_id: selectedBuildingId,
              import_type: 'emergency_lighting',
              file_hash: fileHash,
              file_name: file.name,
              total_pages: totalPages,
              imported_pages: importedArr,
              total_fittings: totals.totalFittings,
              completed: !!done
            });
            progressId = created.id;
          } else {
            await base44.entities.ImportProgress.update(progressId, {
              total_pages: totalPages,
              imported_pages: importedArr,
              total_fittings: totals.totalFittings,
              completed: !!done
            });
          }
        } catch (e) {
          console.error('ImportProgress persist failed:', e);
        }

        // Granular progress UI
        setProgress({ processedPages: importedSet.size, totalPages, fittingsSoFar: totals.totalFittings });

        if (done) break;
        startPage = batchEnd;
      }

      setStage(null);
      setSummary({
        totalFittings: totals.totalFittings,
        assetsCreated: totals.assetsCreated,
        assetsUpdated: totals.assetsUpdated,
        complianceRecords: totals.complianceRecords,
        workOrdersCreated: totals.workOrdersCreated,
        passed: totals.passed,
        failed: totals.failed
      });
      toast.success(`Imported ${totals.totalFittings} fittings across ${totalPages} pages · ${totals.workOrdersCreated} work order(s) created`);
      queryClient.invalidateQueries({ queryKey: ['emergencyLighting'] });
      queryClient.invalidateQueries({ queryKey: ['emergencyLighting', 'assets'] });
      onComplete?.();
    } catch (e) {
      setStage(null);
      toast.error('Import failed: ' + e.message);
    } finally {
      setUploading(false);
    }
  };

  const barometer = [
    { label: 'Total Fittings', value: stats.total ?? '—', tone: 'text-[#0F172A]', icon: Zap },
    { label: '6-Mo Pass Rate', value: stats.total ? `${stats.passRate}%` : '—', tone: 'text-[#10B981]', icon: CheckCircle2 },
    { label: 'Open WO (Failed)', value: stats.openWOs ?? '—', tone: 'text-[#EF4444]', icon: Wrench },
  ];

  const busy = uploading || !!stage;
  const pct = progress && progress.totalPages ? Math.round((progress.processedPages / progress.totalPages) * 100) : 0;

  return (
    <div className="rounded-md border border-[#E2E8F0] bg-[#FFFFFF] overflow-hidden">
      <div className="flex flex-col lg:flex-row">
        {/* Compliance Barometer */}
        <div className="flex-1 p-5 border-b lg:border-b-0 lg:border-r border-[#E2E8F0] bg-[#F8FAFC]">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-1.5 h-5 bg-[#334155] rounded-sm" />
            <h2 className="text-[1.125rem] font-semibold text-[#0F172A] leading-tight" style={{ fontFamily: 'Inter' }}>
              Compliance Barometer
            </h2>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {barometer.map((b) => (
              <div key={b.label} className="rounded-md border border-[#E2E8F0] bg-[#FFFFFF] p-3">
                <div className="flex items-center gap-1.5 mb-1">
                  <b.icon className={`h-3.5 w-3.5 ${b.tone}`} />
                  <span className="text-[0.6875rem] uppercase tracking-wide text-[#64748B] font-medium">{b.label}</span>
                </div>
                <p className={`text-[1.5rem] font-bold leading-none ${b.tone}`} style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                  {b.value}
                </p>
              </div>
            ))}
          </div>
          {summary && (
            <div className="mt-4 rounded-md border border-[#E2E8F0] bg-[#FFFFFF] p-3">
              <p className="text-[0.6875rem] uppercase tracking-wide text-[#64748B] font-medium mb-2">Last Import</p>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[0.8125rem]">
                <span className="text-[#64748B]">Fittings parsed</span>
                <span className="font-semibold text-[#0F172A] text-right" style={{ fontFamily: 'JetBrains Mono, monospace' }}>{summary.totalFittings}</span>
                <span className="text-[#64748B]">Assets created</span>
                <span className="font-semibold text-[#0F172A] text-right" style={{ fontFamily: 'JetBrains Mono, monospace' }}>{summary.assetsCreated}</span>
                <span className="text-[#64748B]">Assets updated</span>
                <span className="font-semibold text-[#0F172A] text-right" style={{ fontFamily: 'JetBrains Mono, monospace' }}>{summary.assetsUpdated}</span>
                <span className="text-[#64748B]">Compliance records</span>
                <span className="font-semibold text-[#0F172A] text-right" style={{ fontFamily: 'JetBrains Mono, monospace' }}>{summary.complianceRecords}</span>
                <span className="text-[#64748B]">Work orders created</span>
                <span className="font-semibold text-[#EF4444] text-right" style={{ fontFamily: 'JetBrains Mono, monospace' }}>{summary.workOrdersCreated}</span>
              </div>
            </div>
          )}
        </div>

        {/* Drop zone */}
        <div className="flex-1 p-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-1.5 h-5 bg-[#EF4444] rounded-sm" />
            <h2 className="text-[1.125rem] font-semibold text-[#0F172A] leading-tight" style={{ fontFamily: 'Inter' }}>
              AS 2293.1 Register Import
            </h2>
          </div>
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => { e.preventDefault(); setDragOver(false); handleFile(e.dataTransfer.files[0]); }}
            className={`rounded-md border-2 border-dashed p-6 text-center transition-colors ${dragOver ? 'border-[#334155] bg-[#F1F5F9]' : 'border-[#E2E8F0] bg-[#F8FAFC]'}`}
          >
            <input type="file" accept="application/pdf" onChange={(e) => handleFile(e.target.files[0])} className="hidden" id="as2293-upload" />
            <label htmlFor="as2293-upload" className="cursor-pointer flex flex-col items-center gap-2">
              <div className="w-11 h-11 rounded-full bg-[#FEE2E2] flex items-center justify-center">
                <UploadCloud className="h-5 w-5 text-[#EF4444]" />
              </div>
              <p className="text-[0.875rem] font-medium text-[#0F172A]">{file ? file.name : 'Drop AS 2293.1 register PDF here'}</p>
              <p className="text-[0.75rem] text-[#64748B]">or click to browse · chunked extraction handles large multi-page registers</p>
            </label>
          </div>

          {resumeInfo && (
            <div className="mt-3 flex items-start gap-2 rounded-md border border-[#FEF3C7] bg-[#FFFBEB] p-2.5">
              <RotateCcw className="h-4 w-4 text-[#D97706] mt-0.5 flex-shrink-0" />
              <p className="text-[0.75rem] text-[#92400E]">
                Resuming — {resumeInfo.pagesAlreadyImported} page(s) already imported from a previous run of this register; only the remaining pages will be processed.
              </p>
            </div>
          )}

          <Button onClick={handleImport} disabled={!file || busy} className="w-full mt-4 bg-[#334155] hover:bg-[#1E293B] text-white">
            {uploading ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Uploading…</>
            ) : stage ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> {STAGE_LABEL[stage]}</>
            ) : (
              <><FileText className="h-4 w-4 mr-2" /> Import & Auto-Create</>
            )}
          </Button>

          {progress && (
            <div className="mt-3">
              <div className="flex items-center justify-between text-[0.75rem] text-[#64748B] mb-1">
                <span style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                  Extracting page {Math.min(progress.processedPages + (stage === 'extracting' ? 1 : 0), progress.totalPages)} of {progress.totalPages}…
                </span>
                <span style={{ fontFamily: 'JetBrains Mono, monospace' }}>{pct}% · {progress.fittingsSoFar} fittings</span>
              </div>
              <div className="h-2 w-full rounded-full bg-[#E2E8F0] overflow-hidden">
                <div className="h-full bg-gradient-to-r from-[#3B82F6] to-[#6366F1] transition-all duration-300" style={{ width: `${pct}%` }} />
              </div>
            </div>
          )}

          {summary && (
            <div className="mt-3 flex items-start gap-2 rounded-md border border-[#FEE2E2] bg-[#FEF2F2] p-2.5">
              <AlertTriangle className="h-4 w-4 text-[#EF4444] mt-0.5 flex-shrink-0" />
              <p className="text-[0.75rem] text-[#7F1D1D]">
                {summary.failed} fitting(s) failed the 90-minute discharge test and {summary.workOrdersCreated} repair work order(s) were auto-generated.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}