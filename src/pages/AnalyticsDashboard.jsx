import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useBuildingContext } from '@/components/BuildingContext';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TrendingUp, DollarSign, Wrench, AlertTriangle, Calendar, Activity, Zap } from 'lucide-react';
import PageHeader from '@/components/common/PageHeader';
import { differenceInDays, format, startOfMonth, endOfMonth, eachMonthOfInterval, subMonths, isPast } from 'date-fns';
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

  const { data: maintenanceSchedules = [] } = useQuery({
    queryKey: ['maintenanceSchedules'],
    queryFn: () => base44.entities.MaintenanceSchedule.list()
  });

  // Filter by building
  const filteredWO = selectedBuildingId ? workOrders.filter(w => w.building_id === selectedBuildingId) : workOrders;
  const filteredAssets = selectedBuildingId ? assets.filter(a => a.building_id === selectedBuildingId) : assets;
  const filteredCompliance = selectedBuildingId ? complianceRecords.filter(c => c.building_id === selectedBuildingId) : complianceRecords;

  // Work order trends by month
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

  // Work orders by category
  const categoryData = Object.entries(
    filteredWO.reduce((acc, wo) => {
      const cat = wo.main_category || 'other';
      acc[cat] = (acc[cat] || 0) + 1;
      return acc;
    }, {})
  ).map(([name, value]) => ({ name: name.replace(/_/g, ' '), value })).slice(0, 6);

  // Asset health distribution
  const assetHealthData = [
    { name: 'Critical', value: filteredAssets.filter(a => a.health_score < 40).length },
    { name: 'Fair', value: filteredAssets.filter(a => a.health_score >= 40 && a.health_score < 70).length },
    { name: 'Good', value: filteredAssets.filter(a => a.health_score >= 70).length }
  ].filter(d => d.value > 0);

  // Compliance status
  const overdueCompliance = filteredCompliance.filter(c => c.status === 'overdue' || (c.next_due_date && isPast(new Date(c.next_due_date)))).length;
  const dueSoon = filteredCompliance.filter(c => {
    if (c.next_due_date) {
      const days = differenceInDays(new Date(c.next_due_date), new Date());
      return days >= 0 && days <= 30;
    }
    return false;
  }).length;

  // Response time analysis
  const avgResponseTime = filteredWO.filter(wo => wo.completed_date && wo.created_date).reduce((acc, wo) => {
    const days = differenceInDays(new Date(wo.completed_date), new Date(wo.created_date));
    return acc + days;
  }, 0) / (filteredWO.filter(wo => wo.completed_date).length || 1);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Analytics Dashboard"
        subtitle="Insights and predictive analytics for building operations"
      />

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-slate-600 flex items-center gap-2">
              <Wrench className="h-4 w-4" />
              Active Work Orders
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{filteredWO.filter(w => w.status !== 'completed' && w.status !== 'cancelled').length}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-slate-600 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Compliance Due
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-orange-600">{overdueCompliance + dueSoon}</p>
            <p className="text-xs text-slate-500">{overdueCompliance} overdue</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-slate-600 flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Avg Response Time
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{avgResponseTime.toFixed(1)}</p>
            <p className="text-xs text-slate-500">days</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-slate-600 flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Asset Health
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">
              {(filteredAssets.reduce((sum, a) => sum + (a.health_score || 0), 0) / (filteredAssets.length || 1)).toFixed(0)}%
            </p>
            <p className="text-xs text-slate-500">average score</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="workorders" className="space-y-6">
        <TabsList>
          <TabsTrigger value="workorders">Work Orders</TabsTrigger>
          <TabsTrigger value="assets">Assets</TabsTrigger>
          <TabsTrigger value="compliance">Compliance</TabsTrigger>
          <TabsTrigger value="energy">Energy Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="workorders" className="space-y-6">
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
                  <Pie data={assetHealthData} cx="50%" cy="50%" labelLine={false} label={({ name, value }) => `${name}: ${value}`} outerRadius={100} fill="#8884d8" dataKey="value">
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