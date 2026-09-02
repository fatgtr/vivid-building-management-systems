import React from 'react';
import { useFinancialSyncData } from '@/hooks/useFinancialSyncData';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, Wrench } from 'lucide-react';

const fmt = (n) => (n || 0).toLocaleString('en-AU', { style: 'currency', currency: 'AUD', minimumFractionDigits: 0, maximumFractionDigits: 0 });

// Actual recorded maintenance cost context shown alongside predicted issues on the Predictive AI page.
export default function PredictiveAISync({ buildingId }) {
  const { actualMaintenanceCost, woActualTotal, lineExpenditureTotal, loading, reports } = useFinancialSyncData(buildingId);

  if (loading) {
    return (
      <Card><CardContent className="py-6 flex items-center gap-2 text-sm text-slate-500">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading cost context…
      </CardContent></Card>
    );
  }
  if (reports.length === 0 && woActualTotal === 0) return null;

  return (
    <Card className="border-l-4 border-l-cyan-500">
      <CardContent className="pt-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-slate-500 mb-1 flex items-center gap-1.5"><Wrench className="h-4 w-4 text-cyan-600" /> Actual maintenance cost context</p>
            <p className="text-2xl font-bold text-slate-900">{fmt(actualMaintenanceCost)}</p>
            <p className="text-xs text-slate-500 mt-1">total recorded maintenance spend</p>
          </div>
          <div className="text-right text-xs text-slate-500">
            <p>From reports {fmt(lineExpenditureTotal)}</p>
            <p>From work orders {fmt(woActualTotal)}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}