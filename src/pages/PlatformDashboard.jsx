import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';
import PageHeader from '@/components/common/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Building2, 
  Users, 
  TrendingUp, 
  Activity,
  ArrowRight,
  Building,
  MapPin
} from 'lucide-react';
import { Skeleton } from "@/components/ui/skeleton";

export default function PlatformDashboard() {
  const [user, setUser] = useState(null);

  React.useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const { data: buildings = [], isLoading: loadingBuildings } = useQuery({
    queryKey: ['buildings'],
    queryFn: () => base44.entities.Building.list(),
  });

  const { data: partners = [], isLoading: loadingPartners } = useQuery({
    queryKey: ['partners'],
    queryFn: () => base44.entities.Partner.list(),
  });

  const { data: allUsers = [], isLoading: loadingUsers } = useQuery({
    queryKey: ['all-users'],
    queryFn: () => base44.entities.User.list(),
  });

  const { data: workOrders = [], isLoading: loadingWorkOrders } = useQuery({
    queryKey: ['all-work-orders'],
    queryFn: () => base44.entities.WorkOrder.list('-created_date', 100),
  });

  // Only show for admins
  if (user && user.role !== 'admin') {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Building2 className="h-16 w-16 text-slate-300 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-slate-900 mb-2">Access Restricted</h2>
          <p className="text-slate-500">This page is only accessible to Vivid BMS administrators.</p>
        </div>
      </div>
    );
  }

  const isLoading = loadingBuildings || loadingPartners || loadingUsers || loadingWorkOrders;

  // Calculate metrics
  const totalBuildings = buildings.length;
  const totalPartners = partners.length;
  const totalLots = buildings.reduce((sum, b) => sum + (b.strata_lots || 0), 0);
  
  // Recent buildings (last 30 days)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const recentBuildings = buildings.filter(b => 
    new Date(b.created_date) > thirtyDaysAgo
  ).length;

  // Partner stats
  const partnerStats = partners.map(partner => {
    const partnerBuildings = buildings.filter(b => b.partner_id === partner.id);
    const partnerLots = partnerBuildings.reduce((sum, b) => sum + (b.strata_lots || 0), 0);
    return {
      ...partner,
      buildingCount: partnerBuildings.length,
      lotCount: partnerLots,
      monthlyRevenue: partnerLots * 2.25
    };
  }).sort((a, b) => b.buildingCount - a.buildingCount);

  // Recent activity
  const recentActivity = buildings
    .sort((a, b) => new Date(b.created_date) - new Date(a.created_date))
    .slice(0, 5);

  // Vivid BMS staff (users without partner_id or with admin role)
  const vividStaff = allUsers.filter(u => !u.partner_id || u.role === 'admin');

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Vivid BMS Platform Dashboard"
        subtitle="Monitor and manage your building management platform"
      />

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map(i => (
            <Card key={i}>
              <CardHeader className="pb-3">
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16 mb-2" />
                <Skeleton className="h-3 w-32" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <>
          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="keyvision-card">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-slate-500">Total Buildings</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-baseline justify-between">
                  <p className="text-3xl font-bold text-slate-900">{totalBuildings}</p>
                  <Building2 className="h-8 w-8 text-blue-600" />
                </div>
                <p className="text-xs text-slate-500 mt-2">
                  {recentBuildings} added this month
                </p>
              </CardContent>
            </Card>

            <Card className="keyvision-card">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-slate-500">Total Partners</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-baseline justify-between">
                  <p className="text-3xl font-bold text-slate-900">{totalPartners}</p>
                  <Users className="h-8 w-8 text-indigo-600" />
                </div>
                <p className="text-xs text-slate-500 mt-2">
                  Building management companies
                </p>
              </CardContent>
            </Card>

            <Card className="keyvision-card">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-slate-500">Total Lots</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-baseline justify-between">
                  <p className="text-3xl font-bold text-slate-900">{totalLots.toLocaleString()}</p>
                  <MapPin className="h-8 w-8 text-emerald-600" />
                </div>
                <p className="text-xs text-slate-500 mt-2">
                  Across all buildings
                </p>
              </CardContent>
            </Card>

            <Card className="keyvision-card">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-slate-500">Monthly Revenue</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-baseline justify-between">
                  <p className="text-3xl font-bold text-slate-900">
                    ${(totalLots * 2.25).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                  <TrendingUp className="h-8 w-8 text-green-600" />
                </div>
                <p className="text-xs text-slate-500 mt-2">
                  @ $2.25 per lot/month
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Link to={createPageUrl('PartnerManagement')}>
              <Card className="keyvision-card cursor-pointer">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-slate-900">Manage Partners</h3>
                      <p className="text-sm text-slate-500 mt-1">Configure building management companies</p>
                    </div>
                    <ArrowRight className="h-5 w-5 text-blue-600" />
                  </div>
                </CardContent>
              </Card>
            </Link>

            <Link to={createPageUrl('VividStaffManagement')}>
              <Card className="keyvision-card cursor-pointer">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-slate-900">Vivid BMS Staff</h3>
                      <p className="text-sm text-slate-500 mt-1">Manage your organization's team</p>
                    </div>
                    <ArrowRight className="h-5 w-5 text-blue-600" />
                  </div>
                </CardContent>
              </Card>
            </Link>

            <Link to={createPageUrl('Buildings')}>
              <Card className="keyvision-card cursor-pointer">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-slate-900">All Buildings</h3>
                      <p className="text-sm text-slate-500 mt-1">View and manage properties</p>
                    </div>
                    <ArrowRight className="h-5 w-5 text-blue-600" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Partner Performance */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-blue-600" />
                  Partner Performance
                </CardTitle>
              </CardHeader>
              <CardContent>
                {partnerStats.length === 0 ? (
                  <p className="text-sm text-slate-500 text-center py-8">No partners yet</p>
                ) : (
                  <div className="space-y-3">
                    {partnerStats.map(partner => (
                      <Link 
                        key={partner.id} 
                        to={createPageUrl('PartnerManagement')}
                        className="block"
                      >
                        <div className="flex items-center justify-between p-3 rounded-lg hover:bg-slate-50 transition-colors">
                          <div className="flex-1">
                            <p className="font-medium text-slate-900">{partner.name}</p>
                            <p className="text-sm text-slate-500">
                              {partner.buildingCount} buildings • {partner.lotCount} lots
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-semibold text-green-600">
                              ${partner.monthlyRevenue.toFixed(2)}/mo
                            </p>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Recent Activity */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5 text-blue-600" />
                  Recent Buildings
                </CardTitle>
              </CardHeader>
              <CardContent>
                {recentActivity.length === 0 ? (
                  <p className="text-sm text-slate-500 text-center py-8">No buildings yet</p>
                ) : (
                  <div className="space-y-3">
                    {recentActivity.map(building => {
                      const partner = partners.find(p => p.id === building.partner_id);
                      return (
                        <Link
                          key={building.id}
                          to={createPageUrl('BuildingProfile') + '?buildingId=' + building.id}
                          className="block"
                        >
                          <div className="flex items-start gap-3 p-3 rounded-lg hover:bg-slate-50 transition-colors">
                            <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                              <Building className="h-5 w-5 text-blue-600" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-slate-900 truncate">{building.name}</p>
                              <p className="text-sm text-slate-500">
                                {partner ? partner.name : 'No partner'} • {building.strata_lots || 0} lots
                              </p>
                              <p className="text-xs text-slate-400 mt-1">
                                Added {new Date(building.created_date).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Vivid Staff Summary */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-blue-600" />
                  Vivid BMS Team ({vividStaff.length})
                </CardTitle>
                <Link to={createPageUrl('VividStaffManagement')}>
                  <Button variant="outline" size="sm">
                    Manage Team
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {vividStaff.slice(0, 6).map(staff => (
                  <div key={staff.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center text-white font-medium">
                      {staff.full_name?.charAt(0) || 'U'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-slate-900 truncate text-sm">{staff.full_name}</p>
                      <p className="text-xs text-slate-500 truncate capitalize">{staff.role}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}