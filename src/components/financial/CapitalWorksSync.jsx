import React from 'react';
import { useFinancialSyncData } from '@/hooks/useFinancialSyncData';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, TrendingUp } from 'lucide-react';

const fmt = (n) => (n || 0).toLocaleString('en-AU', { style: 'currency', currency: 'AUD', minimumFractionDigits: 0, maximumFractionDigits: 0 });

// Actual spend (from strata financial reports) vs the capital forecast, surfaced on the Capital Works page.
export default function CapitalWorksSync({ buildingId }) {
  const { byCategory, capitalForecastTotal, totalActual, loading } = useFinancialSyncData(buildingId);

  if (loading) {
    return (
      <Card>
        <CardContent className="py-6 flex items-center gap-2 text-sm text-slate-500">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading sync data…
        </CardContent>
      </Card>
    );
  }

  if (totalActual === 0 && capitalForecastTotal === 0) {
    return (
      <Card><CardContent className="py-6 text-sm text-slate-500">
        No financial report spend or capital forecast recorded yet to reconcile.
      </CardContent></Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2"><TrendingUp className="h-4 w-4 text-indigo-600" /> Actual Spend vs Capital Forecast</CardTitle>
        <CardDescription>Reconciles spend recorded in strata financial reports against the capital works forecast — same source numbers used across Financial & Planning.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-3 gap-3 text-sm">
          <div className="rounded-lg border border-slate-100 p-3">
            <p className="text-xs text-slate-500">Forecast total</p>
            <p className="text-lg font-bold text-indigo-600">{fmt(capitalForecastTotal)}</p>
          </div>
          <div className="rounded-lg border border-slate-100 p-3">
            <p className="text-xs text-slate-500">Actual spend (reports)</p>
            <p className="text-lg font-bold text-slate-800">{fmt(totalActual)}</p>
          </div>
          <div className="rounded-lg border border-slate-100 p-3">
            <p className="text-xs text-slate-500">Variance</p>
            <p className={`text-lg font-bold ${totalActual > capitalForecastTotal ? 'text-red-600' : 'text-green-600'}`}>
              {fmt(capitalForecastTotal - totalActual)}
            </p>
          </div>
        </div>
        <div className="space-y-1.5 pt-1">
          {byCategory.map((c) => (
            <div key={`${c.fund_type}|${c.category}`} className="flex justify-between text-xs py-1.5 border-b border-slate-50">
              <span className="text-slate-600">{c.category}</span>
              <span className="font-medium text-slate-800">{fmt(c.actual)}{c.budget > 0 && <span className="text-slate-400"> / {fmt(c.budget)}</span>}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}