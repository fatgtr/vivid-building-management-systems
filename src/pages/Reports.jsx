import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useBuildingContext } from '@/components/BuildingContext';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import MetricsCard from '@/components/analytics/MetricsCard';
import PredictiveInsights from '@/components/analytics/PredictiveInsights';
import AnomalyDetector from '@/components/analytics/AnomalyDetector';
import TrendsChart from '@/components/analytics/TrendsChart';
import { 
  BarChart3, 
  DollarSign, 
  Clock, 
  CheckCircle, 
  AlertTriangle,
  TrendingUp,
  Users,
  Wrench,
  Download,
  Loader2,
  Sparkles,
  FileText
} from 'lucide-react';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { toast } from 'sonner';

const COLORS = ['#3b82f6', '#06b6d4', '#8b5cf6', '#f59e0b', '#10b981', '#ef4444'];

export default function Reports() {
  const { selectedBuildingId } = useBuildingContext();
  const [timeframe, setTimeframe] = useState('30');
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiInsights, setAiInsights] = useState(null);

  const { data: workOrders = [] } = useQuery({
    queryKey: ['workOrders', selectedBuildingId],
    queryFn: () => selectedBuildingId 
      ? base44.entities.WorkOrder.filter({ building_id: selectedBuildingId })
      : base44.entities.WorkOrder.list('-created_date', 500),
  });

  const { data: assets = [] } = useQuery({
    queryKey: ['assets', selectedBuildingId],
    queryFn: () => selectedBuildingId
      ? base44.entities.Asset.filter({ building_id: selectedBuildingId })
      : base44.entities.Asset.list(),
  });

  // Filter by timeframe
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - parseInt(timeframe));
  const filteredWorkOrders = workOrders.filter(wo => new Date(wo.created_date) > cutoffDate);

  // Calculate metrics
  const completedOrders = filteredWorkOrders.filter(wo => wo.status === 'completed');
  const openOrders = filteredWorkOrders.filter(wo => wo.status === 'open');
  const totalCost = filteredWorkOrders.reduce((sum, wo) => sum + (wo.actual_cost || 0), 0);
  const avgCompletionTime = completedOrders.reduce((sum, wo) => {
    if (wo.completed_date && wo.created_date) {
      const days = Math.floor((new Date(wo.completed_date) - new Date(wo.created_date)) / (1000 * 60 * 60 * 24));
      return sum + days;
    }
    return sum;
  }, 0) / (completedOrders.length || 1);

  const satisfactionScore = filteredWorkOrders.filter(wo => wo.rating).reduce((sum, wo) => sum + wo.rating, 0) / (filteredWorkOrders.filter(wo => wo.rating).length || 1);

  // Compliance metrics
  const now = new Date();
  const compliantAssets = assets.filter(a => a.next_service_date && new Date(a.next_service_date) > now).length;
  const overdueAssets = assets.filter(a => a.next_service_date && new Date(a.next_service_date) < now).length;
  const complianceRate = assets.length > 0 ? (compliantAssets / assets.length * 100) : 0;

  // Category breakdown for chart
  const categoryData = Object.entries(
    filteredWorkOrders.reduce((acc, wo) => {
      acc[wo.category] = (acc[wo.category] || 0) + 1;
      return acc;
    }, {})
  ).map(([name, value]) => ({ name, value }));

  // Priority breakdown
  const priorityData = Object.entries(
    filteredWorkOrders.reduce((acc, wo) => {
      acc[wo.priority] = (acc[wo.priority] || 0) + 1;
      return acc;
    }, {})
  ).map(([name, value]) => ({ name, value }));

  // Monthly trend data
  const monthlyData = [];
  for (let i = 5; i >= 0; i--) {
    const date = new Date();
    date.setMonth(date.getMonth() - i);
    const monthName = date.toLocaleString('default', { month: 'short' });
    const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
    const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0);
    
    const monthOrders = workOrders.filter(wo => {
      const woDate = new Date(wo.created_date);
      return woDate >= monthStart && woDate <= monthEnd;
    });
    
    const monthCost = monthOrders.reduce((sum, wo) => sum + (wo.actual_cost || 0), 0);
    
    monthlyData.push({
      month: monthName,
      workOrders: monthOrders.length,
      cost: monthCost,
      completed: monthOrders.filter(wo => wo.status === 'completed').length
    });
  }

  const handleGenerateInsights = async () => {
    setIsGenerating(true);
    try {
      const { data } = await base44.functions.invoke('generateAnalyticsInsights', {
        buildingId: selectedBuildingId,
        timeframe,
        metricType: 'all'
      });
      
      setAiInsights(data.insights);
      toast.success('AI insights generated successfully');
    } catch (error) {
      toast.error('Failed to generate insights');
      console.error(error);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Analytics & Reports</h1>
          <p className="text-gray-600 mt-1">Comprehensive insights and performance metrics</p>
        </div>
        
        <div className="flex items-center gap-3">
          <Select value={timeframe} onValueChange={setTimeframe}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
              <SelectItem value="180">Last 6 months</SelectItem>
              <SelectItem value="365">Last year</SelectItem>
            </SelectContent>
          </Select>
          
          <Button 
            onClick={handleGenerateInsights}
            disabled={isGenerating}
            className="bg-gradient-to-r from-purple-600 to-blue-600 text-white"
          >
            {isGenerating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-2" />
                Generate AI Insights
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricsCard
          title="Total Work Orders"
          value={filteredWorkOrders.length}
          icon={Wrench}
          trend={filteredWorkOrders.length > workOrders.length * 0.5 ? 'up' : 'down'}
          trendValue={`${completedOrders.length} completed`}
          color="blue"
        />
        
        <MetricsCard
          title="Total Maintenance Cost"
          value={`$${totalCost.toLocaleString()}`}
          icon={DollarSign}
          trend="up"
          trendValue={`$${(totalCost / filteredWorkOrders.length || 0).toFixed(0)} avg`}
          color="green"
        />
        
        <MetricsCard
          title="Avg Completion Time"
          value={`${avgCompletionTime.toFixed(1)} days`}
          icon={Clock}
          trend={avgCompletionTime < 5 ? 'down' : 'up'}
          trendValue={avgCompletionTime < 5 ? 'Excellent' : 'Needs improvement'}
          color="orange"
        />
        
        <MetricsCard
          title="Compliance Rate"
          value={`${complianceRate.toFixed(0)}%`}
          icon={CheckCircle}
          trend={complianceRate > 80 ? 'up' : 'down'}
          trendValue={overdueAssets > 0 ? `${overdueAssets} overdue` : 'All compliant'}
          color={complianceRate > 80 ? 'green' : 'red'}
        />
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full max-w-xl grid-cols-3">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="ai-insights">AI Insights</TabsTrigger>
          <TabsTrigger value="detailed">Detailed Reports</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6 mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Work Orders by Category</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={categoryData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {categoryData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Work Orders by Priority</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={priorityData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="value" fill="#3b82f6" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Monthly Trends</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={350}>
                <LineChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis yAxisId="left" />
                  <YAxis yAxisId="right" orientation="right" />
                  <Tooltip />
                  <Legend />
                  <Line yAxisId="left" type="monotone" dataKey="workOrders" stroke="#3b82f6" name="Work Orders" strokeWidth={2} />
                  <Line yAxisId="right" type="monotone" dataKey="cost" stroke="#10b981" name="Cost ($)" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-6">
                <div className="text-center">
                  <Users className="h-8 w-8 mx-auto mb-2 text-blue-600" />
                  <p className="text-2xl font-bold">{satisfactionScore.toFixed(1)}/5</p>
                  <p className="text-sm text-gray-600">Resident Satisfaction</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="text-center">
                  <CheckCircle className="h-8 w-8 mx-auto mb-2 text-green-600" />
                  <p className="text-2xl font-bold">{((completedOrders.length / filteredWorkOrders.length * 100) || 0).toFixed(0)}%</p>
                  <p className="text-sm text-gray-600">Completion Rate</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="text-center">
                  <AlertTriangle className="h-8 w-8 mx-auto mb-2 text-orange-600" />
                  <p className="text-2xl font-bold">{openOrders.length}</p>
                  <p className="text-sm text-gray-600">Open Work Orders</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="ai-insights" className="space-y-6 mt-6">
          {!aiInsights ? (
            <Card>
              <CardContent className="p-12 text-center">
                <Sparkles className="h-16 w-16 mx-auto mb-4 text-purple-600" />
                <h3 className="text-xl font-semibold mb-2">AI-Powered Analytics</h3>
                <p className="text-gray-600 mb-6 max-w-lg mx-auto">
                  Generate comprehensive AI insights including trend analysis, predictive forecasts, anomaly detection, and actionable recommendations.
                </p>
                <Button 
                  onClick={handleGenerateInsights}
                  disabled={isGenerating}
                  className="bg-gradient-to-r from-purple-600 to-blue-600 text-white"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Analyzing Data...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4 mr-2" />
                      Generate Insights
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          ) : (
            <>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5 text-blue-600" />
                    Executive Summary
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-700 leading-relaxed">{aiInsights.summary}</p>
                </CardContent>
              </Card>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <TrendsChart trends={aiInsights.trends || []} />
                <AnomalyDetector anomalies={aiInsights.anomalies || []} />
              </div>

              <PredictiveInsights predictions={aiInsights.predictions || []} />

              {aiInsights.recommendations && aiInsights.recommendations.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                      Actionable Recommendations
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {aiInsights.recommendations.map((rec, idx) => (
                        <div key={idx} className="flex items-start gap-3 p-3 bg-green-50 rounded-lg border border-green-200">
                          <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                          <p className="text-sm text-gray-700">{rec}</p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </TabsContent>

        <TabsContent value="detailed" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Detailed Performance Metrics
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
                  <div>
                    <p className="text-sm text-gray-600">Total Work Orders</p>
                    <p className="text-2xl font-bold">{filteredWorkOrders.length}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Completed</p>
                    <p className="text-2xl font-bold text-green-600">{completedOrders.length}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">In Progress</p>
                    <p className="text-2xl font-bold text-blue-600">
                      {filteredWorkOrders.filter(wo => wo.status === 'in_progress').length}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Open</p>
                    <p className="text-2xl font-bold text-orange-600">{openOrders.length}</p>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <h4 className="font-semibold mb-3">Cost Analysis</h4>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <p className="text-sm text-gray-600">Total Cost</p>
                      <p className="text-xl font-bold">${totalCost.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Average Cost</p>
                      <p className="text-xl font-bold">${(totalCost / filteredWorkOrders.length || 0).toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Highest Cost Category</p>
                      <p className="text-xl font-bold">
                        {categoryData.sort((a, b) => b.value - a.value)[0]?.name || 'N/A'}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <h4 className="font-semibold mb-3">Compliance Status</h4>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <p className="text-sm text-gray-600">Total Assets</p>
                      <p className="text-xl font-bold">{assets.length}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Compliant</p>
                      <p className="text-xl font-bold text-green-600">{compliantAssets}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Overdue</p>
                      <p className="text-xl font-bold text-red-600">{overdueAssets}</p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}