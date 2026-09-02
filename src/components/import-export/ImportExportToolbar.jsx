import React, { useState, useEffect, useRef } from 'react';
import * as XLSX from 'xlsx';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Download, Upload, FileSpreadsheet, Loader2, CheckCircle2, AlertTriangle, X, ArrowDownToLine, ArrowUpFromLine } from 'lucide-react';
import { DATASETS, normalizeRow } from '@/lib/mybosConfigs';
import { queryClientInstance } from '@/lib/query-client';

// Query keys most likely to feed the pages consuming these datasets
const INVALIDATE_KEYS = ['maintenanceSchedules', 'workOrders', 'residents', 'units', 'assets', 'fsync-schedules', 'fsync-wos'];

const isRowEmpty = (raw) => Object.values(raw).every((v) => v === '' || v == null);

export default function ImportExportToolbar({ dataset, buildingId: buildingIdProp }) {
  const config = DATASETS[dataset];
  const fileRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [stage, setStage] = useState('upload'); // upload | preview | importing | results
  const [busy, setBusy] = useState(false);
  const [exportBusy, setExportBusy] = useState(false);
  const [pickedBuildingId, setPickedBuildingId] = useState(buildingIdProp || '');
  const [rawRows, setRawRows] = useState([]);
  const [pending, setPending] = useState([]);
  const [rowErrors, setRowErrors] = useState([]);
  const [results, setResults] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');

  const buildingId = buildingIdProp || pickedBuildingId;

  // Map Mybos column headers → canonical field keys (for the preview table)
  const headerToCanon = {};
  Object.entries(config.fieldMap).forEach(([canon, aliases]) => aliases.forEach((a) => { headerToCanon[a.toLowerCase().trim()] = canon; }));
  const previewCols = config.columns.slice(0, 6).map((c) => ({ header: c.header, canon: headerToCanon[c.header.toLowerCase().trim()] || '' }));

  const { data: buildings = [] } = useQuery({ queryKey: ['buildings'], queryFn: () => base44.entities.Building.list() });
  const { data: lookups, isFetching } = useQuery({
    queryKey: ['ie-lookups', config.key, buildingId],
    queryFn: () => config.fetchLookups(buildingId),
    enabled: !!buildingId && open,
  });

  // Validate when previewing and lookups are ready
  useEffect(() => {
    if (!open || stage !== 'preview' || !lookups) return;
    const ok = [];
    const errs = [];
    rawRows.forEach((raw, idx) => {
      if (isRowEmpty(raw)) return;
      const norm = normalizeRow(raw, config.fieldMap);
      const res = config.validateRow(norm, lookups, buildingId);
      if (res.ok) ok.push({ row: norm, resolved: res.resolved, extra: res.extra || {}, _num: idx + 2 });
      else errs.push({ row: idx + 2, reason: res.error, data: raw });
    });
    setPending(ok);
    setRowErrors(errs);
  }, [open, stage, rawRows, lookups, buildingId, config]);

  const handleTemplate = () => {
    const aoa = [config.columns.map((c) => c.header), ...config.columns.map(() => '')];
    const ws = XLSX.utils.aoa_to_sheet(aoa);
    ws['!cols'] = config.columns.map((c) => ({ wch: Math.max(18, c.header.length + 4) }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, config.sheetName || config.fileName);
    if (config.instructions) {
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(config.instructions), 'Instructions');
    }
    XLSX.writeFile(wb, `${config.fileName}_template.xlsx`);
  };

  const handleFilePicked = async (file) => {
    if (!file) return;
    setBusy(true);
    setErrorMsg('');
    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: 'array', cellDates: true });
      const sheetName = config.sheetName && wb.SheetNames.includes(config.sheetName)
        ? config.sheetName
        : wb.SheetNames[0];
      const ws = wb.Sheets[sheetName];
      const json = XLSX.utils.sheet_to_json(ws, { defval: '', raw: false });
      if (!json.length) {
        setErrorMsg('The file has no data rows.');
        setBusy(false);
        return;
      }
      setRawRows(json);
      setResults(null);
      setStage('preview');
      setOpen(true);
    } catch (e) {
      setErrorMsg('Could not read file: ' + e.message);
    }
    setBusy(false);
  };

  const handleConfirm = async () => {
    setBusy(true);
    setStage('importing');
    try {
      const outcome = await config.createRecords(pending, lookups, buildingId);
      setResults({ ...outcome, total: pending.length });
      setStage('results');
      INVALIDATE_KEYS.forEach((k) => {
        try { queryClientInstance.invalidateQueries({ queryKey: [k] }); } catch (_) { /* noop */ }
      });
      queryClientInstance.invalidateQueries(); // broad refresh fallback
    } catch (e) {
      setErrorMsg('Import failed: ' + e.message);
      setStage('preview');
    }
    setBusy(false);
  };

  const handleExport = async () => {
    setExportBusy(true);
    try {
      const entities = await config.fetchForExport(buildingId);
      const lookupsForExport = await config.fetchLookups(buildingId);
      const rows = entities.map((e) => config.mapEntityToRow(e, lookupsForExport));
      const aoa = [config.columns.map((c) => c.header), ...rows.map((r) => config.columns.map((c) => r[c.header] ?? ''))];
      const ws = XLSX.utils.aoa_to_sheet(aoa);
      ws['!cols'] = config.columns.map((c) => ({ wch: Math.max(18, c.header.length + 4) }));
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, config.sheetName || config.fileName);
      XLSX.writeFile(wb, `${config.fileName}_export.xlsx`);
    } catch (e) {
      alert('Export failed: ' + e.message);
    }
    setExportBusy(false);
  };

  const close = () => {
    setOpen(false);
    setTimeout(() => {
      setStage('upload');
      setRawRows([]);
      setPending([]);
      setRowErrors([]);
      setResults(null);
      setErrorMsg('');
    }, 200);
  };

  const previewSamples = pending.slice(0, 8);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button variant="outline" size="sm" onClick={handleTemplate} className="gap-2">
        <FileSpreadsheet className="h-4 w-4" />
        Template
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={() => fileRef.current?.click()}
        disabled={busy}
        className="gap-2"
      >
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowDownToLine className="h-4 w-4" />}
        Import
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={handleExport}
        disabled={exportBusy}
        className="gap-2"
      >
        {exportBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowUpFromLine className="h-4 w-4" />}
        Export
      </Button>
      <input
        ref={fileRef}
        type="file"
        accept=".xlsx,.csv"
        className="hidden"
        onChange={(e) => { handleFilePicked(e.target.files?.[0]); e.target.value = ''; }}
      />

      <Dialog open={open} onOpenChange={(o) => { if (!o) close(); }}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5 text-blue-600" />
              {config.label} — Import
            </DialogTitle>
          </DialogHeader>

          {!buildingIdProp && (
            <div className="flex flex-col gap-1.5">
              <Label>Target building *</Label>
              <Select value={pickedBuildingId} onValueChange={setPickedBuildingId}>
                <SelectTrigger><SelectValue placeholder="Select building" /></SelectTrigger>
                <SelectContent>
                  {buildings.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}

          {errorMsg && (
            <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
              <AlertTriangle className="h-4 w-4" /> {errorMsg}
            </div>
          )}

          {stage === 'preview' && (
            <div className="space-y-4">
              {isFetching ? (
                <div className="flex items-center gap-2 text-sm text-slate-500 py-8 justify-center">
                  <Loader2 className="h-4 w-4 animate-spin" /> Checking records…
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="rounded-lg border border-slate-200 p-3 text-center">
                      <p className="text-xs text-slate-500">Total rows</p>
                      <p className="text-2xl font-bold text-slate-900">{rawRows.filter((r) => !isRowEmpty(r)).length}</p>
                    </div>
                    <div className="rounded-lg border border-green-200 bg-green-50 p-3 text-center">
                      <p className="text-xs text-green-700">Ready to import</p>
                      <p className="text-2xl font-bold text-green-700">{pending.length}</p>
                    </div>
                    <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-center">
                      <p className="text-xs text-red-700">Skipped rows</p>
                      <p className="text-2xl font-bold text-red-700">{rowErrors.length}</p>
                    </div>
                  </div>

                  {previewSamples.length > 0 && (
                    <div>
                      <h4 className="text-sm font-semibold text-slate-700 mb-2">Preview (first {previewSamples.length})</h4>
                      <div className="border border-slate-200 rounded-lg overflow-hidden">
                        <div className="overflow-x-auto max-h-56">
                          <table className="w-full text-xs">
                            <thead className="bg-slate-50 sticky top-0">
                              <tr>
                                <th className="text-left px-2 py-1.5 font-medium text-slate-600">Row</th>
                                {previewCols.map((c) => (
                                  <th key={c.header} className="text-left px-2 py-1.5 font-medium text-slate-600">{c.header}</th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {previewSamples.map((p) => (
                                <tr key={p._num} className="border-t border-slate-100">
                                  <td className="px-2 py-1.5 text-slate-500">{p._num}</td>
                                  {previewCols.map((c) => (
                                    <td key={c.header} className="px-2 py-1.5 text-slate-700 truncate max-w-[160px]">{String(p.row[c.canon] ?? '').slice(0, 40)}</td>
                                  ))}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  )}

                  {rowErrors.length > 0 && (
                    <div>
                      <h4 className="text-sm font-semibold text-red-700 mb-2 flex items-center gap-1.5">
                        <AlertTriangle className="h-4 w-4" /> Skipped rows ({rowErrors.length})
                      </h4>
                      <div className="border border-red-100 rounded-lg overflow-hidden max-h-48 overflow-y-auto">
                        <table className="w-full text-xs">
                          <thead className="bg-red-50 sticky top-0">
                            <tr>
                              <th className="text-left px-2 py-1.5 font-medium text-red-700 w-16">Row</th>
                              <th className="text-left px-2 py-1.5 font-medium text-red-700">Reason</th>
                            </tr>
                          </thead>
                          <tbody>
                            {rowErrors.slice(0, 50).map((e) => (
                              <tr key={e.row} className="border-t border-red-50">
                                <td className="px-2 py-1.5 text-slate-600">{e.row}</td>
                                <td className="px-2 py-1.5 text-red-700">{e.reason}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {stage === 'importing' && (
            <div className="flex flex-col items-center py-12 gap-2">
              <Loader2 className="h-6 w-6 text-blue-600 animate-spin" />
              <p className="text-sm text-slate-500">Importing {pending.length} records…</p>
            </div>
          )}

          {stage === 'results' && results && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 text-green-700">
                <CheckCircle2 className="h-8 w-8" />
                <div>
                  <p className="text-lg font-bold">Import complete</p>
                  <p className="text-sm text-slate-600">{results.created} record{results.created !== 1 ? 's' : ''} created{results.extras ? ` • ${results.extras}` : ''}{results.failed ? ` • ${results.failed} failed` : ''}.</p>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            {stage === 'preview' && (
              <>
                <Button variant="outline" onClick={close}>Cancel</Button>
                <Button onClick={handleConfirm} disabled={!buildingId || isFetching || pending.length === 0} className="bg-blue-600 hover:bg-blue-700">
                  <Upload className="h-4 w-4 mr-2" /> Import {pending.length} records
                </Button>
              </>
            )}
            {stage === 'results' && <Button onClick={close}>Done</Button>}
            {stage === 'importing' && <Button disabled><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Importing…</Button>}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}