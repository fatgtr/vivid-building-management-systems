import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { TrendingDown, TrendingUp, AlertTriangle, CheckCircle2, Wrench, Building2, Loader2 } from 'lucide-react';

const fmt = (n) => (n < 0
  ? `(${Math.abs(n).toLocaleString('en-AU', { style: 'currency', currency: 'AUD', minimumFractionDigits: 0, maximumFractionDigits: 0 })})`
  : (n).toLocaleString('en-AU', { style: 'currency', currency: 'AUD', minimumFractionDigits: 0, maximumFractionDigits: 0 }));

const normalize = (s) => (s || '').toLowerCase().replace(/pty ltd|pty\.? limited|pty\.? ltd\.?|limited|ltd|plc|inc/g, '').replace(/[^a-z0-9]/g, '').trim();

function matchContractor(payee, contractors) {
  if (!payee) return null;
  const np = normalize(payee);
  if (!np) return null;
  let best = null;
  for (const c of contractors) {
    const nc = normalize(c.company_name || c.contact_name || '');
    if (!nc) continue;
    if (nc === np || nc.includes(np) || np.includes(nc)) return c;
    if (np.length > 4 && nc.length > 4) {
      const overlap = [...np].filter((ch) => nc.includes(ch)).length / Math.max(np.length, nc.length);
      if (overlap > 0.6 && (!best || overlap > best._score)) best = { ...c, _score: overlap };
    }
  }
  return best && best._score ? best : null;
}

