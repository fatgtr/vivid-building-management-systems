import React from 'react';
import { useBuildingContext } from '@/components/BuildingContext';
import PredictiveMaintenanceDashboard from '@/components/maintenance/PredictiveMaintenanceDashboard';

export default function PredictiveMaintenance() {
  const { selectedBuildingId } = useBuildingContext();

  return (
    <div className="space-y-6">
      <PredictiveMaintenanceDashboard buildingId={selectedBuildingId} />
    </div>
  );
}