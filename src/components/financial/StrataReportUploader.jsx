import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Upload, FileText, Loader2, PencilLine, Trash2, Plus, CheckCircle2, Building2, AlertCircle } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

const blankReport = () => ({
  strata_plan_number: '',
  address: '',
  strata_manager_name: '',
  report_period_start: '',
  report_period_end: '',
  as_at_date: '',
  admin_fund: {
    income_actual: 0, income_budget: 0, income_prior_year: 0,
    expenditure_actual: 0, expenditure_budget: 0, expenditure_prior_year: 0,
    opening_balance: 0, closing_balance: 0, surplus_deficit: 0,
  },
  capital_works_fund: {
    income_actual: 0, income_budget: 0, income_prior_year: 0,
    expenditure_actual: 0, expenditure_budget: 0, expenditure_prior_year: 0,
    opening_balance: 0, closing_balance: 0, surplus_deficit: 0,
  },
  bank_admin_balance: 0, bank_capital_works_balance: 0, bank_total_balance: 0,
  total_assets: 0, total_liabilities: 0, owners_funds_total: 0,
  creditors_total: 0, levies_in_arrears: 0, levies_in_advance: 0,
  admin_expenditure_lines: [],
  capital_works_expenditure_lines: [],
  creditor_lines: [],
});

function NumberField({ label, value, onChange }) {
  return (
    <div>
      <Label className="text-xs text-slate-500">{label}</Label>
      <Input
        type="number"
        step="0.01"
        value={value ?? 0}
        onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
        className="mt-1"
      />
    </div>
  );
}

