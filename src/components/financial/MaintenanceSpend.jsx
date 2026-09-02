import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Wrench, Calendar, AlertTriangle, CheckCircle2, Loader2, TrendingUp } from 'lucide-react';

const fmt = (n) => (n || 0).toLocaleString('en-AU', { style: 'currency', currency: 'AUD', minimumFractionDigits: 0, maximumFractionDigits: 0 });

export default function MaintenanceSpend({ buildingId }) {
  const { data: lines = [], isLoading } = useQuery({
    queryKey: ['budget-lines-spend', buildingId],
    queryFn: () => base44.entities.BudgetLine.filter(
      buildingId ? { building_id: buildingId, line_type: 'expenditure' } : { line_type: 'expenditure' },
      '-created_date', 300,
    ),
  });
  const { data: schedules = [] } = useQuery({
    queryKey: ['maint-schedules', buildingId],
    queryFn: () => base44.entities.MaintenanceSchedule.filter(buildingId ? { building_id: buildingId } : {}, '-next_due_date'),
  });
  const { data: workOrders = [] } = useQuery({
    queryKey: ['work-orders-spend', buildingId],
    queryFn: () => base44.entities.WorkOrder.filter(buildingId ? { building_id: buildingId } : {}, '-created_date'),
  });

  const { categorySpend, scheduleComparison } = useMemo(() => {
    // spend by category from financial reports
    const cs = {};
    lines.forEach((l) => {
      const k = l.category || 'Uncategorised';
      cs[k] = (cs[k] || 0) + (l.actual_amount || 0);
    });

    // map maintenance schedule items to actual spend by category name match
    const sc = schedules.map((s) => {
      const matchedCat = Object.keys(cs).find((c) => c && s.item_name && (s.item_name.toLowerCase().includes(c.toLowerCase()) || c.toLowerCase().includes(s.item_name.toLowerCase())));
      const actualSpend = matchedCat ? cs[matchedCat] : 0;
      const planned = s.estimated_cost || 0;
      return {
        id: s.id,
        name: s.item_name || s.subject || 'Unnamed schedule',
        category: matchedCat || '—',
        planned,
        actual: actualSpend,
        over: planned > 0 && actualSpend > planned,
        nextDue: s.next_due_date,
        status: s.status,
      };
    });

    return { categorySpend: cs, scheduleComparison: sc };
  }, [lines, schedules]);

  const woSpend = useMemo(() => {
    return workOrders.reduce((acc, wo) => {
      const cat = wo.subcategory || wo.main_category || 'Uncategorised';
      if (!acc[cat]) acc[cat] = { estimated: 0, actual: 0, count: 0 };
      acc[cat].estimated += wo.estimated_cost || 0;
      acc[cat].actual += wo.actual_cost || 0;
      acc[cat].count += 1;
      return acc;
    }, {});
  }, [workOrders]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <Loader2 className="h-6 w-6 text-blue-600 animate-spin mb-2" />
        <p className="text-sm text-slate-500">Loading maintenance spend…</p>
      </div>
    );
  }

  const noData = lines.length === 0 && schedules.length === 0 && workOrders.length === 0;

  if (noData) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Wrench className="h-8 w-8 text-slate-300 mx-auto mb-2" />
          <p className="text-sm text-slate-500">No maintenance spend data yet. Once financial reports and maintenance schedules exist for this building, actual vs planned spend will appear here.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Maintenance schedule vs actual spend */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><Calendar className="h-4 w-4 text-blue-600" /> Scheduled Maintenance — Planned vs Actual Spend</CardTitle>
          <CardDescription>Compares maintenance schedule estimates against actual spend recorded in financial reports, matched by category/item name.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {scheduleComparison.length === 0 && <p className="text-sm text-slate-400 italic">No maintenance schedules for this building.</p>}
          {scheduleComparison.map((row) => {
            const pct = row.planned > 0 ? Math.min((row.actual / row.planned) * 100, 100) : 0;
            return (
              <div key={row.id} className="border border-slate-100 rounded-lg p-3">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <p className="text-sm font-medium text-slate-800">{row.name}</p>
                    <p className="text-xs text-slate-500">Category: {row.category} · Next due: {row.nextDue || '—'}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {row.over ? (
                      <Badge className="bg-red-100 text-red-700 border-0">Over estimate {fmt(row.actual - row.planned)}</Badge>
                    ) : row.actual > 0 ? (
                      <Badge className="bg-green-100 text-green-700 border-0">On estimate</Badge>
                    ) : (
                      <Badge variant="outline">No spend recorded</Badge>
                    )}
                  </div>
                </div>
                {row.planned > 0 && (
                  <>
                    <Progress value={pct} className={row.over ? 'bg-red-100 [&>div]:bg-red-500' : ''} />
                    <div className="flex justify-between text-xs text-slate-400 mt-1">
                      <span>Planned: {fmt(row.planned)}</span>
                      <span className={row.over ? 'text-red-600 font-medium' : 'text-slate-600'}>Actual: {fmt(row.actual)}</span>
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Work order estimated vs actual cost */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><Wrench className="h-4 w-4 text-blue-600" /> Work Orders — Estimated vs Actual Cost</CardTitle>
          <CardDescription>Aggregated by work order category for the building, showing where actual costs exceed estimates.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Object.keys(woSpend).length === 0 && <p className="text-sm text-slate-400 italic">No work orders for this building.</p>}
            {Object.entries(woSpend).map(([cat, v]) => {
              const over = v.estimated > 0 && v.actual > v.estimated;
              return (
                <div key={cat} className="flex items-center justify-between p-3 rounded-lg border border-slate-100">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${over ? 'bg-red-50' : 'bg-slate-50'}`}>
                      {over ? <AlertTriangle className="h-4 w-4 text-red-500" /> : <CheckCircle2 className="h-4 w-4 text-green-500" />}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-800 capitalize">{cat.replace(/_/g, ' ')}</p>
                      <p className="text-xs text-slate-500">{v.count} work order{v.count !== 1 ? 's' : ''}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-slate-400">Est {fmt(v.estimated)} · Actual <span className={over ? 'text-red-600 font-semibold' : 'text-slate-700 font-semibold'}>{fmt(v.actual)}</span></p>
                    {over && <p className="text-xs text-red-600 font-medium flex items-center gap-1 justify-end"><TrendingUp className="h-3 w-3" /> {fmt(v.actual - v.estimated)} over</p>}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Total actual spend by financial category */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Actual Spend by Financial Report Category</CardTitle>
          <CardDescription>Total actual spend recorded across all saved strata reports for this building.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {Object.keys(categorySpend).length === 0 && <p className="text-sm text-slate-400 italic">No expenditure recorded in financial reports.</p>}
            {Object.entries(categorySpend).sort((a, b) => b[1] - a[1]).map(([cat, amt]) => (
              <div key={cat} className="flex items-center justify-between p-2.5 rounded-md border border-slate-100 bg-slate-50/50">
                <span className="text-sm text-slate-700">{cat}</span>
                <span className="text-sm font-semibold text-slate-800">{fmt(amt)}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}