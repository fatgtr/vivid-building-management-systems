import React, { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { EMERGENCY_LIGHTING_FITTING_TYPES } from '@/components/categories/assetCategories';
import { Button } from '@/components/ui/button';
import { Loader2, UploadCloud, FileText, CheckCircle2, AlertTriangle, Wrench, Zap } from 'lucide-react';
import { toast } from 'sonner';

const FITTING_LABELS = Object.fromEntries(EMERGENCY_LIGHTING_FITTING_TYPES.map((f) => [f.code, f.label]));

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

const STAGE_LABEL = {
  extracting: 'Extracting AS 2293.1 register…',
  'creating-assets': 'Creating / updating fitting assets…',
  'creating-compliance': 'Recording 6-monthly compliance…',
  'creating-workorders': 'Raising repair work orders…'
};

export default function EmergencyLightingImporter({ selectedBuildingId, stats, onComplete }) {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [stage, setStage] = useState(null);
  const [summary, setSummary] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const queryClient = useQueryClient();

  const handleFile = (f) => {
    if (!f) return;
    if (f.type !== 'application/pdf') { toast.error('Please select a PDF file'); return; }
    setFile(f);
    setSummary(null);
  };

  const handleImport = async () => {
    if (!file) { toast.error('Select an AS 2293.1 register PDF first'); return; }
    if (!selectedBuildingId) { toast.error('Select a building first'); return; }
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setUploading(false);
      setStage('extracting');
      const { data } = await base44.functions.invoke('extractEmergencyLightingRegister', { file_url });
      if (!data.success) { setStage(null); toast.error(data.error || 'Extraction failed'); return; }
      const parsed = data.data || {};
      const fittings = parsed.fittings || [];
      if (!fittings.length) { setStage(null); toast.error('No fittings found in register'); return; }

      setStage('creating-assets');
      const existing = await base44.entities.Asset.filter({ building_id: selectedBuildingId });
      const existingByAssetId = new Map();
      for (const a of existing) {
        if ((a.asset_subcategory === 'emergency_lighting' || a.asset_subcategory === 'exit_signage') && a.identifier) {
          existingByAssetId.set(String(a.identifier), a);
        }
      }

      let contractorId = null;
      if (parsed.contractor?.company) {
        try {
          const m = await base44.entities.Contractor.filter({ company_name: parsed.contractor.company });
          if (m && m.length) contractorId = m[0].id;
        } catch (_) { /* optional */ }
      }

      const toCreate = [], toUpdate = [], rowPlan = [];
      for (const f of fittings) {
        const subcategory = f.is_exit_sign ? 'exit_signage' : 'emergency_lighting';
        const fittingLabel = FITTING_LABELS[f.fitting_type_code] || f.fitting_type || 'Emergency/Exit Fitting';
        const inspDate = f.inspection_date || parsed.inspection_date || null;
        const nextDue = inspDate ? addMonthsISO(inspDate, 6) : null;
        const failed = String(f.result).toLowerCase() === 'fail';
        const ex = existingByAssetId.get(String(f.asset_id));
        const assetFields = {
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
        };
        rowPlan.push({ f, subcategory, inspDate, nextDue, failed, existing: ex, assetFields });
        if (ex) toUpdate.push({ id: ex.id, ...assetFields });
        else toCreate.push(assetFields);
      }

      let createdAssets = [];
      if (toCreate.length) createdAssets = await base44.entities.Asset.bulkCreate(toCreate);
      if (toUpdate.length) await base44.entities.Asset.bulkUpdate(toUpdate);

      setStage('creating-compliance');
      const idByAssetId = new Map();
      for (const a of createdAssets) if (a.identifier) idByAssetId.set(String(a.identifier), a.id);
      for (const r of rowPlan) if (r.existing) idByAssetId.set(String(r.f.asset_id), r.existing.id);

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
          inspector_company: parsed.contractor?.company || null,
          contractor_id: contractorId,
          certificate_number: parsed.contractor?.job_number || null,
          findings: r.f.failure_points || null,
          defects: r.failed ? [r.f.failure_points || 'Failed 90-minute discharge test'] : [],
          recommendations: r.failed ? (r.f.failure_points || 'Replace fitting') : null
        });
      }
      if (complianceToCreate.length) await base44.entities.ComplianceRecord.bulkCreate(complianceToCreate);

      setStage('creating-workorders');
      const user = await base44.auth.me();
      let woCreated = 0;
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
          woCreated++;
        } catch (e) {
          console.error('WO create failed for fitting', r.f.asset_id, e);
        }
      }

      setStage(null);
      const passed = rowPlan.filter((r) => !r.failed).length;
      const failedCount = rowPlan.filter((r) => r.failed).length;
      setSummary({
        totalFittings: fittings.length,
        assetsCreated: toCreate.length,
        assetsUpdated: toUpdate.length,
        complianceRecords: complianceToCreate.length,
        workOrdersCreated: woCreated,
        passed,
        failed: failedCount
      });
      toast.success(`Imported ${fittings.length} fittings · ${woCreated} work order(s) created`);
      queryClient.invalidateQueries({ queryKey: ['emergencyLighting'] });
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
              <p className="text-[0.75rem] text-[#64748B]">or click to browse · auto-creates assets, compliance records & failed-fitting work orders</p>
            </label>
          </div>
          <Button onClick={handleImport} disabled={!file || busy} className="w-full mt-4 bg-[#334155] hover:bg-[#1E293B] text-white">
            {uploading ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Uploading…</>
            ) : stage ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> {STAGE_LABEL[stage]}</>
            ) : (
              <><FileText className="h-4 w-4 mr-2" /> Import & Auto-Create</>
            )}
          </Button>
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