import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import CalendarWidget from '@/components/dashboard/CalendarWidget';
import CasesChart from '@/components/dashboard/CasesChart';
import { 
  Building2, 
  Users, 
  Wrench, 
  AlertCircle,
  FileText,
  HardHat,
  Phone,
  Plus,
  Eye,
  Activity
} from 'lucide-react';
import { format } from 'date-fns';

export default function Dashboard() {
  const [selectedBuilding, setSelectedBuilding] = useState('all');

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

  const { data: contractors = [] } = useQuery({
    queryKey: ['contractors'],
    queryFn: () => base44.entities.Contractor.list(),
  });

  const { data: notes = [] } = useQuery({
    queryKey: ['notes'],
    queryFn: () => base44.entities.Note.list('-created_date', 10),
  });

  const { data: numbers = [] } = useQuery({
    queryKey: ['numbers'],
    queryFn: () => base44.entities.ImportantNumber.list(),
  });

  const { data: documents = [] } = useQuery({
    queryKey: ['documents'],
    queryFn: () => base44.entities.Document.list(),
  });

  const isLoading = loadingBuildings || loadingUnits || loadingResidents || loadingWorkOrders;

  const activeCases = workOrders.filter(wo => wo.status !== 'completed' && wo.status !== 'cancelled').length;

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
    <div className="space-y-6">
      {/* Building Selector */}
      <div className="flex items-center justify-between">
        <Select value={selectedBuilding} onValueChange={setSelectedBuilding}>
          <SelectTrigger className="w-[300px]">
            <Building2 className="h-4 w-4 mr-2" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Buildings</SelectItem>
            {buildings.map(b => (
              <SelectItem key={b.id} value={b.id}>
                {b.name} - {b.address}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column */}
        <div className="space-y-6">
          <CalendarWidget />
          <CasesChart workOrders={workOrders} />
        </div>

        {/* Middle Column */}
        <div className="space-y-6">
          {/* Items Requiring Action */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">Items Requiring Action</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {documents.filter(d => d.expiry_date && new Date(d.expiry_date) < new Date()).length > 0 && (
                <div className="flex items-center justify-between p-2 rounded hover:bg-slate-50">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-red-500" />
                    <span className="text-sm text-slate-700">Expired Documents</span>
                  </div>
                  <Badge variant="destructive" className="text-xs">
                    {documents.filter(d => d.expiry_date && new Date(d.expiry_date) < new Date()).length}
                  </Badge>
                </div>
              )}
              {workOrders.filter(wo => wo.status === 'open' && wo.priority === 'urgent').length > 0 && (
                <div className="flex items-center justify-between p-2 rounded hover:bg-slate-50">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-red-500" />
                    <span className="text-sm text-slate-700">Urgent Work Orders</span>
                  </div>
                  <Badge variant="destructive" className="text-xs">
                    {workOrders.filter(wo => wo.status === 'open' && wo.priority === 'urgent').length}
                  </Badge>
                </div>
              )}
              {workOrders.filter(wo => wo.status === 'open').length === 0 && documents.filter(d => d.expiry_date && new Date(d.expiry_date) < new Date()).length === 0 && (
                <p className="text-sm text-slate-500 py-4 text-center">No items requiring action</p>
              )}
            </CardContent>
          </Card>

          {/* Building Summary */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">Building Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-slate-600">
                  <Building2 className="h-4 w-4" />
                  <span className="text-sm">Assets</span>
                </div>
                <span className="font-semibold text-slate-900">{units.length}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-slate-600">
                  <Users className="h-4 w-4" />
                  <span className="text-sm">Residents</span>
                </div>
                <span className="font-semibold text-slate-900">{residents.length}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-slate-600">
                  <Wrench className="h-4 w-4" />
                  <span className="text-sm">Work Orders Sent</span>
                </div>
                <span className="font-semibold text-slate-900">{workOrders.length}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-slate-600">
                  <HardHat className="h-4 w-4" />
                  <span className="text-sm">Contractors</span>
                </div>
                <span className="font-semibold text-slate-900">{contractors.length}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-slate-600">
                  <AlertCircle className="h-4 w-4" />
                  <span className="text-sm">Active Cases</span>
                </div>
                <span className="font-semibold text-slate-900">{activeCases}</span>
              </div>
            </CardContent>
          </Card>

          {/* Notes */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-base font-semibold">Notes</CardTitle>
              <Button variant="ghost" size="icon" className="h-7 w-7">
                <Plus className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              {notes.slice(0, 3).map((note) => (
                <div key={note.id} className="border-b border-slate-100 pb-2 last:border-0">
                  <p className="text-sm font-medium text-slate-900">{note.title}</p>
                  <p className="text-xs text-slate-500 mt-1">{note.created_date && format(new Date(note.created_date), 'dd/MM/yyyy')}</p>
                  <p className="text-xs text-slate-600 mt-1 line-clamp-2">{note.content}</p>
                </div>
              ))}
              {notes.length === 0 && (
                <p className="text-sm text-slate-500 py-4 text-center">No notes</p>
              )}
            </CardContent>
          </Card>

          {/* Numbers */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">Numbers</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {numbers.slice(0, 4).map((number) => (
                <div key={number.id} className="flex items-center justify-between text-sm">
                  <span className="text-slate-700">{number.name}</span>
                  <div className="flex items-center gap-1 text-slate-600">
                    <Phone className="h-3 w-3" />
                    <span>{number.phone_number}</span>
                  </div>
                </div>
              ))}
              {numbers.length === 0 && (
                <p className="text-sm text-slate-500 py-4 text-center">No numbers</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Activity & Latest Work Orders */}
        <div className="space-y-6">
          {/* Latest Work Order Sent */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-base font-semibold">Latest Work Order Sent</CardTitle>
              <Button variant="ghost" size="sm" className="h-7 text-xs" asChild>
                <Link to={createPageUrl('WorkOrders')}>
                  <Eye className="h-3 w-3 mr-1" /> View
                </Link>
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              {workOrders.slice(0, 5).map((order) => (
                <div key={order.id} className="pb-3 border-b border-slate-100 last:border-0">
                  <p className="text-sm font-medium text-slate-900 line-clamp-1">{order.title}</p>
                  <p className="text-xs text-slate-500 mt-1">
                    Sent {order.created_date && format(new Date(order.created_date), 'dd/MM/yyyy')}
                  </p>
                  <Button variant="ghost" size="sm" className="h-6 px-2 mt-2 text-xs text-blue-600" asChild>
                    <Link to={createPageUrl('WorkOrders')}>View</Link>
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Activity */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">Activity</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {workOrders.slice(0, 6).map((order) => (
                <div key={order.id} className="text-xs">
                  <p className="text-slate-900 font-medium">
                    {format(new Date(order.created_date), 'dd/MM/yyyy')}
                  </p>
                  <p className="text-slate-600 mt-0.5">
                    <span className="font-medium">{format(new Date(order.created_date), 'HH:mm')}</span> - {order.title}
                  </p>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}