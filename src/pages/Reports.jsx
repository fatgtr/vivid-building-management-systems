import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useBuildingContext } from '@/components/BuildingContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Download, 
  Calendar as CalendarIcon, 
  TrendingUp, 
  TrendingDown,
  ClipboardList,
  Clock,
  CheckCircle,
  AlertCircle,
  Users,
  FileText,
  Wrench,
  Building2,
  DoorOpen,
  Bell
} from 'lucide-react';
import { format, subDays, startOfMonth, endOfMonth } from 'date-fns';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import PageHeader from '@/components/common/PageHeader';
import ReportGenerator from '@/components/buildings/ReportGenerator';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

export default function Reports() {
  const { selectedBuildingId, managedBuildings } = useBuildingContext();
  const [dateRange, setDateRange] = useState({
    from: startOfMonth(new Date()),
    to: endOfMonth(new Date())
  });
  const [selectedBuilding, setSelectedBuilding] = useState('all');

  // Fetch all data
  const { data: workOrders = [] } = useQuery({
    queryKey: ['workOrders'],
    queryFn: () => base44.entities.WorkOrder.list()
  });

  const { data: amenityBookings = [] } = useQuery({
    queryKey: ['amenityBookings'],
    queryFn: () => base44.entities.AmenityBooking.list()
  });

  const { data: announcements = [] } = useQuery({
    queryKey: ['announcements'],
    queryFn: () => base44.entities.Announcement.list()
  });

  const { data: residents = [] } = useQuery({
    queryKey: ['residents'],
    queryFn: () => base44.entities.Resident.list()
  });

  const { data: messages = [] } = useQuery({
    queryKey: ['messages'],
    queryFn: () => base44.entities.Message.list()
  });

  const { data: documents = [] } = useQuery({
    queryKey: ['documents'],
    queryFn: () => base44.entities.Document.list()
  });

  const { data: assets = [] } = useQuery({
    queryKey: ['assets'],
    queryFn: () => base44.entities.Asset.list()
  });

  // Filter data by building and date range
  const filteredData = useMemo(() => {
    const buildingFilter = selectedBuilding === 'all' 
      ? (item) => true 
      : (item) => item.building_id === selectedBuilding;

    const dateFilter = (item) => {
      const itemDate = new Date(item.created_date || item.start_date || item.event_date || item.publish_date);
      return itemDate >= dateRange.from && itemDate <= dateRange.to;
    };

    return {
      workOrders: workOrders.filter(wo => buildingFilter(wo) && dateFilter(wo)),
      amenityBookings: amenityBookings.filter(ab => buildingFilter(ab) && dateFilter(ab)),
      announcements: announcements.filter(a => buildingFilter(a) && dateFilter(a)),
      messages: messages.filter(m => buildingFilter(m) && dateFilter(m)),
      residents: residents.filter(r => buildingFilter(r)),
      documents: documents.filter(d => buildingFilter(d)),
      assets: assets.filter(a => buildingFilter(a))
    };
  }, [selectedBuilding, dateRange, workOrders, amenityBookings, announcements, messages, residents, documents, assets]);

  // Calculate metrics
  const metrics = useMemo(() => {
    const { workOrders: wos, amenityBookings: bookings, messages: msgs } = filteredData;

    // Work order metrics
    const openWorkOrders = wos.filter(wo => wo.status === 'open').length;
    const inProgressWorkOrders = wos.filter(wo => wo.status === 'in_progress').length;
    const completedWorkOrders = wos.filter(wo => wo.status === 'completed').length;
    
    // Calculate average resolution time
    const completedWithDates = wos.filter(wo => wo.status === 'completed' && wo.completed_date && wo.created_date);
    const avgResolutionTime = completedWithDates.length > 0
      ? completedWithDates.reduce((acc, wo) => {
          const days = Math.ceil((new Date(wo.completed_date) - new Date(wo.created_date)) / (1000 * 60 * 60 * 24));
          return acc + days;
        }, 0) / completedWithDates.length
      : 0;

    // Amenity bookings
    const totalBookings = bookings.length;
    const moveInBookings = bookings.filter(b => b.purpose?.toLowerCase().includes('move in') || b.amenity_name?.toLowerCase().includes('move in')).length;
    const moveOutBookings = bookings.filter(b => b.purpose?.toLowerCase().includes('move out') || b.amenity_name?.toLowerCase().includes('move out')).length;

    // Incomplete reports
    const incompleteReports = wos.filter(wo => 
      wo.reported_by && wo.status === 'open' && !wo.description
    ).length;

    // Message metrics
    const unreadMessages = msgs.filter(m => m.status === 'unread').length;
    const resolvedMessages = msgs.filter(m => m.status === 'resolved').length;

    // Compliance status
    const overdueAssets = filteredData.assets.filter(a => 
      a.next_service_date && new Date(a.next_service_date) < new Date()
    ).length;

    const dueSoonAssets = filteredData.assets.filter(a => {
      if (!a.next_service_date) return false;
      const daysUntil = Math.ceil((new Date(a.next_service_date) - new Date()) / (1000 * 60 * 60 * 24));
      return daysUntil > 0 && daysUntil <= 30;
    }).length;

    // Work order categories breakdown
    const categoryBreakdown = {};
    wos.forEach(wo => {
      categoryBreakdown[wo.category] = (categoryBreakdown[wo.category] || 0) + 1;
    });

    // Contractor engagement
    const contractorEngagement = {};
    wos.forEach(wo => {
      if (wo.assigned_contractor_id) {
        contractorEngagement[wo.assigned_contractor_id] = (contractorEngagement[wo.assigned_contractor_id] || 0) + 1;
      }
    });

    // Tenant issue profiling
    const tenantIssues = {};
    wos.forEach(wo => {
      if (wo.unit_id && wo.category) {
        if (!tenantIssues[wo.unit_id]) {
          tenantIssues[wo.unit_id] = {};
        }
        tenantIssues[wo.unit_id][wo.category] = (tenantIssues[wo.unit_id][wo.category] || 0) + 1;
      }
    });

    return {
      openWorkOrders,
      inProgressWorkOrders,
      completedWorkOrders,
      avgResolutionTime,
      totalBookings,
      moveInBookings,
      moveOutBookings,
      incompleteReports,
      unreadMessages,
      resolvedMessages,
      overdueAssets,
      dueSoonAssets,
      categoryBreakdown,
      contractorEngagement,
      tenantIssues
    };
  }, [filteredData]);

  // Prepare chart data
  const workOrderStatusData = [
    { name: 'Open', value: metrics.openWorkOrders, color: '#f59e0b' },
    { name: 'In Progress', value: metrics.inProgressWorkOrders, color: '#3b82f6' },
    { name: 'Completed', value: metrics.completedWorkOrders, color: '#10b981' }
  ];

  const categoryData = Object.entries(metrics.categoryBreakdown).map(([category, count]) => ({
    name: category.replace(/_/g, ' '),
    count
  }));

  const bookingsData = [
    { name: 'Move In', value: metrics.moveInBookings },
    { name: 'Move Out', value: metrics.moveOutBookings },
    { name: 'Other', value: metrics.totalBookings - metrics.moveInBookings - metrics.moveOutBookings }
  ];

  const complianceData = [
    { name: 'Compliant', value: filteredData.assets.length - metrics.overdueAssets - metrics.dueSoonAssets },
    { name: 'Due Soon', value: metrics.dueSoonAssets },
    { name: 'Overdue', value: metrics.overdueAssets }
  ];

  // Export functions
  const exportToCSV = () => {
    const csvData = [
      ['Metric', 'Value'],
      ['Open Work Orders', metrics.openWorkOrders],
      ['In Progress Work Orders', metrics.inProgressWorkOrders],
      ['Completed Work Orders', metrics.completedWorkOrders],
      ['Average Resolution Time (days)', metrics.avgResolutionTime.toFixed(1)],
      ['Total Bookings', metrics.totalBookings],
      ['Move In Bookings', metrics.moveInBookings],
      ['Move Out Bookings', metrics.moveOutBookings],
      ['Incomplete Reports', metrics.incompleteReports],
      ['Unread Messages', metrics.unreadMessages],
      ['Overdue Assets', metrics.overdueAssets],
      ['Due Soon Assets', metrics.dueSoonAssets]
    ];

    const csv = csvData.map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `report-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
  };

  return (
    <div className="max-w-7xl mx-auto">
      <PageHeader 
        title="Reporting Dashboard"
        subtitle="Comprehensive insights into your building operations"
      >
        <Button onClick={exportToCSV} variant="outline">
          <Download className="h-4 w-4 mr-2" />
          Export CSV
        </Button>
      </PageHeader>

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <label className="text-sm font-medium mb-2 block">Building</label>
              <Select value={selectedBuilding} onValueChange={setSelectedBuilding}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Buildings</SelectItem>
                  {managedBuildings.map(building => (
                    <SelectItem key={building.id} value={building.id}>
                      {building.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Date Range</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-[280px]">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateRange.from && dateRange.to ? (
                      `${format(dateRange.from, 'MMM d, yyyy')} - ${format(dateRange.to, 'MMM d, yyyy')}`
                    ) : (
                      'Select date range'
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <div className="flex gap-2 p-3 border-b">
                    <Button size="sm" variant="outline" onClick={() => setDateRange({ from: subDays(new Date(), 7), to: new Date() })}>
                      Last 7 days
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setDateRange({ from: subDays(new Date(), 30), to: new Date() })}>
                      Last 30 days
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setDateRange({ from: startOfMonth(new Date()), to: endOfMonth(new Date()) })}>
                      This month
                    </Button>
                  </div>
                  <Calendar
                    mode="range"
                    selected={{ from: dateRange.from, to: dateRange.to }}
                    onSelect={(range) => range?.from && setDateRange({ from: range.from, to: range.to || range.from })}
                    numberOfMonths={2}
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Open Tasks</p>
                <p className="text-2xl font-bold">{metrics.openWorkOrders}</p>
              </div>
              <ClipboardList className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Avg Resolution Time</p>
                <p className="text-2xl font-bold">{metrics.avgResolutionTime.toFixed(1)} days</p>
              </div>
              <Clock className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Completed Tasks</p>
                <p className="text-2xl font-bold">{metrics.completedWorkOrders}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Overdue Assets</p>
                <p className="text-2xl font-bold">{metrics.overdueAssets}</p>
              </div>
              <AlertCircle className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs for different report sections */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="amenities">Amenities</TabsTrigger>
          <TabsTrigger value="contractors">Contractors</TabsTrigger>
          <TabsTrigger value="compliance">Compliance</TabsTrigger>
          <TabsTrigger value="tenant-issues">Tenant Issues</TabsTrigger>
          <TabsTrigger value="communications">Communications</TabsTrigger>
          <TabsTrigger value="manager-report">Manager Report</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Work Order Status</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={workOrderStatusData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={(entry) => `${entry.name}: ${entry.value}`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {workOrderStatusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
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
                    <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="count" fill="#3b82f6" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Incomplete Fault Reports</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <AlertCircle className="h-12 w-12 text-orange-500" />
                <div>
                  <p className="text-3xl font-bold">{metrics.incompleteReports}</p>
                  <p className="text-gray-600">Residents started but did not complete fault reporting</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Amenities Tab */}
        <TabsContent value="amenities" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Amenity Bookings Breakdown</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={bookingsData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={(entry) => `${entry.name}: ${entry.value}`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {bookingsData.map((entry, index) => (
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
                <CardTitle>Booking Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <DoorOpen className="h-6 w-6 text-blue-600" />
                    <span className="font-medium">Move In Bookings</span>
                  </div>
                  <span className="text-2xl font-bold text-blue-600">{metrics.moveInBookings}</span>
                </div>
                <div className="flex items-center justify-between p-4 bg-orange-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <DoorOpen className="h-6 w-6 text-orange-600" />
                    <span className="font-medium">Move Out Bookings</span>
                  </div>
                  <span className="text-2xl font-bold text-orange-600">{metrics.moveOutBookings}</span>
                </div>
                <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Calendar className="h-6 w-6 text-green-600" />
                    <span className="font-medium">Total Bookings</span>
                  </div>
                  <span className="text-2xl font-bold text-green-600">{metrics.totalBookings}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Contractors Tab */}
        <TabsContent value="contractors" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Contractor Engagement</CardTitle>
            </CardHeader>
            <CardContent>
              {Object.keys(metrics.contractorEngagement).length > 0 ? (
                <div className="space-y-3">
                  {Object.entries(metrics.contractorEngagement)
                    .sort(([, a], [, b]) => b - a)
                    .map(([contractorId, count]) => (
                      <div key={contractorId} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <span className="font-medium">Contractor ID: {contractorId}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-gray-600">{count} work orders</span>
                          <Wrench className="h-4 w-4 text-blue-600" />
                        </div>
                      </div>
                    ))}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-8">No contractor engagements in this period</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Compliance Tab */}
        <TabsContent value="compliance" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Compliance Status</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={complianceData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={(entry) => `${entry.name}: ${entry.value}`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      <Cell fill="#10b981" />
                      <Cell fill="#f59e0b" />
                      <Cell fill="#ef4444" />
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Compliance Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <CheckCircle className="h-6 w-6 text-green-600" />
                    <span className="font-medium">Compliant Assets</span>
                  </div>
                  <span className="text-2xl font-bold text-green-600">
                    {filteredData.assets.length - metrics.overdueAssets - metrics.dueSoonAssets}
                  </span>
                </div>
                <div className="flex items-center justify-between p-4 bg-orange-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Clock className="h-6 w-6 text-orange-600" />
                    <span className="font-medium">Due Soon (30 days)</span>
                  </div>
                  <span className="text-2xl font-bold text-orange-600">{metrics.dueSoonAssets}</span>
                </div>
                <div className="flex items-center justify-between p-4 bg-red-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <AlertCircle className="h-6 w-6 text-red-600" />
                    <span className="font-medium">Overdue</span>
                  </div>
                  <span className="text-2xl font-bold text-red-600">{metrics.overdueAssets}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Tenant Issues Tab */}
        <TabsContent value="tenant-issues" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Tenant Issue Profiles</CardTitle>
            </CardHeader>
            <CardContent>
              {Object.keys(metrics.tenantIssues).length > 0 ? (
                <div className="space-y-4">
                  {Object.entries(metrics.tenantIssues)
                    .sort(([, a], [, b]) => Object.values(b).reduce((sum, val) => sum + val, 0) - Object.values(a).reduce((sum, val) => sum + val, 0))
                    .slice(0, 10)
                    .map(([unitId, issues]) => {
                      const totalIssues = Object.values(issues).reduce((sum, val) => sum + val, 0);
                      return (
                        <div key={unitId} className="p-4 border rounded-lg">
                          <div className="flex items-center justify-between mb-3">
                            <span className="font-semibold">Unit ID: {unitId}</span>
                            <span className="text-sm text-gray-600">{totalIssues} total issues</span>
                          </div>
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                            {Object.entries(issues).map(([category, count]) => (
                              <div key={category} className="flex items-center justify-between bg-gray-50 px-3 py-2 rounded text-sm">
                                <span className="text-gray-700">{category.replace(/_/g, ' ')}</span>
                                <span className="font-medium">{count}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-8">No tenant issue data available</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Communications Tab */}
        <TabsContent value="communications" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Announcements Sent</p>
                    <p className="text-3xl font-bold">{filteredData.announcements.length}</p>
                  </div>
                  <Bell className="h-10 w-10 text-blue-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Unread Messages</p>
                    <p className="text-3xl font-bold">{metrics.unreadMessages}</p>
                  </div>
                  <FileText className="h-10 w-10 text-orange-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Resolved Messages</p>
                    <p className="text-3xl font-bold">{metrics.resolvedMessages}</p>
                  </div>
                  <CheckCircle className="h-10 w-10 text-green-500" />
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Message Categories</CardTitle>
            </CardHeader>
            <CardContent>
              {filteredData.messages.length > 0 ? (
                <div className="space-y-2">
                  {Object.entries(
                    filteredData.messages.reduce((acc, msg) => {
                      acc[msg.category || 'other'] = (acc[msg.category || 'other'] || 0) + 1;
                      return acc;
                    }, {})
                  )
                    .sort(([, a], [, b]) => b - a)
                    .map(([category, count]) => (
                      <div key={category} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <span className="font-medium capitalize">{category.replace(/_/g, ' ')}</span>
                        <span className="text-gray-600">{count} messages</span>
                      </div>
                    ))}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-8">No messages in this period</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Manager Report Tab */}
        <TabsContent value="manager-report" className="space-y-4">
          <Card className="border-2 border-blue-100">
            {selectedBuilding !== 'all' ? (
              <ReportGenerator 
                buildingId={selectedBuilding} 
                buildingName={managedBuildings.find(b => b.id === selectedBuilding)?.name} 
              />
            ) : (
              <CardContent className="pt-6">
                <p className="text-gray-500 text-center py-8">
                  Please select a specific building to generate the manager report.
                </p>
              </CardContent>
            )}
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}