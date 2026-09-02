import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { useFinancialSyncData } from '@/hooks/useFinancialSyncData';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DollarSign, Loader2, TrendingUp, AlertTriangle, FileText, Sparkles, BarChart3 } from 'lucide-react';

const fmt = (n) => (n || 0).toLocaleString('en-AU', { style: 'currency', currency: 'AUD', minimumFractionDigits: 0, maximumFractionDigits: 0 });

// Compact financial summary embedded in the Operations Center Financial tab.
export default function OperationsFinancialSummary({ buildingId, onShowGaps, gaps }) {
  const { totalBudget, totalActual, overBudget, onTrackPct, capitalForecastTotal, actualMaintenanceCost, loading, reports } = useFinancialSyncData(buildingId);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <Loader2 className="h-6 w-6 text-blue-600 animate-spin mb-2" />
        <p className="text-sm text-slate-500">Loading financial summary…</p>
      </div>
    );
  }

  if (reports.length === 0 && capitalForecastTotal === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <DollarSign className="h-8 w-8 text-slate-300 mx-auto mb-2" />
          <p className="text-sm text-slate-500">No financial reports or capital plans yet. Upload a strata report from Financial Management to start tracking.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-emerald-500">
          <CardContent className="pt-5">
            <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Budget on-track</p>
            <p className="text-xl font-bold text-emerald-600">{onTrackPct}%</p>
            <p className="text-xs text-slate-400 mt-1">{reports.length} report{reports.length !== 1 ? 's' : ''} on file</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-red-500">
          <CardContent className="pt-5">
            <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Over-budget</p>
            <p className="text-xl font-bold text-red-600">{overBudget.length}</p>
            <p className="text-xs text-slate-400 mt-1">categories</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="pt-5">
            <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Capital forecast</p>
            <p className="text-xl font-bold text-blue-600">{fmt(capitalForecastTotal)}</p>
            <p className="text-xs text-slate-400 mt-1">replacement total</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-cyan-500">
          <CardContent className="pt-5">
            <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Maintenance spend</p>
            <p className="text-xl font-bold text-cyan-600">{fmt(actualMaintenanceCost)}</p>
            <p className="text-xs text-slate-400 mt-1">actual recorded</p>
          </CardContent>
        </Card>
      </div>

      {/* Sibling page links */}
      <div>
        <h3 className="text-sm font-semibold text-slate-700 mb-2">Financial & Planning pages</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Link to={createPageUrl('FinancialManagement')}>
            <Card className="hover:shadow-md transition-shadow p-3 flex items-center gap-2"><FileText className="h-4 w-4 text-blue-600" /><span className="text-sm font-medium">Financial</span></Card>
          </Link>
          <Link to={createPageUrl('CapitalWorksPlanning')}>
            <Card className="hover:shadow-md transition-shadow p-3 flex items-center gap-2"><TrendingUp className="h-4 w-4 text-indigo-600" /><span className="text-sm font-medium">Capital Works</span></Card>
          </Link>
          <Link to={createPageUrl('AnalyticsDashboard')}>
            <Card className="hover:shadow-md transition-shadow p-3 flex items-center gap-2"><BarChart3 className="h-4 w-4 text-purple-600" /><span className="text-sm font-medium">Analytics</span></Card>
          </Link>
          <Link to={createPageUrl('PredictiveMaintenance')}>
            <Card className="hover:shadow-md transition-shadow p-3 flex items-center gap-2"><Sparkles className="h-4 w-4 text-cyan-600" /><span className="text-sm font-medium">Predictive AI</span></Card>
          </Link>
        </div>
      </div>

      {/* Gap detector */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-amber-500" /> Data Sync — Gap Detector</CardTitle>
          <CardDescription>Flags missing or duplicated data points across the four planning pages so nothing overlaps or falls through the cracks.</CardDescription>
        </CardHeader>
        <CardContent>
          {!gaps || gaps.length === 0 ? (
            <p className="text-sm text-green-600 font-medium">✓ All synced — no gaps detected across Financial, Capital Works, Analytics and Predictive AI.</p>
          ) : (
            <div className="space-y-2">
              {gaps.map((g) => (
                <div key={g.id} className="flex items-center justify-between p-2.5 rounded-md border border-slate-100 bg-slate-50/50">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className={`h-4 w-4 ${g.severity === 'red' ? 'text-red-500' : 'text-amber-500'}`} />
                    <span className="text-sm text-slate-700">{g.label}</span>
                  </div>
                  <Link to={createPageUrl(g.page)}>
                    <Button variant="outline" size="sm">Fix</Button>
                  </Link>
                </div>
              ))}
            </div>
          )}
          {onShowGaps && (
            <Button variant="outline" size="sm" className="mt-3" onClick={onShowGaps}>
              Re-run sync check
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}