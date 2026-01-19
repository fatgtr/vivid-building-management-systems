import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, DoorOpen, Calendar, Package } from 'lucide-react';
import ResidentsTab from '@/components/residents/ResidentsTab';
import VisitorsTab from '@/components/residents/VisitorsTab';
import AmenitiesTab from '@/components/residents/AmenitiesTab';
import ParcelManagement from '@/components/residents/ParcelManagement';

export default function ResidentsCenter() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4 mb-6">
        <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center shadow-lg shadow-purple-500/30">
          <Users className="h-6 w-6 text-white" />
        </div>
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-slate-900">Residents Center</h1>
          <p className="text-slate-500">Manage residents, visitors, amenities & parcels</p>
        </div>
      </div>

      <Tabs defaultValue="residents" className="space-y-6">
        <TabsList className="bg-slate-100">
          <TabsTrigger value="residents" className="gap-2">
            <Users className="h-4 w-4" />
            Residents
          </TabsTrigger>
          <TabsTrigger value="visitors" className="gap-2">
            <DoorOpen className="h-4 w-4" />
            Visitors
          </TabsTrigger>
          <TabsTrigger value="amenities" className="gap-2">
            <Calendar className="h-4 w-4" />
            Amenities
          </TabsTrigger>
          <TabsTrigger value="parcels" className="gap-2">
            <Package className="h-4 w-4" />
            Parcels
          </TabsTrigger>
        </TabsList>

        <TabsContent value="residents">
          <ResidentsTab />
        </TabsContent>

        <TabsContent value="visitors">
          <VisitorsTab />
        </TabsContent>

        <TabsContent value="amenities">
          <AmenitiesTab />
        </TabsContent>

        <TabsContent value="parcels">
          <ParcelManagement />
        </TabsContent>
      </Tabs>
    </div>
  );
}