import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TrendingUp, TrendingDown, DollarSign, Wrench, Users, Calendar, Download, FileText } from 'lucide-react';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { format, subMonths } from 'date-fns';

export default function ComprehensiveAnalytics({ buildingId }) {
  const [timeRange, setTimeRange] = useState('6m');

  const { data: workOrders = [] } = useQuery({
    queryKey: ['workOrders'],
    queryFn: () => base44.entities.WorkOrder.list(),
  });

  const { data: levies = [] } = useQuery({
    queryKey: ['levies'],
    queryFn: () => base44.entities.LevyPayment.list(),
  });

  const { data: residents = [] } = useQuery({
    queryKey: ['residents'],
    queryFn: () => base44.entities.Resident.list(),
  });

  // Filter by building if specified
  const filteredWorkOrders = buildingId 
    ? workOrders.filter(w => w.building_id === buildingId)
    : workOrders;

  const filteredLevies = buildingId
    ? levies.filter(l => l.building_id === buildingId)
    : levies;

  // Calculate metrics
  const totalWorkOrders = filteredWorkOrders.length;
  const completedWorkOrders = filteredWorkOrders.filter(w => w.status === 'completed').length;
  const avgCompletionRate = totalWorkOrders > 0 ? (completedWorkOrders / totalWorkOrders * 100).toFixed(1) : 0;
  
  const totalSpent = filteredWorkOrders
    .filter(w => w.actual_cost)
    .reduce((sum, w) => sum + (w.actual_cost || 0), 0);

  const levyCollectionRate = levies.length > 0
    ? (levies.filter(l => l.status === 'paid').length / levies.length * 100).toFixed(1)
    : 0;

  // Work orders by category
  const categoryData = {};
  filteredWorkOrders.forEach(wo => {
    const cat = wo.main_category || 'other';
    categoryData[cat] = (categoryData[cat] || 0) + 1;
  });

  const categoryChartData = Object.entries(categoryData).map(([name, value]) => ({
    name: name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
    value
  }));

  // Monthly work orders trend
  const last6Months = Array.from({ length: 6 }, (_, i) => {
    const date = subMonths(new Date(), 5 - i);
    return format(date, 'MMM yyyy');
  });

  const monthlyData = last6Months.map(month => {
    const count = filteredWorkOrders.filter(wo => {
      const woMonth = format(new Date(wo.created_date), 'MMM yyyy');
      return woMonth === month;
    }).length;
    return { month, count };
  });

  // Status distribution
  const statusData = [
    { name: 'Open', value: filteredWorkOrders.filter(w => w.status === 'open').length, color: '#f59e0b' },
    { name: 'In Progress', value: filteredWorkOrders.filter(w => w.status === 'in_progress').length, color: '#3b82f6' },
    { name: 'Completed', value: filteredWorkOrders.filter(w => w.status === 'completed').length, color: '#10b981' }
  ];

  const COLORS = ['#f59e0b', '#3b82f6', '#10b981', '#8b5cf6', '#ec4899'];

  const generateReport = () => {
    // Logic to generate PDF report
    alert('Report generation coming soon!');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Analytics Dashboard</h2>
          <p className="text-slate-600">Overview of building performance</p>
        </div>
        <div className="flex gap-2">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1m">Last Month</SelectItem>
              <SelectItem value="3m">Last 3 Months</SelectItem>
              <SelectItem value="6m">Last 6 Months</SelectItem>
              <SelectItem value="1y">Last Year</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={generateReport} variant="outline" className="gap-2">
            <Download className="h-4 w-4" />
            Export Report
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Work Orders</p>
                <p className="text-3xl font-bold">{totalWorkOrders}</p>
                <p className="text-xs text-green-600 mt-1">
                  {avgCompletionRate}% completed
                </p>
              </div>
              <Wrench className="h-10 w-10 text-blue-600 opacity-20" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Total Spent</p>
                <p className="text-3xl font-bold">${(totalSpent / 1000).toFixed(1)}k</p>
                <p className="text-xs text-slate-600 mt-1">
                  Avg ${(totalSpent / (completedWorkOrders || 1)).toFixed(0)} per job
                </p>
              </div>
              <DollarSign className="h-10 w-10 text-green-600 opacity-20" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Levy Collection</p>
                <p className="text-3xl font-bold">{levyCollectionRate}%</p>
                <p className="text-xs text-slate-600 mt-1">
                  {levies.filter(l => l.status === 'paid').length}/{levies.length} paid
                </p>
              </div>
              <TrendingUp className="h-10 w-10 text-purple-600 opacity-20" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Residents</p>
                <p className="text-3xl font-bold">{residents.length}</p>
                <p className="text-xs text-slate-600 mt-1">
                  Active residents
                </p>
              </div>
              <Users className="h-10 w-10 text-indigo-600 opacity-20" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Trend */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Work Orders Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" style={{ fontSize: '12px' }} />
                <YAxis style={{ fontSize: '12px' }} />
                <Tooltip />
                <Line type="monotone" dataKey="count" stroke="#3b82f6" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Status Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Status Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Category Breakdown */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg">Work Orders by Category</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={categoryChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" style={{ fontSize: '11px' }} angle={-45} textAnchor="end" height={100} />
                <YAxis style={{ fontSize: '12px' }} />
                <Tooltip />
                <Bar dataKey="value" fill="#6366f1" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}