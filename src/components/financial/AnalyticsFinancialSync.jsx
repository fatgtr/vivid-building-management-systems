import React from 'react';
import { useFinancialSyncData } from '@/hooks/useFinancialSyncData';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, TrendingUp } from 'lucide-react';

const fmt = (n) => (n || 0).toLocaleString('en-AU', { style: 'currency', currency: 'AUD', minimumFractionDigits: 0, maximumFractionDigits: 0 });

// Financial performance summary read from saved strata reports — surfaced on the Analytics dashboard.
export default function AnalyticsFinancialSync({ buildingId }) {
  const { totalBudget, totalActual, overBudget, onTrackPct, loading, reports } = useFinancialSyncData(buildingId);

  if (loading) {
    return (
      <Card><CardContent className="py-6 flex items-center gap-2 text-sm text-slate-500">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading financial sync…
      </CardContent></Card>
    );
  }
  if (reports.length === 0) return null;

  return (
    <Card className="border-l-4 border-l-blue-500">
      <CardContent className="pt-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-slate-500 mb-1 flex items-center gap-1.5"><TrendingUp className="h-4 w-4 text-blue-600" /> Financial Performance (strata reports)</p>
            <p className="text-2xl font-bold text-slate-900">{onTrackPct}%</p>
            <p className="text-xs text-slate-500 mt-1">budget on-track</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-slate-400">Budget {fmt(totalBudget)}</p>
            <p className={`text-sm font-bold ${totalActual > totalBudget ? 'text-red-600' : 'text-green-600'}`}>Actual {fmt(totalActual)}</p>
            {overBudget.length > 0 && <Badge className="bg-red-100 text-red-700 border-0 mt-1">{overBudget.length} over budget</Badge>}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}