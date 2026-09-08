import React, { useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Loader2, UploadCloud, FileText, Package, ShieldCheck, Wrench, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { ASSET_CATEGORIES, formatSubcategoryLabel } from '@/components/categories/assetCategories';
import { getCategoryImportConfig, buildImportParams, INSPECTION_CATEGORIES } from '@/lib/categoryExtractorConfig';
import ImportSummary from './ImportSummary';

const OPEN_STATUSES = ['open', 'in_progress', 'on_hold'];

export default function CategoryImportPanel({ selectedBuildingId, mainCategory, subcategory, assets = [] }) {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [summary, setSummary] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const queryClient = useQueryClient();

  const cfg = getCategoryImportConfig(mainCategory);
  const categoryLabel = ASSET_CATEGORIES[mainCategory]?.label || mainCategory;
  const subLabel = subcategory ? formatSubcategoryLabel(subcategory) : null;

  // Barometer metrics — all from the already-filtered `assets` prop + a WorkOrder query
  const total = assets.length;
  const knownStatus = assets.filter((a) => a.compliance_status && a.compliance_status !== 'unknown');
  const compliant = knownStatus.filter((a) => a.compliance_status === 'compliant').length;
  const pctCompliant = knownStatus.length ? Math.round((compliant / knownStatus.length) * 100) : null;

  const assetIdSet = useMemo(() => new Set(assets.map((a) => a.id)), [assets]);

  const { data: workOrders = [] } = useQuery({
    queryKey: ['workOrders', selectedBuildingId],
    queryFn: async () => selectedBuildingId
      ? base44.entities.WorkOrder.filter({ building_id: selectedBuildingId })
      : base44.entities.WorkOrder.list(),
    enabled: total > 0
  });

  const openWOs = useMemo(
    () => workOrders.filter((w) => w.asset_id && assetIdSet.has(w.asset_id) && OPEN_STATUSES.includes(w.status)).length,
    [workOrders, assetIdSet]
  );

  const hasComplianceData = knownStatus.length > 0;
  const isInspectionCategory = INSPECTION_CATEGORIES.includes(mainCategory);
  const showBarometer = isInspectionCategory || hasComplianceData || total > 0;

  const handleFile = (f) => {
    if (!f) return;
    if (f.type !== 'application/pdf') { toast.error('Please select a PDF file'); return; }
    setFile(f);
    setSummary(null);
  };

  const handleImport = async () => {
    if (!file) { toast.error('Select a PDF first'); return; }
    if (!selectedBuildingId) { toast.error('Select a building first'); return; }
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setUploading(false);
      setProcessing(true);
      const params = buildImportParams(cfg, {
        file_url,
        buildingId: selectedBuildingId,
        documentId: null,
        fileName: file.name,
        mainCategory,
        subcategory
      });
      const res = await base44.functions.invoke(cfg.fn, params);
      const data = res.data || res;
      if (!data || data.success === false) throw new Error(data?.error || 'Extraction failed');
      setSummary(data);
      toast.success(`Import complete — ${data.created ?? 0} created, ${data.updated ?? 0} updated, ${data.linked ?? 0} linked`);
      queryClient.invalidateQueries({ queryKey: ['assets', selectedBuildingId] });
      queryClient.invalidateQueries({ queryKey: ['assets'] });
      queryClient.invalidateQueries({ queryKey: ['buildingDocuments'] });
      queryClient.invalidateQueries({ queryKey: ['complianceRecords'] });
      queryClient.invalidateQueries({ queryKey: ['workOrders', selectedBuildingId] });
      queryClient.invalidateQueries({ queryKey: ['maintenanceSchedules'] });
    } catch (e) {
      toast.error('Import failed: ' + e.message);
    } finally {
      setUploading(false);
      setProcessing(false);
    }
  };

  const busy = uploading || processing;
  const accent = cfg.accent;

  const barometer = [
    { label: 'Total Assets', value: total, tone: '#0F172A', icon: Package },
    { label: '% Compliant', value: pctCompliant === null ? '—' : `${pctCompliant}%`, tone: pctCompliant === null ? '#64748B' : (pctCompliant >= 90 ? '#10B981' : pctCompliant >= 70 ? '#F59E0B' : '#EF4444'), icon: ShieldCheck },
    { label: 'Open Work Orders', value: openWOs, tone: openWOs > 0 ? '#EF4444' : '#0F172A', icon: Wrench }
  ];

  return (
    <div className="rounded-md border border-[#E2E8F0] bg-[#FFFFFF] overflow-hidden">
      <div className="flex flex-col lg:flex-row">
        {/* Compliance Barometer */}
        {showBarometer && (
          <div className="flex-1 p-5 border-b lg:border-b-0 lg:border-r border-[#E2E8F0] bg-[#F8FAFC]">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-1.5 h-5 bg-[#2d3748] rounded-sm" />
              <h2 className="text-[1.125rem] font-semibold text-[#0F172A] leading-tight">Compliance Barometer</h2>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {barometer.map((b) => (
                <div key={b.label} className="rounded-md border border-[#E2E8F0] bg-[#FFFFFF] p-3">
                  <div className="flex items-center gap-1.5 mb-1">
                    <b.icon className="h-3.5 w-3.5" style={{ color: b.tone }} />
                    <span className="text-[0.6875rem] uppercase tracking-wide text-[#64748B] font-medium">{b.label}</span>
                  </div>
                  <p className="text-[1.5rem] font-bold leading-none" style={{ color: b.tone, fontFamily: 'JetBrains Mono, monospace' }}>
                    {b.value}
                  </p>
                </div>
              ))}
            </div>
            {!isInspectionCategory && !hasComplianceData && total > 0 && (
              <p className="mt-3 text-[0.6875rem] text-[#64748B] flex items-start gap-1.5">
                <AlertTriangle className="h-3 w-3 mt-0.5 flex-shrink-0" />
                No compliance data yet — import a register or run compliance checks to populate the pass rate.
              </p>
            )}
          </div>
        )}

        {/* Drop zone */}
        <div className={showBarometer ? "flex-1 p-5" : "p-5"}>
          <div className="flex items-center gap-2 mb-4">
            <div className="w-1.5 h-5 rounded-sm" style={{ background: accent }} />
            <h2 className="text-[1.125rem] font-semibold text-[#0F172A] leading-tight">
              {subLabel ? `${subLabel} Import` : `${categoryLabel} Import`}
            </h2>
          </div>
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => { e.preventDefault(); setDragOver(false); handleFile(e.dataTransfer.files[0]); }}
            className={`rounded-md border-2 border-dashed p-6 text-center transition-colors ${dragOver ? 'bg-[#F1F5F9]' : 'bg-[#F8FAFC]'}`}
            style={{ borderColor: dragOver ? accent : '#cbd5e0' }}
          >
            <input type="file" accept="application/pdf" onChange={(e) => handleFile(e.target.files[0])} className="hidden" id={`cat-import-${mainCategory}`} />
            <label htmlFor={`cat-import-${mainCategory}`} className="cursor-pointer flex flex-col items-center gap-2">
              <div className="w-11 h-11 rounded-full flex items-center justify-center" style={{ background: cfg.iconBg }}>
                <UploadCloud className="h-5 w-5" style={{ color: accent }} />
              </div>
              <p className="text-[0.875rem] font-medium text-[#0F172A]">{file ? file.name : `Drop ${cfg.dropLabel} here`}</p>
              <p className="text-[0.75rem] text-[#64748B]">or click to browse · AI extracts &amp; auto-creates assets (no duplicates on re-upload)</p>
            </label>
          </div>

          <p className="mt-3 text-[0.75rem] text-[#64748B]">{cfg.hint}</p>

          <Button onClick={handleImport} disabled={!file || busy} className="w-full mt-4 text-white" style={{ background: '#334155' }}>
            {uploading ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Uploading…</>
            ) : processing ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Extracting &amp; creating assets…</>
            ) : (
              <><FileText className="h-4 w-4 mr-2" /> Import &amp; Auto-Create</>
            )}
          </Button>

          {summary && (
            <div className="mt-5">
              <ImportSummary summary={summary} doneLabel="Close" />
              <div className="flex items-start gap-2 mt-3 rounded-md border border-[#FEE2E2] bg-[#FEF2F2] p-2.5">
                <CheckCircle2 className="h-4 w-4 text-[#10B981] mt-0.5 flex-shrink-0" />
                <p className="text-[0.75rem] text-[#7F1D1D]">
                  Asset counts and the barometer refresh automatically. Drop another register to continue.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}