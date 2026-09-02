import React from 'react';
import { useBuildingContext } from '@/components/BuildingContext';
import LevyPaymentManager from '@/components/financial/LevyPaymentManager';
import StrataFinancialDashboard from '@/components/financial/StrataFinancialDashboard';

export default function FinancialManagement() {
  const { selectedBuildingId } = useBuildingContext();

  return (
    <div className="space-y-8">
      <StrataFinancialDashboard />
      <LevyPaymentManager buildingId={selectedBuildingId} />
    </div>
  );
}