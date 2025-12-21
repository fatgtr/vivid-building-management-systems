import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useBuildingContext } from '@/components/BuildingContext';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import PageHeader from '@/components/common/PageHeader';
import StatusBadge from '@/components/common/StatusBadge';
import { Building2, Wrench, Plus, Clock, TrendingUp, CheckCircle2, AlertCircle } from 'lucide-react';
import { createPageUrl } from '@/utils';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';

export default function PartnerDashboard() {
  const { user, managedBuildings } = useBuildingContext();
  const partnerId = user?.partner_id;

  const { data: workOrders = [], isLoading: loadingWorkOrders } = useQuery({
    queryKey: ['partnerWorkOrders'],
    queryFn: () => base44.entities.WorkOrder.list('-created_date', 100),
    enabled: !!partnerId,
  });

  const isLoading = loadingWorkOrders;

  if (isLoading) {
    return (
      <div className="space-y-8">
        <PageHeader title="Partner Dashboard" subtitle="Overview of your managed properties and work orders" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  const managedBuildingIds = managedBuildings.map(b => b.id);
  const filteredWorkOrders = workOrders.filter(wo => managedBuildingIds.includes(wo.building_id));
  
  const activeWorkOrders = filteredWorkOrders.filter(wo => wo.status !== 'completed' && wo.status !== 'cancelled');
  const completedWorkOrders = filteredWorkOrders.filter(wo => wo.status === 'completed');
  
  const now = new Date();
  const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const completedThisMonth = completedWorkOrders.filter(wo => 
    wo.completed_date && new Date(wo.completed_date) >= firstDayOfMonth
  );

  const calculateAvgResolutionTime = () => {
    const completedWithDates = completedWorkOrders.filter(wo => wo.created_date && wo.completed_date);
    if (completedWithDates.length === 0) return 'N/A';
    
    const totalDays = completedWithDates.reduce((sum, wo) => {
      const created = new Date(wo.created_date);
      const completed = new Date(wo.completed_date);
      const days = Math.floor((completed - created) / (1000 * 60 * 60 * 24));
      return sum + days;
    }, 0);
    
    const avgDays = Math.round(totalDays / completedWithDates.length);
    return `${avgDays} days`;
  };

  const urgentWorkOrders = activeWorkOrders.filter(wo => wo.priority === 'urgent');
  const highPriorityWorkOrders = activeWorkOrders.filter(wo => wo.priority === 'high');

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Partner Dashboard" 
        subtitle={`Managing ${managedBuildings.length} ${managedBuildings.length === 1 ? 'property' : 'properties'}`}
      >
        <Button asChild className="bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-600/20">
          <Link to={createPageUrl('OperationsCenter')}>
            <Plus className="h-4 w-4 mr-2" />
            Add New Work Order
          </Link>
        </Button>
      </PageHeader>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="hover:shadow-lg transition-shadow duration-300 border-l-4 border-l-orange-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Work Orders</CardTitle>
            <Wrench className="h-5 w-5 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-900">{activeWorkOrders.length}</div>
            <p className="text-xs text-slate-500 mt-1">Currently open or in progress</p>
            {urgentWorkOrders.length > 0 && (
              <Badge className="mt-2 bg-red-100 text-red-700 hover:bg-red-100">
                {urgentWorkOrders.length} urgent
              </Badge>
            )}
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow duration-300 border-l-4 border-l-blue-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Managed Buildings</CardTitle>
            <Building2 className="h-5 w-5 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-900">{managedBuildings.length}</div>
            <p className="text-xs text-slate-500 mt-1">Properties under your management</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow duration-300 border-l-4 border-l-green-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed This Month</CardTitle>
            <CheckCircle2 className="h-5 w-5 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-900">{completedThisMonth.length}</div>
            <p className="text-xs text-slate-500 mt-1">Work orders finished in {format(now, 'MMMM')}</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow duration-300 border-l-4 border-l-purple-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg. Resolution Time</CardTitle>
            <Clock className="h-5 w-5 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-900">{calculateAvgResolutionTime()}</div>
            <p className="text-xs text-slate-500 mt-1">Based on {completedWorkOrders.length} completed orders</p>
          </CardContent>
        </Card>
      </div>

      {/* Active Work Orders Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-orange-600" />
              Priority Work Orders
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {urgentWorkOrders.length > 0 && (
              <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                <div>
                  <p className="text-sm font-semibold text-slate-900">Urgent Priority</p>
                  <p className="text-xs text-slate-500">Requires immediate attention</p>
                </div>
                <span className="text-2xl font-bold text-red-600">{urgentWorkOrders.length}</span>
              </div>
            )}
            {highPriorityWorkOrders.length > 0 && (
              <div className="flex items-center justify-between p-3 bg-orange-50 rounded-lg">
                <div>
                  <p className="text-sm font-semibold text-slate-900">High Priority</p>
                  <p className="text-xs text-slate-500">Needs prompt action</p>
                </div>
                <span className="text-2xl font-bold text-orange-600">{highPriorityWorkOrders.length}</span>
              </div>
            )}
            {urgentWorkOrders.length === 0 && highPriorityWorkOrders.length === 0 && (
              <div className="text-center py-8">
                <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-2" />
                <p className="text-sm font-medium text-slate-700">No urgent work orders</p>
                <p className="text-xs text-slate-500 mt-1">All priority items are under control</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-blue-600" />
                Recent Activity
              </CardTitle>
              <Button variant="ghost" size="sm" asChild>
                <Link to={createPageUrl('OperationsCenter')}>View All</Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {filteredWorkOrders.slice(0, 5).map((wo) => (
              <div key={wo.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-900 truncate">{wo.title}</p>
                  <p className="text-xs text-slate-500">
                    {wo.created_date && format(new Date(wo.created_date), 'MMM dd, yyyy')}
                  </p>
                </div>
                <StatusBadge status={wo.status} className="ml-2" />
              </div>
            ))}
            {filteredWorkOrders.length === 0 && (
              <div className="text-center py-8">
                <Wrench className="h-12 w-12 text-slate-300 mx-auto mb-2" />
                <p className="text-sm font-medium text-slate-700">No work orders yet</p>
                <p className="text-xs text-slate-500 mt-1">Create your first work order to get started</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Buildings Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-blue-600" />
            Your Managed Properties
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {managedBuildings.map((building) => {
              const buildingWorkOrders = filteredWorkOrders.filter(wo => wo.building_id === building.id);
              const buildingActive = buildingWorkOrders.filter(wo => wo.status !== 'completed' && wo.status !== 'cancelled').length;
              
              return (
                <Link key={building.id} to={createPageUrl(`BuildingProfile?id=${building.id}`)}>
                  <Card className="hover:shadow-md transition-shadow cursor-pointer">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="font-semibold text-slate-900">{building.name}</h3>
                        {buildingActive > 0 && (
                          <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">
                            {buildingActive} active
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-slate-500">{building.address}</p>
                      {building.strata_plan_number && (
                        <p className="text-xs text-slate-400 mt-1">SP: {building.strata_plan_number}</p>
                      )}
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}