function LineItemsEditor({ title, lines, onChange, fundType, showPayee = false, allowBudget = true }) {
  const update = (i, field, val) => {
    const next = [...lines];
    next[i] = { ...next[i], [field]: val };
    onChange(next);
  };
  const add = () => onChange([...lines, { category: '', budget: 0, actual: 0, payee: '' }]);
  const remove = (i) => onChange(lines.filter((_, idx) => idx !== i));

  return (
    <div className="border border-slate-200 rounded-lg p-4 bg-slate-50/50">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-semibold text-slate-700">{title}</h4>
        <Button type="button" variant="outline" size="sm" onClick={add}>
          <Plus className="h-3 w-3 mr-1" /> Add line
        </Button>
      </div>
      <div className="space-y-2">
        {lines.length === 0 && <p className="text-xs text-slate-400 italic py-2">No line items.</p>}
        {lines.map((line, i) => (
          <div key={i} className="grid grid-cols-12 gap-2 items-start bg-white rounded-md p-2 border border-slate-100">
            <Input
              className="col-span-4 text-sm"
              placeholder="Category / line name"
              value={line.category || ''}
              onChange={(e) => update(i, 'category', e.target.value)}
            />
            {showPayee && (
              <Input
                className="col-span-3 text-sm"
                placeholder="Payee"
                value={line.payee || ''}
                onChange={(e) => update(i, 'payee', e.target.value)}
              />
            )}
            {allowBudget && (
              <Input
                type="number" step="0.01"
                className={`col-span-${showPayee ? '2' : '3'} text-sm`}
                placeholder="Budget"
                value={line.budget ?? 0}
                onChange={(e) => update(i, 'budget', parseFloat(e.target.value) || 0)}
              />
            )}
            <Input
              type="number" step="0.01"
              className={`col-span-${allowBudget ? (showPayee ? '2' : '3') : '4'} text-sm`}
              placeholder="Actual"
              value={line.actual ?? 0}
              onChange={(e) => update(i, 'actual', parseFloat(e.target.value) || 0)}
            />
            <Button type="button" variant="ghost" size="icon" className="col-span-1 h-8 w-8" onClick={() => remove(i)}>
              <Trash2 className="h-3.5 w-3.5 text-red-500" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function StrataReportUploader({ buildingId }) {
  const [stage, setStage] = useState('idle'); // idle | uploading | extracting | reviewing
  const [reportData, setReportData] = useState(null);
  const [sourceUrl, setSourceUrl] = useState(null);
  const [matchBuildingId, setMatchBuildingId] = useState(buildingId || '');
  const [matchWarning, setMatchWarning] = useState(null);
  const [fileName, setFileName] = useState('');
  const queryClient = useQueryClient();

  const { data: buildings = [] } = useQuery({
    queryKey: ['buildings-all'],
    queryFn: () => base44.entities.Building.list(),
  });

  const findBuildingMatch = (spn, addr) => {
    if (spn) {
      const bySp = buildings.find((b) => b.strata_plan_number && b.strata_plan_number === spn);
      if (bySp) return bySp;
    }
    if (addr) {
      const norm = addr.toLowerCase().trim();
      const byAddr = buildings.find((b) => b.address && b.address.toLowerCase().includes(norm.substring(0, 15)));
      if (byAddr) return byAddr;
    }
    return null;
  };

  const handleFile = async (file) => {
    try {
      setStage('uploading');
      setFileName(file.name);
      const { data: uploadRes } = await base44.integrations.Core.UploadFile({ file });
      const fileUrl = uploadRes.file_url;
      setSourceUrl(fileUrl);
      setStage('extracting');
      const { data: extractRes } = await base44.functions.invoke('extractStrataFinancialReport', { file_url: fileUrl });
      const extracted = extractRes.data || extractRes;
      const merged = { ...blankReport(), ...extracted,
        admin_fund: { ...blankReport().admin_fund, ...(extracted.admin_fund || {}) },
        capital_works_fund: { ...blankReport().capital_works_fund, ...(extracted.capital_works_fund || {}) },
      };
      setReportData(merged);
      const matched = findBuildingMatch(extracted.strata_plan_number, extracted.address);
      if (matched) {
        setMatchBuildingId(matched.id);
        if (buildingId && matched.id !== buildingId) {
          setMatchWarning(`Report matched to "${matched.name}" by strata plan/address, which differs from the currently selected building. Confirm the link before saving.`);
        } else {
          setMatchWarning(null);
        }
      } else {
        setMatchBuildingId(buildingId || '');
        setMatchWarning('No building matched by strata plan number or address. Select the correct building before saving.');
      }
      setStage('reviewing');
    } catch (err) {
      toast.error('Extraction failed: ' + (err.message || 'Unknown error'));
      setStage('idle');
    }
  };

  const startManual = () => {
    setReportData(blankReport());
    setSourceUrl(null);
    setFileName('');
    setMatchBuildingId(buildingId || '');
    setMatchWarning(null);
    setStage('reviewing');
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const r = reportData;
      const admin = r.admin_fund || {};
      const cwf = r.capital_works_fund || {};
      const reportRec = await base44.entities.FinancialReport.create({
        building_id: matchBuildingId || null,
        strata_plan_number: r.strata_plan_number || '',
        address: r.address || '',
        strata_manager_name: r.strata_manager_name || '',
        report_period_start: r.report_period_start || null,
        report_period_end: r.report_period_end || null,
        as_at_date: r.as_at_date || null,
        admin_fund_income_actual: admin.income_actual || 0,
        admin_fund_income_budget: admin.income_budget || 0,
        admin_fund_income_prior_year: admin.income_prior_year || 0,
        admin_fund_expenditure_actual: admin.expenditure_actual || 0,
        admin_fund_expenditure_budget: admin.expenditure_budget || 0,
        admin_fund_expenditure_prior_year: admin.expenditure_prior_year || 0,
        admin_fund_opening_balance: admin.opening_balance || 0,
        admin_fund_closing_balance: admin.closing_balance || 0,
        admin_fund_surplus_deficit: admin.surplus_deficit || 0,
        capital_works_fund_income_actual: cwf.income_actual || 0,
        capital_works_fund_income_budget: cwf.income_budget || 0,
        capital_works_fund_income_prior_year: cwf.income_prior_year || 0,
        capital_works_fund_expenditure_actual: cwf.expenditure_actual || 0,
        capital_works_fund_expenditure_budget: cwf.expenditure_budget || 0,
        capital_works_fund_expenditure_prior_year: cwf.expenditure_prior_year || 0,
        capital_works_fund_opening_balance: cwf.opening_balance || 0,
        capital_works_fund_closing_balance: cwf.closing_balance || 0,
        capital_works_fund_surplus_deficit: cwf.surplus_deficit || 0,
        bank_admin_balance: r.bank_admin_balance || 0,
        bank_capital_works_balance: r.bank_capital_works_balance || 0,
        bank_total_balance: r.bank_total_balance || 0,
        total_assets: r.total_assets || 0,
        total_liabilities: r.total_liabilities || 0,
        owners_funds_total: r.owners_funds_total || 0,
        creditors_total: r.creditors_total || 0,
        levies_in_arrears: r.levies_in_arrears || 0,
        levies_in_advance: r.levies_in_advance || 0,
        source_file_url: sourceUrl || '',
        extraction_method: sourceUrl ? 'ai_extracted' : 'manual',
        status: 'confirmed',
      });

      const lines = [];
      let order = 0;
      (r.admin_expenditure_lines || []).forEach((l) => {
        lines.push({
          report_id: reportRec.id, building_id: matchBuildingId || null,
          fund_type: 'admin_fund', line_type: 'expenditure',
          category: l.category || '', payee: l.payee || '',
          budget_amount: l.budget || 0, actual_amount: l.actual || 0,
          over_budget: (l.budget || 0) > 0 && (l.actual || 0) > (l.budget || 0),
          sort_order: order++,
        });
      });
      (r.capital_works_expenditure_lines || []).forEach((l) => {
        lines.push({
          report_id: reportRec.id, building_id: matchBuildingId || null,
          fund_type: 'capital_works_fund', line_type: 'expenditure',
          category: l.category || '', payee: l.payee || '',
          budget_amount: l.budget || 0, actual_amount: l.actual || 0,
          over_budget: (l.budget || 0) > 0 && (l.actual || 0) > (l.budget || 0),
          sort_order: order++,
        });
      });
      (r.creditor_lines || []).forEach((l) => {
        lines.push({
          report_id: reportRec.id, building_id: matchBuildingId || null,
          fund_type: 'admin_fund', line_type: 'creditor',
          category: l.payee || 'Creditor', payee: l.payee || '',
          actual_amount: l.amount || 0, budget_amount: 0,
          sort_order: order++,
        });
      });
      if (lines.length) await base44.entities.BudgetLine.bulkCreate(lines);
      return reportRec;
    },
    onSuccess: () => {
      toast.success('Strata financial report saved');
      queryClient.invalidateQueries({ queryKey: ['financial-reports'] });
      queryClient.invalidateQueries({ queryKey: ['budget-lines'] });
      setStage('idle');
      setReportData(null);
      setSourceUrl(null);
      setFileName('');
    },
    onError: (err) => toast.error('Save failed: ' + (err.message || 'Unknown error')),
  });

  const set = (path, val) => {
    setReportData((prev) => {
      const next = { ...prev };
      const keys = path.split('.');
      let obj = next;
      for (let i = 0; i < keys.length - 1; i++) obj = obj[keys[i]];
      obj[keys[keys.length - 1]] = val;
      return next;
    });
  };

  // ── Upload / extracting stages ──
  if (stage !== 'reviewing') {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Upload className="h-4 w-4 text-blue-600" /> Upload Strata Status Report
          </CardTitle>
          <CardDescription>Upload a strata financial status report PDF. AI reads the balance sheet, admin & capital works funds, and creditors, then you can review and correct before saving.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {stage === 'idle' && (
            <>
              <label className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-slate-300 rounded-xl cursor-pointer hover:border-blue-400 hover:bg-blue-50/30 transition-colors">
                <input type="file" accept="application/pdf" className="hidden" onChange={(e) => e.target.files[0] && handleFile(e.target.files[0])} />
                <Upload className="h-8 w-8 text-slate-400 mb-2" />
                <p className="text-sm text-slate-600 font-medium">Drag & drop or click to upload a PDF</p>
                <p className="text-xs text-slate-400 mt-1">Strata status report · max ~10MB</p>
              </label>
              <div className="flex items-center gap-3 pt-2">
                <div className="flex-1 border-t border-slate-100" />
                <span className="text-xs text-slate-400">or</span>
                <div className="flex-1 border-t border-slate-100" />
              </div>
              <Button variant="outline" onClick={startManual} className="w-full">
                <PencilLine className="h-4 w-4 mr-2" /> Enter figures manually
              </Button>
            </>
          )}
          {(stage === 'uploading' || stage === 'extracting') && (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="h-8 w-8 text-blue-600 animate-spin mb-3" />
              <p className="text-sm font-medium text-slate-700">
                {stage === 'uploading' ? 'Uploading PDF…' : 'AI reading the financial report…'}
              </p>
              {fileName && <p className="text-xs text-slate-400 mt-1">{fileName}</p>}
              {stage === 'extracting' && <p className="text-xs text-slate-400 mt-1">Extracting balance sheet, funds, and creditors</p>}
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  // ── Review form ──
  const r = reportData;
  const admin = r.admin_fund;
  const cwf = r.capital_works_fund;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-green-600" /> Review Extracted Report
          </CardTitle>
          <CardDescription>Correct any figures, confirm the building link, then save. Line items become budget-tracking records.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {matchWarning && (
            <Alert className="border-amber-200 bg-amber-50">
              <AlertCircle className="h-4 w-4 text-amber-600" />
              <AlertDescription className="text-amber-800">{matchWarning}</AlertDescription>
            </Alert>
          )}

          {/* Building link */}
          <div>
            <Label className="text-sm font-medium flex items-center gap-1"><Building2 className="h-3.5 w-3.5" /> Link to building</Label>
            <select
              value={matchBuildingId}
              onChange={(e) => { setMatchBuildingId(e.target.value); setMatchWarning(null); }}
              className="mt-1.5 w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
            >
              <option value="">— Select building —</option>
              {buildings.map((b) => (
                <option key={b.id} value={b.id}>{b.name}{b.strata_plan_number ? ` (SP ${b.strata_plan_number})` : ''}</option>
              ))}
            </select>
          </div>

          {/* Header */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="col-span-2">
              <Label className="text-xs text-slate-500">Property address</Label>
              <Input value={r.address || ''} onChange={(e) => set('address', e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label className="text-xs text-slate-500">Strata plan no.</Label>
              <Input value={r.strata_plan_number || ''} onChange={(e) => set('strata_plan_number', e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label className="text-xs text-slate-500">Strata manager</Label>
              <Input value={r.strata_manager_name || ''} onChange={(e) => set('strata_manager_name', e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label className="text-xs text-slate-500">Period start</Label>
              <Input type="date" value={r.report_period_start || ''} onChange={(e) => set('report_period_start', e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label className="text-xs text-slate-500">Period end</Label>
              <Input type="date" value={r.report_period_end || ''} onChange={(e) => set('report_period_end', e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label className="text-xs text-slate-500">Balance sheet as at</Label>
              <Input type="date" value={r.as_at_date || ''} onChange={(e) => set('as_at_date', e.target.value)} className="mt-1" />
            </div>
          </div>

          {/* Admin Fund */}
          <div className="border border-slate-200 rounded-lg p-4">
            <h4 className="text-sm font-semibold text-slate-700 mb-3">Administrative Fund</h4>
            <div className="grid grid-cols-3 md:grid-cols-5 gap-3 mb-3">
              <NumberField label="Income actual" value={admin.income_actual} onChange={(v) => set('admin_fund.income_actual', v)} />
              <NumberField label="Income budget" value={admin.income_budget} onChange={(v) => set('admin_fund.income_budget', v)} />
              <NumberField label="Exp actual" value={admin.expenditure_actual} onChange={(v) => set('admin_fund.expenditure_actual', v)} />
              <NumberField label="Exp budget" value={admin.expenditure_budget} onChange={(v) => set('admin_fund.expenditure_budget', v)} />
              <NumberField label="Surplus/deficit" value={admin.surplus_deficit} onChange={(v) => set('admin_fund.surplus_deficit', v)} />
            </div>
            <LineItemsEditor
              title="Admin Fund – Expenditure Lines"
              lines={r.admin_expenditure_lines || []}
              onChange={(lines) => set('admin_expenditure_lines', lines)}
              fundType="admin_fund"
              showPayee
            />
          </div>

          {/* Capital Works Fund */}
          <div className="border border-slate-200 rounded-lg p-4">
            <h4 className="text-sm font-semibold text-slate-700 mb-3">Capital Works Fund</h4>
            <div className="grid grid-cols-3 md:grid-cols-5 gap-3 mb-3">
              <NumberField label="Income actual" value={cwf.income_actual} onChange={(v) => set('capital_works_fund.income_actual', v)} />
              <NumberField label="Income budget" value={cwf.income_budget} onChange={(v) => set('capital_works_fund.income_budget', v)} />
              <NumberField label="Exp actual" value={cwf.expenditure_actual} onChange={(v) => set('capital_works_fund.expenditure_actual', v)} />
              <NumberField label="Exp budget" value={cwf.expenditure_budget} onChange={(v) => set('capital_works_fund.expenditure_budget', v)} />
              <NumberField label="Surplus/deficit" value={cwf.surplus_deficit} onChange={(v) => set('capital_works_fund.surplus_deficit', v)} />
            </div>
            <LineItemsEditor
              title="Capital Works – Expenditure Lines"
              lines={r.capital_works_expenditure_lines || []}
              onChange={(lines) => set('capital_works_expenditure_lines', lines)}
              fundType="capital_works_fund"
              showPayee
            />
          </div>

          {/* Balance sheet & creditors */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <NumberField label="Bank – admin" value={r.bank_admin_balance} onChange={(v) => set('bank_admin_balance', v)} />
            <NumberField label="Bank – capital works" value={r.bank_capital_works_balance} onChange={(v) => set('bank_capital_works_balance', v)} />
            <NumberField label="Total cash at bank" value={r.bank_total_balance} onChange={(v) => set('bank_total_balance', v)} />
            <NumberField label="Creditors total" value={r.creditors_total} onChange={(v) => set('creditors_total', v)} />
            <NumberField label="Levies in arrears" value={r.levies_in_arrears} onChange={(v) => set('levies_in_arrears', v)} />
            <NumberField label="Levies in advance" value={r.levies_in_advance} onChange={(v) => set('levies_in_advance', v)} />
            <NumberField label="Total assets" value={r.total_assets} onChange={(v) => set('total_assets', v)} />
            <NumberField label="Total liabilities" value={r.total_liabilities} onChange={(v) => set('total_liabilities', v)} />
          </div>

          <LineItemsEditor
            title="Creditor Balances"
            lines={(r.creditor_lines || []).map((c) => ({ category: c.payee || '', payee: c.payee || '', actual: c.amount || 0 }))}
            onChange={(lines) => set('creditor_lines', lines.map((l) => ({ payee: l.payee || l.category || '', amount: l.actual || 0 })))}
            fundType="admin_fund"
            showPayee
            allowBudget={false}
          />

          <div className="flex justify-between items-center pt-2">
            <Button variant="outline" onClick={() => { setStage('idle'); setReportData(null); }}>
              Cancel
            </Button>
            <div className="flex items-center gap-3">
              {sourceUrl && <Badge variant="secondary" className="gap-1"><FileText className="h-3 w-3" /> {fileName}</Badge>}
              <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending || !matchBuildingId}>
                {saveMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
                {saveMutation.isPending ? 'Saving…' : 'Save report'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}