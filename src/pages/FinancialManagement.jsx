import React from 'react';
import { useBuildingContext } from '@/components/BuildingContext';
import LevyPaymentManager from '@/components/financial/LevyPaymentManager';

export default function FinancialManagement() {
  const { selectedBuildingId } = useBuildingContext();

  return (
    <div className="space-y-6">
      <LevyPaymentManager buildingId={selectedBuildingId} />
    </div>
  );
}