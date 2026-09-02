import React, { useState } from 'react';
import { useBuildingContext } from '@/components/BuildingContext';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useFinancialSyncData } from '@/hooks/useFinancialSyncData';
import LevyPaymentManager from '@/components/financial/LevyPaymentManager';
import StrataFinancialDashboard from '@/components/financial/StrataFinancialDashboard';
import StrataReportUploader from '@/components/financial/StrataReportUploader';
import BudgetTracker from '@/components/financial/BudgetTracker';
import MaintenanceSpend from '@/components/financial/MaintenanceSpend';
import CrossLinkPanel from '@/components/financial/CrossLinkPanel';
import SyncGapDetector from '@/components/financial/SyncGapDetector';

const fmt0 = (n) => (n || 0).toLocaleString('en-AU', { style: 'currency', currency: 'AUD', minimumFractionDigits: 0, maximumFractionDigits: 0 });

export default function FinancialManagement() {
  const { selectedBuildingId } = useBuildingContext();
  const [tab, setTab] = useState('overview');
  const { capitalForecastTotal, totalActual, gaps } = useFinancialSyncData(selectedBuildingId);

  const linkedStats = {
    capital: `Forecast ${fmt0(capitalForecastTotal)}`,
    analytics: `Actual ${fmt0(totalActual)}`,
    predictive: `Spend ${fmt0(totalActual)}`,
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Financial Management</h1>
        <p className="text-sm text-slate-500 mt-1">Track strata budgets, contractors, and maintenance spend to keep the owners corporation on budget.</p>
      </div>

      {/* Linked Planning cross-links */}
      <div>
        <h2 className="text-sm font-semibold text-slate-600 uppercase tracking-wider mb-2">Linked Planning</h2>
        <CrossLinkPanel currentPage="FinancialManagement" stats={linkedStats} />
        {gaps.length > 0 && (
          <button onClick={() => setTab('sync')} className="mt-2 text-xs text-amber-600 font-medium hover:underline">
            {gaps.length} sync gap{gaps.length !== 1 ? 's' : ''} detected — review →
          </button>
        )}
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="upload">Upload Report</TabsTrigger>
          <TabsTrigger value="tracker">Budget Tracker</TabsTrigger>
          <TabsTrigger value="spend">Maintenance Spend</TabsTrigger>
          <TabsTrigger value="levies">Levies</TabsTrigger>
          <TabsTrigger value="sync">Data Sync</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-8 pt-4">
          <StrataFinancialDashboard />
          <LevyPaymentManager buildingId={selectedBuildingId} />
        </TabsContent>

        <TabsContent value="upload" className="pt-4">
          <StrataReportUploader buildingId={selectedBuildingId} />
        </TabsContent>

        <TabsContent value="tracker" className="pt-4">
          <BudgetTracker buildingId={selectedBuildingId} />
        </TabsContent>

        <TabsContent value="spend" className="pt-4">
          <MaintenanceSpend buildingId={selectedBuildingId} />
        </TabsContent>

        <TabsContent value="levies" className="pt-4">
          <LevyPaymentManager buildingId={selectedBuildingId} />
        </TabsContent>

        <TabsContent value="sync" className="pt-4">
          <SyncGapDetector buildingId={selectedBuildingId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}