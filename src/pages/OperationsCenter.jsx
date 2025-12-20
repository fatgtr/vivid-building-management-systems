import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useBuildingContext } from '@/components/BuildingContext';
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { 
  Wrench, 
  Package, 
  Calendar, 
  ClipboardCheck, 
  HardHat,
  AlertTriangle,
  CheckCircle2,
  Clock,
  TrendingUp,
  BarChart3
} from 'lucide-react';

// Import existing page components
import WorkOrders from './WorkOrders';
import AssetRegister from './AssetRegister';
import MaintenanceSchedule from './MaintenanceSchedule';
import Inspections from './Inspections';
import Contractors from './Contractors';
import Reports from './Reports';

export default function OperationsCenter() {
  const { selectedBuildingId } = useBuildingContext();
  const [activeTab, setActiveTab] = useState('overview');

  // Fetch data for overview dashboard
  const { data: workOrders = [] } = useQuery({
    queryKey: ['workOrders', selectedBuildingId],
    queryFn: () => selectedBuildingId 
      ? base44.entities.WorkOrder.filter({ building_id: selectedBuildingId })
      : base44.entities.WorkOrder.list(),
  });

  const { data: assets = [] } = useQuery({
    queryKey: ['assets', selectedBuildingId],
    queryFn: () => selectedBuildingId 
      ? base44.entities.Asset.filter({ building_id: selectedBuildingId })
      : base44.entities.Asset.list(),
  });

  const { data: schedules = [] } = useQuery({
    queryKey: ['maintenanceSchedules'],
    queryFn: () => base44.entities.MaintenanceSchedule.list(),
  });

  const { data: inspections = [] } = useQuery({
    queryKey: ['inspections'],
    queryFn: () => base44.entities.Inspection.list(),
  });

  const { data: contractors = [] } = useQuery({
    queryKey: ['contractors'],
    queryFn: () => base44.entities.Contractor.list(),
  });

  // Calculate metrics
  const openWorkOrders = workOrders.filter(wo => wo.status === 'open' || wo.status === 'in_progress').length;
  const urgentWorkOrders = workOrders.filter(wo => wo.priority === 'urgent').length;
  const totalAssets = assets.length;
  const assetsNeedingService = assets.filter(a => a.compliance_status === 'overdue' || a.compliance_status === 'due_soon').length;
  const activeSchedules = schedules.filter(s => s.status === 'active').length;
  const upcomingInspections = inspections.filter(i => i.status === 'scheduled').length;
  const activeContractors = contractors.filter(c => c.status === 'active').length;
  const completedWorkOrders = workOrders.filter(wo => wo.status === 'completed').length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Operations Center</h1>
        <p className="text-slate-600 mt-1">Centralized hub for managing building operations, maintenance, and contractors</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-7">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="work-orders" className="flex items-center gap-2">
            <Wrench className="h-4 w-4" />
            Work Orders
            {openWorkOrders > 0 && (
              <Badge variant="secondary" className="ml-1">{openWorkOrders}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="assets" className="flex items-center gap-2">
            <Package className="h-4 w-4" />
            Assets
            {assetsNeedingService > 0 && (
              <Badge variant="destructive" className="ml-1">{assetsNeedingService}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="maintenance" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Maintenance
          </TabsTrigger>
          <TabsTrigger value="inspections" className="flex items-center gap-2">
            <ClipboardCheck className="h-4 w-4" />
            Inspections
          </TabsTrigger>
          <TabsTrigger value="contractors" className="flex items-center gap-2">
            <HardHat className="h-4 w-4" />
            Contractors
          </TabsTrigger>
          <TabsTrigger value="reports" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Reports
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6 mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Work Orders Card */}
            <Card 
              className="cursor-pointer hover:shadow-md transition-shadow border-l-4 border-l-orange-500"
              onClick={() => setActiveTab('work-orders')}
            >
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-500 mb-1">Open Work Orders</p>
                    <p className="text-3xl font-bold text-slate-900">{openWorkOrders}</p>
                    {urgentWorkOrders > 0 && (
                      <p className="text-xs text-red-600 font-medium mt-2 flex items-center gap-1">
                        <AlertTriangle className="h-3 w-3" />
                        {urgentWorkOrders} urgent
                      </p>
                    )}
                  </div>
                  <div className="h-12 w-12 rounded-full bg-orange-100 flex items-center justify-center">
                    <Wrench className="h-6 w-6 text-orange-600" />
                  </div>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-100 text-xs text-slate-600">
                  {completedWorkOrders} completed this month
                </div>
              </CardContent>
            </Card>

            {/* Assets Card */}
            <Card 
              className="cursor-pointer hover:shadow-md transition-shadow border-l-4 border-l-blue-500"
              onClick={() => setActiveTab('assets')}
            >
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-500 mb-1">Total Assets</p>
                    <p className="text-3xl font-bold text-slate-900">{totalAssets}</p>
                    {assetsNeedingService > 0 && (
                      <p className="text-xs text-red-600 font-medium mt-2 flex items-center gap-1">
                        <AlertTriangle className="h-3 w-3" />
                        {assetsNeedingService} need service
                      </p>
                    )}
                  </div>
                  <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
                    <Package className="h-6 w-6 text-blue-600" />
                  </div>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-100 text-xs text-slate-600">
                  Tracked across all categories
                </div>
              </CardContent>
            </Card>

            {/* Maintenance Card */}
            <Card 
              className="cursor-pointer hover:shadow-md transition-shadow border-l-4 border-l-purple-500"
              onClick={() => setActiveTab('maintenance')}
            >
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-500 mb-1">Active Schedules</p>
                    <p className="text-3xl font-bold text-slate-900">{activeSchedules}</p>
                    <p className="text-xs text-slate-600 mt-2 flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      Recurring maintenance
                    </p>
                  </div>
                  <div className="h-12 w-12 rounded-full bg-purple-100 flex items-center justify-center">
                    <Calendar className="h-6 w-6 text-purple-600" />
                  </div>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-100 text-xs text-slate-600">
                  Auto-scheduled events
                </div>
              </CardContent>
            </Card>

            {/* Inspections Card */}
            <Card 
              className="cursor-pointer hover:shadow-md transition-shadow border-l-4 border-l-emerald-500"
              onClick={() => setActiveTab('inspections')}
            >
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-500 mb-1">Upcoming Inspections</p>
                    <p className="text-3xl font-bold text-slate-900">{upcomingInspections}</p>
                    <p className="text-xs text-slate-600 mt-2 flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      Scheduled
                    </p>
                  </div>
                  <div className="h-12 w-12 rounded-full bg-emerald-100 flex items-center justify-center">
                    <ClipboardCheck className="h-6 w-6 text-emerald-600" />
                  </div>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-100 text-xs text-slate-600">
                  Compliance tracking
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Quick Stats Row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-indigo-100 flex items-center justify-center">
                    <HardHat className="h-5 w-5 text-indigo-600" />
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">Active Contractors</p>
                    <p className="text-2xl font-bold text-slate-900">{activeContractors}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-green-100 flex items-center justify-center">
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">Completed Work Orders</p>
                    <p className="text-2xl font-bold text-slate-900">{completedWorkOrders}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-amber-100 flex items-center justify-center">
                    <AlertTriangle className="h-5 w-5 text-amber-600" />
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">Needs Attention</p>
                    <p className="text-2xl font-bold text-slate-900">
                      {urgentWorkOrders + assetsNeedingService}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Quick Actions Info */}
          <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
            <CardContent className="pt-6">
              <div className="flex items-start gap-4">
                <div className="h-10 w-10 rounded-lg bg-blue-600 flex items-center justify-center flex-shrink-0">
                  <TrendingUp className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900 mb-1">Streamlined Operations</h3>
                  <p className="text-sm text-slate-600">
                    All your building operations are now centralized in one place. Navigate through tabs to manage work orders, 
                    track assets, schedule maintenance, conduct inspections, and manage contractors - all without leaving this hub.
                  </p>
                  <p className="text-sm text-blue-600 font-medium mt-2">
                    Tip: Click on any metric card above to jump directly to that section.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="work-orders" className="mt-6">
          <WorkOrders />
        </TabsContent>

        <TabsContent value="assets" className="mt-6">
          <AssetRegister />
        </TabsContent>

        <TabsContent value="maintenance" className="mt-6">
          <MaintenanceSchedule />
        </TabsContent>

        <TabsContent value="inspections" className="mt-6">
          <Inspections />
        </TabsContent>

        <TabsContent value="contractors" className="mt-6">
          <Contractors />
        </TabsContent>

        <TabsContent value="reports" className="mt-6">
          <Reports />
        </TabsContent>
      </Tabs>
    </div>
  );
}