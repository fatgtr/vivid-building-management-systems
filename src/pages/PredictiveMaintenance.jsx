import React from 'react';
import { useBuildingContext } from '@/components/BuildingContext';
import PredictiveMaintenanceDashboard from '@/components/maintenance/PredictiveMaintenanceDashboard';
import PredictiveAISync from '@/components/financial/PredictiveAISync';
import CrossLinkPanel from '@/components/financial/CrossLinkPanel';
import { useFinancialSyncData } from '@/hooks/useFinancialSyncData';

const fmt0 = (n) => (n || 0).toLocaleString('en-AU', { style: 'currency', currency: 'AUD', minimumFractionDigits: 0, maximumFractionDigits: 0 });

export default function PredictiveMaintenance() {
  const { selectedBuildingId } = useBuildingContext();
  const { actualMaintenanceCost } = useFinancialSyncData(selectedBuildingId);

  return (
    <div className="space-y-6">
      <PredictiveAISync buildingId={selectedBuildingId} />
      <CrossLinkPanel
        currentPage="PredictiveMaintenance"
        stats={{ financial: `Spend ${fmt0(actualMaintenanceCost)}`, capital: 'Forecast', analytics: 'Analytics' }}
      />
      <PredictiveMaintenanceDashboard buildingId={selectedBuildingId} />
    </div>
  );
}