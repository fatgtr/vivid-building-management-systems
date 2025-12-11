import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import StatsCard from '@/components/dashboard/StatsCard';
import StatusBadge from '@/components/common/StatusBadge';
import { 
  Building2, 
  Users, 
  Wrench, 
  Calendar,
  AlertCircle,
  Clock,
  CheckCircle2,
  ArrowRight,
  Home,
  Bell,
  TrendingUp
} from 'lucide-react';
import { format } from 'date-fns';

export default function Dashboard() {
  const { data: buildings = [], isLoading: loadingBuildings } = useQuery({
    queryKey: ['buildings'],
    queryFn: () => base44.entities.Building.list(),
  });

  const { data: units = [], isLoading: loadingUnits } = useQuery({
    queryKey: ['units'],
    queryFn: () => base44.entities.Unit.list(),
  });

  const { data: residents = [], isLoading: loadingResidents } = useQuery({
    queryKey: ['residents'],
    queryFn: () => base44.entities.Resident.list(),
  });

  const { data: workOrders = [], isLoading: loadingWorkOrders } = useQuery({
    queryKey: ['workOrders'],
    queryFn: () => base44.entities.WorkOrder.list('-created_date', 50),
  });

  const { data: announcements = [] } = useQuery({
    queryKey: ['announcements'],
    queryFn: () => base44.entities.Announcement.filter({ status: 'published' }, '-created_date', 5),
  });

  const { data: bookings = [] } = useQuery({
    queryKey: ['bookings'],
    queryFn: () => base44.entities.AmenityBooking.filter({ status: 'pending' }, '-created_date', 5),
  });

  const isLoading = loadingBuildings || loadingUnits || loadingResidents || loadingWorkOrders;

  const openWorkOrders = workOrders.filter(wo => wo.status === 'open').length;
  const inProgressWorkOrders = workOrders.filter(wo => wo.status === 'in_progress').length;
  const urgentWorkOrders = workOrders.filter(wo => wo.priority === 'urgent' && wo.status !== 'completed').length;
  const occupiedUnits = units.filter(u => u.status === 'occupied').length;
  const occupancyRate = units.length > 0 ? Math.round((occupiedUnits / units.length) * 100) : 0;

  if (isLoading) {
    return (
      <div className="space-y-8">
        <div>
          <Skeleton className="h-10 w-64 mb-2" />
          <Skeleton className="h-5 w-96" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl lg:text-3xl font-bold text-slate-900 tracking-tight">Dashboard</h1>
        <p className="text-slate-500 mt-1">Welcome back! Here's your property overview.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatsCard
          title="Total Buildings"
          value={buildings.length}
          subtitle={`${units.length} total units`}
          icon={Building2}
          color="blue"
        />
        <StatsCard
          title="Occupancy Rate"
          value={`${occupancyRate}%`}
          subtitle={`${occupiedUnits} of ${units.length} units`}
          icon={Home}
          color="green"
          trend={occupancyRate > 90 ? "High occupancy" : null}
          trendUp={occupancyRate > 90}
        />
        <StatsCard
          title="Active Residents"
          value={residents.filter(r => r.status === 'active').length}
          subtitle={`${residents.length} total`}
          icon={Users}
          color="purple"
        />
        <StatsCard
          title="Open Work Orders"
          value={openWorkOrders}
          subtitle={`${urgentWorkOrders} urgent`}
          icon={Wrench}
          color={urgentWorkOrders > 0 ? "red" : "orange"}
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Work Orders */}
        <Card className="lg:col-span-2 border-0 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-lg font-semibold">Recent Work Orders</CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link to={createPageUrl('WorkOrders')} className="text-blue-600 hover:text-blue-700">
                View all <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {workOrders.length === 0 ? (
              <div className="text-center py-8 text-slate-500">
                <Wrench className="h-12 w-12 mx-auto mb-3 text-slate-300" />
                <p>No work orders yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {workOrders.slice(0, 5).map((order) => (
                  <div 
                    key={order.id} 
                    className="flex items-center gap-4 p-3 rounded-lg hover:bg-slate-50 transition-colors"
                  >
                    <div className={`p-2 rounded-lg ${
                      order.priority === 'urgent' ? 'bg-red-100' :
                      order.priority === 'high' ? 'bg-orange-100' :
                      'bg-slate-100'
                    }`}>
                      {order.status === 'completed' ? (
                        <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                      ) : order.priority === 'urgent' ? (
                        <AlertCircle className="h-5 w-5 text-red-600" />
                      ) : (
                        <Wrench className="h-5 w-5 text-slate-600" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-slate-900 truncate">{order.title}</p>
                      <p className="text-sm text-slate-500 capitalize">{order.category?.replace(/_/g, ' ')}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <StatusBadge status={order.status} />
                      {order.priority === 'urgent' && (
                        <span className="text-xs font-medium text-red-600 bg-red-50 px-2 py-1 rounded-full">
                          Urgent
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions & Announcements */}
        <div className="space-y-6">
          {/* Quick Stats */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg font-semibold">Quick Stats</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <Clock className="h-5 w-5 text-blue-600" />
                  <span className="text-sm font-medium text-slate-700">In Progress</span>
                </div>
                <span className="text-lg font-bold text-blue-600">{inProgressWorkOrders}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <Calendar className="h-5 w-5 text-yellow-600" />
                  <span className="text-sm font-medium text-slate-700">Pending Bookings</span>
                </div>
                <span className="text-lg font-bold text-yellow-600">{bookings.length}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-emerald-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <TrendingUp className="h-5 w-5 text-emerald-600" />
                  <span className="text-sm font-medium text-slate-700">This Month</span>
                </div>
                <span className="text-lg font-bold text-emerald-600">
                  {workOrders.filter(wo => wo.status === 'completed').length} completed
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Recent Announcements */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-lg font-semibold">Announcements</CardTitle>
              <Button variant="ghost" size="sm" asChild>
                <Link to={createPageUrl('Announcements')} className="text-blue-600 hover:text-blue-700">
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </CardHeader>
            <CardContent>
              {announcements.length === 0 ? (
                <div className="text-center py-6 text-slate-500">
                  <Bell className="h-10 w-10 mx-auto mb-2 text-slate-300" />
                  <p className="text-sm">No announcements</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {announcements.slice(0, 3).map((announcement) => (
                    <div key={announcement.id} className="p-3 bg-slate-50 rounded-lg">
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-medium text-sm text-slate-900 line-clamp-1">{announcement.title}</p>
                        <StatusBadge status={announcement.type} />
                      </div>
                      <p className="text-xs text-slate-500 mt-1">
                        {announcement.created_date && format(new Date(announcement.created_date), 'MMM d, yyyy')}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}