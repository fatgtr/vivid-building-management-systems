import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import EmergencyLightingImporter from './EmergencyLightingImporter';
import EmergencyLightingTable from './EmergencyLightingTable';
import EmergencyLightingInspector from './EmergencyLightingInspector';
import { Flame, Zap, Filter, X } from 'lucide-react';

export default function EmergencyLightingRegister({ selectedBuildingId, buildings, getBuildingName }) {
  const [filterLevel, setFilterLevel] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [selectedRow, setSelectedRow] = useState(null);

  const isEmergencySub = (a) => a.asset_subcategory === 'emergency_lighting' || a.asset_subcategory === 'exit_signage';

  const { data: assets = [], isLoading: loadingAssets } = useQuery({
    queryKey: ['emergencyLighting', 'assets', selectedBuildingId],
    queryFn: async () => {
      const result = selectedBuildingId
        ? await base44.entities.Asset.filter({ building_id: selectedBuildingId })
        : await base44.entities.Asset.list();
      return result.filter(isEmergencySub);
    }
  });

  const { data: compliance = [] } = useQuery({
    queryKey: ['emergencyLighting', 'compliance', selectedBuildingId],
    queryFn: async () => {
      const result = selectedBuildingId
        ? await base44.entities.ComplianceRecord.filter({ building_id: selectedBuildingId, compliance_type: 'emergency_lighting' })
        : await base44.entities.ComplianceRecord.filter({ compliance_type: 'emergency_lighting' });
      return result;
    }
  });

  const { data: workOrders = [] } = useQuery({
    queryKey: ['emergencyLighting', 'workOrders', selectedBuildingId],
    queryFn: async () => {
      const result = selectedBuildingId
        ? await base44.entities.WorkOrder.filter({ building_id: selectedBuildingId })
        : await base44.entities.WorkOrder.list();
      return result.filter((w) => w.subcategory === 'emergency_lighting' || w.subcategory === 'exit_signage' || w.asset_id);
    }
  });

  // Latest compliance record per asset
  const complianceByAsset = useMemo(() => {
    const m = new Map();
    for (const c of compliance) {
      if (!c.asset_id) continue;
      const cur = m.get(c.asset_id);
      if (!cur || new Date(c.inspection_date) > new Date(cur.inspection_date)) m.set(c.asset_id, c);
    }
    return m;
  }, [compliance]);

  // Full compliance history per asset
  const historyByAsset = useMemo(() => {
    const m = new Map();
    for (const c of compliance) {
      if (!c.asset_id) continue;
      const arr = m.get(c.asset_id) || [];
      arr.push(c);
      m.set(c.asset_id, arr);
    }
    for (const arr of m.values()) arr.sort((a, b) => new Date(b.inspection_date) - new Date(a.inspection_date));
    return m;
  }, [compliance]);

  const openWOsByAsset = useMemo(() => {
    const m = new Map();
    for (const w of workOrders) {
      if (!['open', 'in_progress', 'on_hold'].includes(w.status)) continue;
      if (!w.asset_id) continue;
      const arr = m.get(w.asset_id) || [];
      arr.push(w);
      m.set(w.asset_id, arr);
    }
    return m;
  }, [workOrders]);

  const rows = useMemo(() => assets.map((a) => ({
    asset: a,
    compliance: complianceByAsset.get(a.id),
    history: historyByAsset.get(a.id) || [],
    workOrders: openWOsByAsset.get(a.id) || []
  })), [assets, complianceByAsset, historyByAsset, openWOsByAsset]);

  // Stats for the Compliance Barometer
  const total = rows.length;
  const passed = rows.filter((r) => r.compliance?.status === 'passed').length;
  const failed = rows.filter((r) => r.compliance?.status === 'failed').length;
  const passRate = total ? Math.round((passed / total) * 100) : 0;
  const openWOs = rows.reduce((s, r) => s + r.workOrders.length, 0);

  // Filter options
  const levels = useMemo(() => [...new Set(assets.map((a) => a.floor).filter(Boolean))].sort(), [assets]);
  const types = useMemo(() => [...new Set(assets.map((a) => a.asset_type).filter(Boolean))].sort(), [assets]);

  const filteredRows = useMemo(() => rows.filter((r) => {
    if (filterLevel !== 'all' && r.asset.floor !== filterLevel) return false;
    if (filterType !== 'all' && r.asset.asset_type !== filterType) return false;
    if (filterStatus !== 'all') {
      const s = r.compliance?.status;
      if (filterStatus === 'passed' && s !== 'passed') return false;
      if (filterStatus === 'failed' && s !== 'failed') return false;
      if (filterStatus === 'untested' && s) return false;
    }
    return true;
  }), [rows, filterLevel, filterType, filterStatus]);

  const hasActiveFilters = filterLevel !== 'all' || filterType !== 'all' || filterStatus !== 'all';

  return (
    <div className="space-y-4">
      {/* Region 1: Importer + Barometer */}
      <EmergencyLightingImporter
        selectedBuildingId={selectedBuildingId}
        stats={{ total, passRate, openWOs }}
        onComplete={() => {}}
      />

      {/* Region 2: Dual-category indicator + sticky filter strip */}
      <div className="sticky top-0 z-10 rounded-md border border-[#E2E8F0] bg-[#FFFFFF] p-3">
        <div className="flex flex-col lg:flex-row lg:items-center gap-3">
          <div className="flex items-center gap-2 flex-shrink-0">
            <span className="inline-flex items-center gap-1 rounded-full bg-[#EF4444]/10 px-2.5 py-1 text-[0.6875rem] font-semibold text-[#EF4444]">
              <Flame className="h-3 w-3" /> Fire & Life Safety
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-[#F59E0B]/10 px-2.5 py-1 text-[0.6875rem] font-semibold text-[#F59E0B]">
              <Zap className="h-3 w-3" /> Electrical Services
            </span>
            <span className="text-[0.6875rem] text-[#64748B] hidden xl:inline">synced view</span>
          </div>
          <div className="flex flex-1 flex-wrap items-center gap-2">
            <div className="flex items-center gap-1 text-[0.6875rem] text-[#64748B] font-medium">
              <Filter className="h-3.5 w-3.5" /> Filters
            </div>
            <Select value={filterLevel} onValueChange={setFilterLevel}>
              <SelectTrigger className="h-8 w-auto min-w-[140px] text-[0.8125rem] border-[#E2E8F0]">
                <SelectValue placeholder="Building / Level" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Levels</SelectItem>
                {levels.map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="h-8 w-auto min-w-[150px] text-[0.8125rem] border-[#E2E8F0]">
                <SelectValue placeholder="Fitting Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Fitting Types</SelectItem>
                {types.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="h-8 w-auto min-w-[140px] text-[0.8125rem] border-[#E2E8F0]">
                <SelectValue placeholder="Pass / Fail" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Results</SelectItem>
                <SelectItem value="passed">Pass</SelectItem>
                <SelectItem value="failed">Fail</SelectItem>
                <SelectItem value="untested">No Test</SelectItem>
              </SelectContent>
            </Select>
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" className="h-8 px-2 text-[#64748B]" onClick={() => { setFilterLevel('all'); setFilterType('all'); setFilterStatus('all'); }}>
                <X className="h-3.5 w-3.5 mr-1" /> Clear
              </Button>
            )}
            <div className="ml-auto text-[0.75rem] text-[#64748B]" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
              {filteredRows.length} / {rows.length} fittings
            </div>
          </div>
        </div>
      </div>

      {/* Region 3: Matrix table / mobile cards */}
      {loadingAssets ? (
        <div className="rounded-md border border-[#E2E8F0] bg-[#FFFFFF] p-12 text-center">
          <p className="text-[0.875rem] text-[#64748B]">Loading fittings…</p>
        </div>
      ) : (
        <EmergencyLightingTable rows={filteredRows} onRowClick={setSelectedRow} />
      )}

      {/* Region 4: Slide-over inspector */}
      <EmergencyLightingInspector
        row={selectedRow}
        open={!!selectedRow}
        onOpenChange={(o) => !o && setSelectedRow(null)}
      />
    </div>
  );
}