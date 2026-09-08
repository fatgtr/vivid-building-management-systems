import React, { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Loader2, UploadCloud, FileText, CheckCircle2, AlertTriangle, Wrench, Zap, RotateCcw, Link2 } from 'lucide-react';
import { toast } from 'sonner';

const BATCH_SIZE = 5;

async function sha256(file) {
  const buf = await file.arrayBuffer();
  const hash = await crypto.subtle.digest('SHA-256', buf);
  return Array.from(new Uint8Array(hash)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

const STAGE_LABEL = { extracting: 'Extracting AS 2293.1 register…', persisting: 'Saving fittings & compliance…' };

export default function EmergencyLightingImporter({ selectedBuildingId, stats, onComplete }) {
  const [file, setFile] = useState(null);
  const [fileHash, setFileHash] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [stage, setStage] = useState(null);
  const [summary, setSummary] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const [progress, setProgress] = useState(null);
  const [resumeInfo, setResumeInfo] = useState(null);
  const queryClient = useQueryClient();

  const handleFile = async (f) => {
    if (!f) return;
    if (f.type !== 'application/pdf') { toast.error('Please select a PDF file'); return; }
    setFile(f);
    setSummary(null);
    setProgress(null);
    setResumeInfo(null);
    try {
      setFileHash(await sha256(f));
    } catch (e) {
      setFileHash(`${f.name}:${f.size}`);
    }
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
      } catch (_) { /* entity may not exist yet */ }

      let importedSet = new Set();
      let progressId = null;
      if (progressRec && progressRec.completed) {
        try { await base44.entities.ImportProgress.delete(progressRec.id); } catch (_) {}
        progressRec = null;
      }
      if (progressRec && !progressRec.completed) {
        importedSet = new Set((progressRec.imported_pages || []).map(Number));
        progressId = progressRec.id;
        if (importedSet.size > 0) setResumeInfo({ pagesAlreadyImported: importedSet.size });
      }

      let startPage = 0;
      while (importedSet.has(startPage)) startPage++;

      let documentId = null;
      const totals = { assetsCreated: 0, assetsUpdated: 0, complianceRecords: 0, workOrdersCreated: 0, linked: 0, totalFittings: 0 };
      let totalPages = 0;

      // Main batch loop — backend extracts + persists each batch
      // eslint-disable-next-line no-constant-condition
      while (true) {
        setStage('extracting');
        const { data } = await base44.functions.invoke('extractEmergencyLightingRegister', {
          file_url,
          start_page: startPage,
          batch_size: BATCH_SIZE,
          building_id: selectedBuildingId,
          documentId,
          fileName: file.name
        });
        if (!data.success) { setStage(null); toast.error(data.error || 'Extraction failed'); return; }

        const batchData = data.data || {};
        totalPages = data.totalPages || totalPages;
        const batchEnd = data.batchEnd;
        const done = data.done;

        if (data.documentId) documentId = data.documentId;
        totals.assetsCreated += batchData.assetsCreated || 0;
        totals.assetsUpdated += batchData.assetsUpdated || 0;
        totals.complianceRecords += batchData.complianceRecords || 0;
        totals.workOrdersCreated += batchData.workOrdersCreated || 0;
        totals.linked += batchData.linked || 0;
        totals.totalFittings += (batchData.fittings || []).length;

        for (let p = startPage; p < batchEnd; p++) importedSet.add(p);

        // Persist / update ImportProgress
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

        setProgress({ processedPages: importedSet.size, totalPages, fittingsSoFar: totals.totalFittings });

        if (done) break;
        startPage = batchEnd;
      }

      setStage(null);
      setSummary({
        created: totals.assetsCreated,
        updated: totals.assetsUpdated,
        unmatched: 0,
        documentId,
        linked: totals.linked,
        complianceRecords: totals.complianceRecords,
        workOrders: totals.workOrdersCreated
      });
      toast.success(`Imported ${totals.totalFittings} fittings across ${totalPages} pages · ${totals.workOrdersCreated} work order(s) created`);
      queryClient.invalidateQueries({ queryKey: ['emergencyLighting'] });
      queryClient.invalidateQueries({ queryKey: ['emergencyLighting', 'assets'] });
      queryClient.invalidateQueries({ queryKey: ['assets', selectedBuildingId] });
      queryClient.invalidateQueries({ queryKey: ['assets'] });
      queryClient.invalidateQueries({ queryKey: ['buildingDocuments'] });
      queryClient.invalidateQueries({ queryKey: ['complianceRecords'] });
      queryClient.invalidateQueries({ queryKey: ['workOrders'] });
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
    { label: 'Open WO (Failed)', value: stats.openWOs ?? '—', tone: 'text-[#EF4444]', icon: Wrench }
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
                <span className="text-[#64748B]">Assets created</span>
                <span className="font-semibold text-[#0F172A] text-right" style={{ fontFamily: 'JetBrains Mono, monospace' }}>{summary.created}</span>
                <span className="text-[#64748B]">Assets updated</span>
                <span className="font-semibold text-[#0F172A] text-right" style={{ fontFamily: 'JetBrains Mono, monospace' }}>{summary.updated}</span>
                <span className="text-[#64748B] flex items-center gap-1"><Link2 className="h-3 w-3" /> Linked to doc</span>
                <span className="font-semibold text-[#0F172A] text-right" style={{ fontFamily: 'JetBrains Mono, monospace' }}>{summary.linked}</span>
                <span className="text-[#64748B]">Compliance records</span>
                <span className="font-semibold text-[#0F172A] text-right" style={{ fontFamily: 'JetBrains Mono, monospace' }}>{summary.complianceRecords}</span>
                <span className="text-[#64748B]">Work orders created</span>
                <span className="font-semibold text-[#EF4444] text-right" style={{ fontFamily: 'JetBrains Mono, monospace' }}>{summary.workOrders}</span>
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
              <><FileText className="h-4 w-4 mr-2" /> Import &amp; Auto-Create</>
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
                {summary.workOrders} fitting(s) failed the 90-minute discharge test and {summary.workOrders} repair work order(s) were auto-generated.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}