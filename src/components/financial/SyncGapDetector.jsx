import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { useFinancialSyncData } from '@/hooks/useFinancialSyncData';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, RefreshCw, Loader2, CheckCircle2 } from 'lucide-react';

// Standalone gap detector panel shown on Financial Management's Data Sync tab.
export default function SyncGapDetector({ buildingId }) {
  const { gaps, loading } = useFinancialSyncData(buildingId);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <Loader2 className="h-6 w-6 text-blue-600 animate-spin mb-2" />
        <p className="text-sm text-slate-500">Checking sync across planning pages…</p>
      </div>
    );
  }

  const red = gaps.filter((g) => g.severity === 'red');
  const amber = gaps.filter((g) => g.severity === 'amber');

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-amber-500" /> Data Sync — Cross-Page Gap Detector</CardTitle>
        <CardDescription>Inspects Financial Reports, Budget Lines, Work Orders, Maintenance Schedules, and Capital Works Plans for the selected building to surface missing or duplicated data points overlapping across Financial, Capital Works, Analytics and Predictive AI.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-lg border border-red-200 bg-red-50 p-3">
            <p className="text-xs text-red-600 uppercase tracking-wider">Critical gaps</p>
            <p className="text-2xl font-bold text-red-600">{red.length}</p>
          </div>
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
            <p className="text-xs text-amber-600 uppercase tracking-wider">Warnings</p>
            <p className="text-2xl font-bold text-amber-600">{amber.length}</p>
          </div>
          <div className="rounded-lg border border-green-200 bg-green-50 p-3">
            <p className="text-xs text-green-600 uppercase tracking-wider">Synced</p>
            <p className="text-2xl font-bold text-green-600">{gaps.length === 0 ? '✓' : '—'}</p>
          </div>
        </div>

        {gaps.length === 0 ? (
          <div className="flex items-center gap-2 text-sm text-green-600 font-medium py-4">
            <CheckCircle2 className="h-5 w-5" /> All synced — no missing or duplicated data points detected.
          </div>
        ) : (
          <div className="space-y-2">
            {gaps.map((g) => (
              <div key={g.id} className="flex items-center justify-between p-3 rounded-md border border-slate-100 bg-slate-50/50">
                <div className="flex items-center gap-2">
                  <Badge className={g.severity === 'red' ? 'bg-red-100 text-red-700 border-0' : 'bg-amber-100 text-amber-700 border-0'}>
                    {g.severity === 'red' ? 'Critical' : 'Warning'}
                  </Badge>
                  <span className="text-sm text-slate-700">{g.label}</span>
                </div>
                <Link to={createPageUrl(g.page)}>
                  <Button variant="outline" size="sm" className="gap-1.5">
                    Fix in {g.page === 'FinancialManagement' ? 'Financial' : g.page === 'OperationsCenter' ? 'Operations' : g.page === 'CapitalWorksPlanning' ? 'Capital Works' : g.page === 'AssetRegister' ? 'Assets' : g.page === 'Maintenance' ? 'Maintenance' : g.page}
                  </Button>
                </Link>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}