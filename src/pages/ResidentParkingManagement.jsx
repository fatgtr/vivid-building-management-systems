import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useBuildingContext } from '@/components/BuildingContext';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MapPin, Upload, List, Map } from 'lucide-react';
import PageHeader from '@/components/common/PageHeader';
import EmptyState from '@/components/common/EmptyState';
import ParkingAllocationList from '@/components/parking/ParkingAllocationList';
import ParkingMapManager from '@/components/parking/ParkingMapManager';

export default function ResidentParkingManagement() {
  const { selectedBuildingId } = useBuildingContext();
  const [activeTab, setActiveTab] = useState('list');

  // Fetch parking allocations
  const { data: parkingSpaces = [], isLoading } = useQuery({
    queryKey: ['residentParking', selectedBuildingId],
    queryFn: () => selectedBuildingId 
      ? base44.entities.ResidentParking.filter({ building_id: selectedBuildingId })
      : Promise.resolve([]),
    enabled: !!selectedBuildingId
  });

  // Fetch parking maps
  const { data: parkingMaps = [] } = useQuery({
    queryKey: ['parkingMaps', selectedBuildingId],
    queryFn: () => selectedBuildingId 
      ? base44.entities.ParkingPlanMap.filter({ building_id: selectedBuildingId, is_active: true })
      : Promise.resolve([]),
    enabled: !!selectedBuildingId
  });

  // Fetch units for this building
  const { data: units = [] } = useQuery({
    queryKey: ['units', selectedBuildingId],
    queryFn: () => selectedBuildingId 
      ? base44.entities.Unit.filter({ building_id: selectedBuildingId })
      : Promise.resolve([]),
    enabled: !!selectedBuildingId
  });

  if (!selectedBuildingId) {
    return (
      <div className="p-8">
        <EmptyState
          icon={MapPin}
          title="No Building Selected"
          description="Please select a building to manage resident parking allocations"
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Resident Parking Management"
        subtitle="Manage parking spaces on title and their allocations to units"
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total Spaces</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{parkingSpaces.length}</div>
            <p className="text-xs text-slate-500">Parking bays registered</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Allocated</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {parkingSpaces.filter(p => p.status === 'allocated').length}
            </div>
            <p className="text-xs text-slate-500">Assigned to units</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Parking Plans</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{parkingMaps.length}</div>
            <p className="text-xs text-slate-500">Maps uploaded</p>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2 max-w-md">
          <TabsTrigger value="list" className="flex items-center gap-2">
            <List className="h-4 w-4" />
            Allocations
          </TabsTrigger>
          <TabsTrigger value="map" className="flex items-center gap-2">
            <Map className="h-4 w-4" />
            Maps & Markup
          </TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="mt-6">
          <ParkingAllocationList 
            parkingSpaces={parkingSpaces} 
            units={units}
            buildingId={selectedBuildingId}
          />
        </TabsContent>

        <TabsContent value="map" className="mt-6">
          <ParkingMapManager 
            maps={parkingMaps}
            parkingSpaces={parkingSpaces}
            buildingId={selectedBuildingId}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}