export default function BudgetTracker({ buildingId }) {
  const { data: reports = [], isLoading: reportsLoading } = useQuery({
    queryKey: ['financial-reports', buildingId],
    queryFn: () => base44.entities.FinancialReport.filter(buildingId ? { building_id: buildingId } : {}, '-report_period_end'),
  });
  const { data: lines = [], isLoading: linesLoading } = useQuery({
    queryKey: ['budget-lines', buildingId],
    queryFn: () => base44.entities.BudgetLine.filter(buildingId ? { building_id: buildingId } : {}, '-created_date', 200),
  });
  const { data: contractors = [] } = useQuery({
    queryKey: ['contractors-all'],
    queryFn: () => base44.entities.Contractor.list(),
  });

  const loading = reportsLoading || linesLoading;

  const { byCategory, contractorSpend } = useMemo(() => {
    const expLines = lines.filter((l) => l.line_type === 'expenditure');
    const map = {};
    expLines.forEach((l) => {
      const k = `${l.fund_type}|${l.category || 'Uncategorised'}`;
      if (!map[k]) map[k] = { fund_type: l.fund_type, category: l.category || 'Uncategorised', budget: 0, actual: 0, reportCount: 0 };
      map[k].budget += l.budget_amount || 0;
      map[k].actual += l.actual_amount || 0;
      map[k].reportCount += 1;
    });

    const cSpend = {};
    expLines.forEach((l) => {
      if (!l.payee) return;
      const matched = l.linked_contractor_id
        ? contractors.find((c) => c.id === l.linked_contractor_id)
        : matchContractor(l.payee, contractors);
      const key = matched ? matched.id : `unmatched|${l.payee}`;
      if (!cSpend[key]) cSpend[key] = { name: matched ? matched.company_name : l.payee, contractor: matched, total: 0, lines: 0, matched: !!matched };
      cSpend[key].total += l.actual_amount || 0;
      cSpend[key].lines += 1;
    });
    return { byCategory: Object.values(map).sort((a, b) => b.actual - a.actual), contractorSpend: Object.values(cSpend).sort((a, b) => b.total - a.total) };
  }, [lines, contractors]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <Loader2 className="h-6 w-6 text-blue-600 animate-spin mb-2" />
        <p className="text-sm text-slate-500">Loading budget data…</p>
      </div>
    );
  }

  if (reports.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Building2 className="h-8 w-8 text-slate-300 mx-auto mb-2" />
          <p className="text-sm text-slate-500">No financial reports saved yet. Upload a strata status report to start tracking budgets.</p>
        </CardContent>
      </Card>
    );
  }

  const totalBudget = byCategory.reduce((s, c) => s + c.budget, 0);
  const totalActual = byCategory.reduce((s, c) => s + c.actual, 0);
  const overCategories = byCategory.filter((c) => c.budget > 0 && c.actual > c.budget);

  return (
    <div className="space-y-6">
      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card><CardContent className="pt-5">
          <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Reports on file</p>
          <p className="text-xl font-bold text-slate-700">{reports.length}</p>
          <p className="text-xs text-slate-400 mt-1">Latest: {reports[0]?.report_period_end || '—'}</p>
        </CardContent></Card>
        <Card><CardContent className="pt-5">
          <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Total budget</p>
          <p className="text-xl font-bold text-blue-600">{fmt(totalBudget)}</p>
          <p className="text-xs text-slate-400 mt-1">Across all categories</p>
        </CardContent></Card>
        <Card><CardContent className="pt-5">
          <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Total actual spend</p>
          <p className={`text-xl font-bold ${totalActual > totalBudget ? 'text-red-600' : 'text-green-600'}`}>{fmt(totalActual)}</p>
          <p className="text-xs text-slate-400 mt-1">{totalActual > totalBudget ? 'Over budget' : 'Within budget'}</p>
        </CardContent></Card>
        <Card><CardContent className="pt-5">
          <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Over-budget categories</p>
          <p className="text-xl font-bold text-red-600">{overCategories.length}</p>
          <p className="text-xs text-slate-400 mt-1">Need attention</p>
        </CardContent></Card>
      </div>

      {/* Budget vs actual per category */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Budget vs Actual — by Category</CardTitle>
          <CardDescription>Aggregated across all saved reports for this building. Red = over budget, green = on/under budget, blue = surplus ahead.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {byCategory.length === 0 && <p className="text-sm text-slate-400 italic">No expenditure line items recorded.</p>}
          {byCategory.map((c) => {
            const pct = c.budget > 0 ? Math.min((c.actual / c.budget) * 100, 100) : 0;
            const over = c.budget > 0 && c.actual > c.budget;
            const surplus = c.budget > 0 && c.actual < c.budget * 0.5;
            return (
              <div key={`${c.fund_type}|${c.category}`}>
                <div className="flex justify-between text-sm mb-1">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-[10px] uppercase">{c.fund_type === 'admin_fund' ? 'Admin' : 'CWF'}</Badge>
                    <span className={over ? 'text-red-700 font-medium' : 'text-slate-700'}>{c.category}</span>
                  </div>
                  <div className="flex gap-3 text-xs">
                    <span className="text-slate-400">Budget {fmt(c.budget)}</span>
                    <span className={over ? 'text-red-600 font-semibold' : surplus ? 'text-green-600 font-semibold' : 'text-slate-700'}>
                      Actual {fmt(c.actual)}
                    </span>
                    {over && <Badge className="bg-red-100 text-red-700 border-0 text-xs">+{fmt(c.actual - c.budget)}</Badge>}
                  </div>
                </div>
                <Progress value={pct} className={over ? 'bg-red-100 [&>div]:bg-red-500' : surplus ? 'bg-blue-100 [&>div]:bg-blue-500' : ''} />
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Contractor attribution */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><Wrench className="h-4 w-4 text-blue-600" /> Contractor Spend Attribution</CardTitle>
          <CardDescription>Spend by payee, matched to known contractors where possible. Unmatched payees can be linked manually.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {contractorSpend.length === 0 && <p className="text-sm text-slate-400 italic">No payee data in saved reports.</p>}
            {contractorSpend.map((cs) => (
              <div key={cs.name} className="flex items-center justify-between p-3 rounded-lg border border-slate-100 bg-slate-50/50 hover:bg-slate-50">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${cs.matched ? 'bg-green-100' : 'bg-slate-200'}`}>
                    {cs.matched ? <CheckCircle2 className="h-4 w-4 text-green-600" /> : <AlertTriangle className="h-4 w-4 text-slate-500" />}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-800">{cs.name}</p>
                    <p className="text-xs text-slate-500">{cs.lines} line{cs.lines !== 1 ? 's' : ''} · {cs.matched ? 'Matched contractor' : 'Unmatched — link in Contractor portal'}</p>
                  </div>
                </div>
                <p className="text-sm font-bold text-slate-800">{fmt(cs.total)}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Saved reports history */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Saved Reports</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {reports.map((rep) => (
              <div key={rep.id} className="flex items-center justify-between p-3 rounded-lg border border-slate-100">
                <div>
                  <p className="text-sm font-medium text-slate-800">SP {rep.strata_plan_number || '—'} · {rep.report_period_end ? rep.report_period_end : 'No period'}</p>
                  <p className="text-xs text-slate-500">{rep.address || ''}</p>
                </div>
                <div className="flex items-center gap-3 text-xs">
                  <Badge variant={rep.extraction_method === 'ai_extracted' ? 'secondary' : 'outline'}>
                    {rep.extraction_method === 'ai_extracted' ? 'AI extracted' : 'Manual'}
                  </Badge>
                  <span className="text-slate-500">Bank: <span className={rep.bank_total_balance < 0 ? 'text-red-600 font-medium' : 'text-slate-700 font-medium'}>{fmt(rep.bank_total_balance || 0)}</span></span>
                  {rep.bank_total_balance < 0 ? <TrendingDown className="h-3.5 w-3.5 text-red-500" /> : <TrendingUp className="h-3.5 w-3.5 text-green-500" />}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}