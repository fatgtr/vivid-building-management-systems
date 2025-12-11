import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { useBuildingContext } from '@/components/BuildingContext';
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
  const { selectedBuildingId } = useBuildingContext();

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

  const { data: maintenanceSchedules = [] } = useQuery({
    queryKey: ['maintenanceSchedules'],
    queryFn: () => base44.entities.MaintenanceSchedule.list(),
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

  // Filter data by selected building
  const filteredUnits = selectedBuildingId ? units.filter(u => u.building_id === selectedBuildingId) : units;
  const filteredResidents = selectedBuildingId ? residents.filter(r => r.building_id === selectedBuildingId) : residents;
  const filteredWorkOrders = selectedBuildingId ? workOrders.filter(wo => wo.building_id === selectedBuildingId) : workOrders;
  const filteredNotes = selectedBuildingId ? notes.filter(n => n.building_id === selectedBuildingId) : notes;
  const filteredNumbers = selectedBuildingId ? numbers.filter(n => n.building_id === selectedBuildingId) : numbers;
  const filteredDocuments = selectedBuildingId ? documents.filter(d => d.building_id === selectedBuildingId) : documents;
  const filteredMaintenanceSchedules = selectedBuildingId ? maintenanceSchedules.filter(m => m.building_id === selectedBuildingId) : maintenanceSchedules;

  const filteredActiveCases = filteredWorkOrders.filter(wo => wo.status !== 'completed' && wo.status !== 'cancelled').length;

  return (
    <div className="space-y-6">
      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column */}
        <div className="space-y-6">
          <CalendarWidget workOrders={filteredWorkOrders} maintenanceSchedules={filteredMaintenanceSchedules} residents={filteredResidents} />
          <CasesChart workOrders={filteredWorkOrders} />
        </div>

        {/* Middle Column */}
        <div className="space-y-6">
          {/* Items Requiring Action */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">Items Requiring Action</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {filteredDocuments.filter(d => d.expiry_date && new Date(d.expiry_date) < new Date()).length > 0 && (
                <div className="flex items-center justify-between p-2 rounded hover:bg-slate-50">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-red-500" />
                    <span className="text-sm text-slate-700">Expired Documents</span>
                  </div>
                  <Badge variant="destructive" className="text-xs">
                    {filteredDocuments.filter(d => d.expiry_date && new Date(d.expiry_date) < new Date()).length}
                  </Badge>
                </div>
              )}
              {filteredWorkOrders.filter(wo => wo.status === 'open' && wo.priority === 'urgent').length > 0 && (
                <div className="flex items-center justify-between p-2 rounded hover:bg-slate-50">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-red-500" />
                    <span className="text-sm text-slate-700">Urgent Work Orders</span>
                  </div>
                  <Badge variant="destructive" className="text-xs">
                    {filteredWorkOrders.filter(wo => wo.status === 'open' && wo.priority === 'urgent').length}
                  </Badge>
                </div>
              )}
              {filteredWorkOrders.filter(wo => wo.status === 'open').length === 0 && filteredDocuments.filter(d => d.expiry_date && new Date(d.expiry_date) < new Date()).length === 0 && (
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
                <span className="font-semibold text-slate-900">{filteredUnits.length}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-slate-600">
                  <Users className="h-4 w-4" />
                  <span className="text-sm">Residents</span>
                </div>
                <span className="font-semibold text-slate-900">{filteredResidents.length}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-slate-600">
                  <Wrench className="h-4 w-4" />
                  <span className="text-sm">Work Orders Sent</span>
                </div>
                <span className="font-semibold text-slate-900">{filteredWorkOrders.length}</span>
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
                <span className="font-semibold text-slate-900">{filteredActiveCases}</span>
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
              {filteredNotes.slice(0, 3).map((note) => (
                <div key={note.id} className="border-b border-slate-100 pb-2 last:border-0">
                  <p className="text-sm font-medium text-slate-900">{note.title}</p>
                  <p className="text-xs text-slate-500 mt-1">{note.created_date && format(new Date(note.created_date), 'dd/MM/yyyy')}</p>
                  <p className="text-xs text-slate-600 mt-1 line-clamp-2">{note.content}</p>
                </div>
              ))}
              {filteredNotes.length === 0 && (
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
              {filteredNumbers.slice(0, 4).map((number) => (
                <div key={number.id} className="flex items-center justify-between text-sm">
                  <span className="text-slate-700">{number.name}</span>
                  <div className="flex items-center gap-1 text-slate-600">
                    <Phone className="h-3 w-3" />
                    <span>{number.phone_number}</span>
                  </div>
                </div>
              ))}
              {filteredNumbers.length === 0 && (
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
              {filteredWorkOrders.slice(0, 5).map((order) => (
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
              {filteredWorkOrders.slice(0, 6).map((order) => (
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