import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Package, DollarSign, FileText, Wrench, Bell, Calendar, Plus } from 'lucide-react';
import { format } from 'date-fns';
import ParcelManagement from '@/components/residents/ParcelManagement';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export default function ResidentSelfService() {
  const [user, setUser] = useState(null);

  React.useEffect(() => {
    base44.auth.me().then(setUser);
  }, []);

  const { data: residents = [] } = useQuery({
    queryKey: ['residents'],
    queryFn: () => base44.entities.Resident.list()
  });

  const { data: levies = [] } = useQuery({
    queryKey: ['levies'],
    queryFn: () => base44.entities.LevyPayment.list()
  });

  const { data: workOrders = [] } = useQuery({
    queryKey: ['workOrders'],
    queryFn: () => base44.entities.WorkOrder.list()
  });

  const { data: announcements = [] } = useQuery({
    queryKey: ['announcements'],
    queryFn: () => base44.entities.Announcement.list('-created_date')
  });

  const resident = residents.find(r => r.email === user?.email);
  const myLevies = levies.filter(l => l.resident_id === resident?.id || l.unit_id === resident?.unit_id);
  const myWorkOrders = workOrders.filter(w => w.reported_by === user?.email);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">My Resident Portal</h1>
        <p className="text-slate-600">Access your account, payments, and services</p>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="payments">Payments</TabsTrigger>
          <TabsTrigger value="parcels">Parcels</TabsTrigger>
          <TabsTrigger value="requests">My Requests</TabsTrigger>
        </TabsList>

        <TabsContent value="report-issue" className="space-y-6">
          <IssueReportingForm
            buildingId={resident?.building_id}
            unitId={resident?.unit_id}
            residentName={user?.full_name}
            onSuccess={() => setActiveTab('overview')}
          />
        </TabsContent>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  Outstanding Levies
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-orange-600">
                  ${myLevies.filter(l => l.status !== 'paid').reduce((sum, l) => sum + l.amount, 0).toFixed(2)}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <Wrench className="h-4 w-4" />
                  Active Requests
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">
                  {myWorkOrders.filter(w => w.status !== 'completed').length}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <Bell className="h-4 w-4" />
                  New Announcements
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">
                  {announcements.filter(a => a.status === 'published').length}
                </p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Recent Announcements</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {announcements.slice(0, 5).map((announcement) => (
                <div key={announcement.id} className="p-3 border rounded-lg">
                  <h4 className="font-semibold">{announcement.title}</h4>
                  <p className="text-sm text-slate-600 mt-1 line-clamp-2">{announcement.content}</p>
                  <p className="text-xs text-slate-500 mt-2">{format(new Date(announcement.created_date), 'MMM d, yyyy')}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payments">
          <Card>
            <CardHeader>
              <CardTitle>My Levy Payments</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {myLevies.map((levy) => (
                  <div key={levy.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <p className="font-semibold">{levy.period}</p>
                      <p className="text-sm text-slate-600">Due: {format(new Date(levy.due_date), 'MMM d, yyyy')}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xl font-bold">${levy.amount.toFixed(2)}</p>
                      <p className="text-xs text-slate-500">{levy.status}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="parcels">
          <ParcelManagement />
        </TabsContent>

        <TabsContent value="requests">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>My Service Requests</CardTitle>
                <Link to={createPageUrl('ResidentPortal')}>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    New Request
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {myWorkOrders.map((wo) => (
                  <div key={wo.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex-1">
                      <p className="font-semibold">{wo.title}</p>
                      <p className="text-sm text-slate-600 mt-1">{wo.description}</p>
                      <p className="text-xs text-slate-500 mt-2">{format(new Date(wo.created_date), 'MMM d, yyyy')}</p>
                    </div>
                    <div className="text-right">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                        wo.status === 'completed' ? 'bg-green-100 text-green-700' :
                        wo.status === 'in_progress' ? 'bg-blue-100 text-blue-700' :
                        'bg-orange-100 text-orange-700'
                      }`}>
                        {wo.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}