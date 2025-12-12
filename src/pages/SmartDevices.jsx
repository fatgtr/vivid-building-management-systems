import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useBuildingContext } from '@/components/BuildingContext';
import SmartDeviceManager from '@/components/smartdevices/SmartDeviceManager';
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Wifi, Info } from 'lucide-react';

export default function SmartDevices() {
  const { selectedBuildingId } = useBuildingContext();

  if (!selectedBuildingId) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            Please select a building to manage smart device integrations
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      <SmartDeviceManager buildingId={selectedBuildingId} />
    </div>
  );
}