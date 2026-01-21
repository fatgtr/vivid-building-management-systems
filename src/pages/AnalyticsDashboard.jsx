import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useBuildingContext } from '@/components/BuildingContext';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TrendingUp, Wrench, AlertTriangle, Activity, Zap } from 'lucide-react';
import { differenceInDays, format, startOfMonth, endOfMonth, eachMonthOfInterval, subMonths, isPast } from 'date-fns';
import ComprehensiveAnalytics from '@/components/analytics/ComprehensiveAnalytics';
import EnergyAnalyticsDashboard from '@/components/energy/EnergyAnalyticsDashboard';

const COLORS = ['#3b82f6', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444'];

export default function AnalyticsDashboard() {
  const { selectedBuildingId } = useBuildingContext();

  const { data: workOrders = [] } = useQuery({
    queryKey: ['workOrders'],
    queryFn: () => base44.entities.WorkOrder.list()
  });

  const { data: assets = [] } = useQuery({
    queryKey: ['assets'],
    queryFn: () => base44.entities.Asset.list()
  });

  const { data: complianceRecords = [] } = useQuery({
    queryKey: ['complianceRecords'],
    queryFn: () => base44.entities.ComplianceRecord.list()
  });

  // Filter by building
  const filteredWO = selectedBuildingId ? workOrders.filter(w => w.building_id === selectedBuildingId) : workOrders;
  const filteredAssets = selectedBuildingId ? assets.filter(a => a.building_id === selectedBuildingId) : assets;
  const filteredCompliance = selectedBuildingId ? complianceRecords.filter(c => c.building_id === selectedBuildingId) : complianceRecords;

  // Work order trends
  const last6Months = eachMonthOfInterval({
    start: subMonths(new Date(), 5),
    end: new Date()
  });

  const workOrderTrends = last6Months.map(month => {
    const monthStart = startOfMonth(month);
    const monthEnd = endOfMonth(month);
    const count = filteredWO.filter(wo => {
      const created = new Date(wo.created_date);
      return created >= monthStart && created <= monthEnd;
    }).length;

    return {
      month: format(month, 'MMM'),
      count
    };
  });

  // Category data
  const categoryData = Object.entries(
    filteredWO.reduce((acc, wo) => {
      const cat = wo.main_category || 'other';
      acc[cat] = (acc[cat] || 0) + 1;
      return acc;
    }, {})
  ).map(([name, value]) => ({ name: name.replace(/_/g, ' '), value })).slice(0, 6);

  // Asset health
  const assetHealthData = [
    { name: 'Critical', value: filteredAssets.filter(a => a.health_score < 40).length },
    { name: 'Fair', value: filteredAssets.filter(a => a.health_score >= 40 && a.health_score < 70).length },
    { name: 'Good', value: filteredAssets.filter(a => a.health_score >= 70).length }
  ].filter(d => d.value > 0);

  // Compliance
  const overdueCompliance = filteredCompliance.filter(c => c.status === 'overdue' || (c.next_due_date && isPast(new Date(c.next_due_date)))).length;
  const dueSoon = filteredCompliance.filter(c => {
    if (c.next_due_date) {
      const days = differenceInDays(new Date(c.next_due_date), new Date());
      return days >= 0 && days <= 30;
    }
    return false;
  }).length;

  const avgResponseTime = filteredWO.filter(wo => wo.completed_date && wo.created_date).reduce((acc, wo) => {
    const days = differenceInDays(new Date(wo.completed_date), new Date(wo.created_date));
    return acc + days;
  }, 0) / (filteredWO.filter(wo => wo.completed_date).length || 1);

  return (
    <div className="space-y-6">
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="workorders">Work Orders</TabsTrigger>
          <TabsTrigger value="assets">Assets</TabsTrigger>
          <TabsTrigger value="compliance">Compliance</TabsTrigger>
          <TabsTrigger value="energy">Energy</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <ComprehensiveAnalytics buildingId={selectedBuildingId} />
        </TabsContent>

        <TabsContent value="workorders" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-500">Active</p>
                    <p className="text-3xl font-bold">{filteredWO.filter(w => w.status !== 'completed').length}</p>
                  </div>
                  <Wrench className="h-10 w-10 text-blue-600 opacity-20" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-500">Avg Response</p>
                    <p className="text-3xl font-bold">{avgResponseTime.toFixed(1)}</p>
                    <p className="text-xs text-slate-500">days</p>
                  </div>
                  <Activity className="h-10 w-10 text-green-600 opacity-20" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-500">Total Cost</p>
                    <p className="text-3xl font-bold">
                      ${(filteredWO.filter(w => w.actual_cost).reduce((sum, w) => sum + w.actual_cost, 0) / 1000).toFixed(1)}k
                    </p>
                  </div>
                  <TrendingUp className="h-10 w-10 text-purple-600 opacity-20" />
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Work Orders Trend</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={workOrderTrends}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="count" stroke="#3b82f6" strokeWidth={2} name="Work Orders" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Work Orders by Category</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={categoryData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="value" fill="#3b82f6" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="assets">
          <Card>
            <CardHeader>
              <CardTitle>Asset Health Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie data={assetHealthData} cx="50%" cy="50%" labelLine={false} label={({ name, value }) => `${name}: ${value}`} outerRadius={100} dataKey="value">
                    {assetHealthData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="compliance">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="border-2 border-red-200">
              <CardHeader>
                <CardTitle className="text-sm font-medium text-red-600">Overdue Items</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-4xl font-bold text-red-600">{overdueCompliance}</p>
              </CardContent>
            </Card>
            <Card className="border-2 border-orange-200">
              <CardHeader>
                <CardTitle className="text-sm font-medium text-orange-600">Due Within 30 Days</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-4xl font-bold text-orange-600">{dueSoon}</p>
              </CardContent>
            </Card>
            <Card className="border-2 border-green-200">
              <CardHeader>
                <CardTitle className="text-sm font-medium text-green-600">Compliant</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-4xl font-bold text-green-600">
                  {filteredCompliance.filter(c => c.status === 'compliant' || c.status === 'passed').length}
                </p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="energy">
          {selectedBuildingId ? (
            <EnergyAnalyticsDashboard buildingId={selectedBuildingId} />
          ) : (
            <Card>
              <CardContent className="p-12 text-center">
                <Zap className="h-16 w-16 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-600 font-medium mb-2">Select a Building</p>
                <p className="text-sm text-slate-500">Please select a building to view energy analytics</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}