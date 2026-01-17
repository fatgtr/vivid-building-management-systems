import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { useBuildingContext } from '@/components/BuildingContext';
import PartnerDashboard from './PartnerDashboard';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import CalendarWidget from '@/components/dashboard/CalendarWidget';
import CasesChart from '@/components/dashboard/CasesChart';
import QueryNotesWidget from '@/components/dashboard/QueryNotesWidget';
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
  Activity,
  TrendingUp,
  Clock,
  Shield,
  CheckCircle2 as CheckCircle
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

export default function Dashboard() {
  const { selectedBuildingId, user } = useBuildingContext();
  
  // Show partner dashboard if user has partner_id
  if (user?.partner_id) {
    return <PartnerDashboard />;
  }
  
  const queryClient = useQueryClient();
  const [showNoteDialog, setShowNoteDialog] = useState(false);
  const [showNumberDialog, setShowNumberDialog] = useState(false);
  const [noteForm, setNoteForm] = useState({ title: '', content: '', category: 'general' });
  const [numberForm, setNumberForm] = useState({ name: '', phone_number: '', category: 'other' });

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

  const { data: assets = [] } = useQuery({
    queryKey: ['assets'],
    queryFn: () => base44.entities.Asset.list(),
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

  const { data: complianceRecords = [] } = useQuery({
    queryKey: ['complianceRecords'],
    queryFn: () => base44.entities.ComplianceRecord.list(),
  });

  const isLoading = loadingBuildings || loadingUnits || loadingResidents || loadingWorkOrders;

  const activeCases = workOrders.filter(wo => wo.status !== 'completed' && wo.status !== 'cancelled').length;

  const createNoteMutation = useMutation({
    mutationFn: (data) => base44.entities.Note.create({ ...data, building_id: selectedBuildingId || null }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notes'] });
      toast.success('Note created successfully');
      setShowNoteDialog(false);
      setNoteForm({ title: '', content: '', category: 'general' });
    },
  });

  const createNumberMutation = useMutation({
    mutationFn: (data) => base44.entities.ImportantNumber.create({ ...data, building_id: selectedBuildingId || null }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['numbers'] });
      toast.success('Number added successfully');
      setShowNumberDialog(false);
      setNumberForm({ name: '', phone_number: '', category: 'other' });
    },
  });

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
  const filteredAssets = selectedBuildingId ? assets.filter(a => a.building_id === selectedBuildingId) : assets;
  const filteredUnits = selectedBuildingId ? units.filter(u => u.building_id === selectedBuildingId) : units;
  const filteredResidents = selectedBuildingId ? residents.filter(r => r.building_id === selectedBuildingId) : residents;
  const filteredWorkOrders = selectedBuildingId ? workOrders.filter(wo => wo.building_id === selectedBuildingId) : workOrders;
  const filteredNotes = selectedBuildingId ? notes.filter(n => n.building_id === selectedBuildingId) : notes;
  const filteredNumbers = selectedBuildingId ? numbers.filter(n => n.building_id === selectedBuildingId) : numbers;
  const filteredDocuments = selectedBuildingId ? documents.filter(d => d.building_id === selectedBuildingId) : documents;
  const filteredMaintenanceSchedules = selectedBuildingId ? maintenanceSchedules.filter(m => m.building_id === selectedBuildingId) : maintenanceSchedules;
  const filteredComplianceRecords = selectedBuildingId ? complianceRecords.filter(c => c.building_id === selectedBuildingId) : complianceRecords;

  const filteredActiveCases = filteredWorkOrders.filter(wo => wo.status !== 'completed' && wo.status !== 'cancelled').length;

  // Compliance metrics
  const overdueCompliance = filteredComplianceRecords.filter(c => {
    if (c.expiry_date) {
      const daysUntilExpiry = differenceInDays(new Date(c.expiry_date), new Date());
      return daysUntilExpiry < 0;
    }
    if (c.next_due_date) {
      return isPast(new Date(c.next_due_date));
    }
    return false;
  }).length;

  const expiringSoon = filteredComplianceRecords.filter(c => {
    if (c.expiry_date) {
      const daysUntilExpiry = differenceInDays(new Date(c.expiry_date), new Date());
      return daysUntilExpiry >= 0 && daysUntilExpiry <= 30;
    }
    if (c.next_due_date) {
      const daysUntilDue = differenceInDays(new Date(c.next_due_date), new Date());
      return daysUntilDue >= 0 && daysUntilDue <= 30;
    }
    return false;
  }).length;

  const compliantItems = filteredComplianceRecords.filter(c => c.status === 'compliant' || c.status === 'passed').length;

  return (
    <div className="space-y-6">
      {/* Top Section - Calendar */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <CalendarWidget workOrders={filteredWorkOrders} maintenanceSchedules={filteredMaintenanceSchedules} residents={filteredResidents} />
        </div>
        <div>
          <CasesChart workOrders={filteredWorkOrders} />
        </div>
      </div>

      {/* Abandoned Queries Alert */}
      <QueryNotesWidget buildingId={selectedBuildingId} />

      {/* Compliance Overview - Full Width */}
      <Card className="overflow-hidden border-2 border-teal-200 shadow-xl hover:shadow-2xl transition-all duration-300 hover:border-teal-400">
        <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-teal-500/20 to-transparent rounded-bl-full" />
        <CardHeader className="pb-4 bg-gradient-to-r from-teal-50 to-cyan-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-teal-500 to-cyan-600 flex items-center justify-center shadow-lg shadow-teal-500/30">
                <Shield className="h-6 w-6 text-white" />
              </div>
              <div>
                <CardTitle className="text-xl font-bold text-slate-900">Compliance & Emergency</CardTitle>
                <p className="text-sm text-slate-600 mt-0.5">Building safety and regulatory compliance</p>
              </div>
            </div>
            <Link to={createPageUrl('BuildingProfile') + `?id=${selectedBuildingId}`}>
              <Button variant="outline" size="sm" className="border-teal-300 text-teal-700 hover:bg-teal-50">
                <Eye className="h-4 w-4 mr-2" />
                View All
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl bg-gradient-to-br from-red-50 to-red-100 border-2 border-red-200">
              <div className="flex items-center justify-between mb-2">
                <div className="h-10 w-10 rounded-lg bg-red-500 flex items-center justify-center shadow-md">
                  <AlertCircle className="h-5 w-5 text-white" />
                </div>
                <span className="text-3xl font-bold bg-gradient-to-br from-red-600 to-red-700 bg-clip-text text-transparent">{overdueCompliance}</span>
              </div>
              <p className="text-sm font-semibold text-red-900">Overdue</p>
              <p className="text-xs text-red-700 mt-1">Immediate action required</p>
            </div>

            <div className="p-4 rounded-xl bg-gradient-to-br from-amber-50 to-amber-100 border-2 border-amber-200">
              <div className="flex items-center justify-between mb-2">
                <div className="h-10 w-10 rounded-lg bg-amber-500 flex items-center justify-center shadow-md">
                  <Clock className="h-5 w-5 text-white" />
                </div>
                <span className="text-3xl font-bold bg-gradient-to-br from-amber-600 to-amber-700 bg-clip-text text-transparent">{expiringSoon}</span>
              </div>
              <p className="text-sm font-semibold text-amber-900">Expiring Soon</p>
              <p className="text-xs text-amber-700 mt-1">Within 30 days</p>
            </div>

            <div className="p-4 rounded-xl bg-gradient-to-br from-emerald-50 to-emerald-100 border-2 border-emerald-200">
              <div className="flex items-center justify-between mb-2">
                <div className="h-10 w-10 rounded-lg bg-emerald-500 flex items-center justify-center shadow-md">
                  <CheckCircle className="h-5 w-5 text-white" />
                </div>
                <span className="text-3xl font-bold bg-gradient-to-br from-emerald-600 to-emerald-700 bg-clip-text text-transparent">{compliantItems}</span>
              </div>
              <p className="text-sm font-semibold text-emerald-900">Compliant</p>
              <p className="text-xs text-emerald-700 mt-1">Up to date</p>
            </div>

            <div className="p-4 rounded-xl bg-gradient-to-br from-slate-50 to-slate-100 border-2 border-slate-200">
              <div className="flex items-center justify-between mb-2">
                <div className="h-10 w-10 rounded-lg bg-slate-500 flex items-center justify-center shadow-md">
                  <Shield className="h-5 w-5 text-white" />
                </div>
                <span className="text-3xl font-bold bg-gradient-to-br from-slate-600 to-slate-700 bg-clip-text text-transparent">{filteredComplianceRecords.length}</span>
              </div>
              <p className="text-sm font-semibold text-slate-900">Total Items</p>
              <p className="text-xs text-slate-700 mt-1">All compliance records</p>
            </div>
          </div>

          {overdueCompliance > 0 && (
            <div className="mt-4 p-4 bg-red-50 border-l-4 border-red-500 rounded-lg">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-red-900">Action Required</p>
                  <p className="text-xs text-red-700 mt-1">
                    You have {overdueCompliance} overdue compliance item{overdueCompliance !== 1 ? 's' : ''} that require immediate attention.
                  </p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column */}
        <div className="space-y-6">
          {/* Building Summary */}
          <Card className="overflow-hidden border-2 border-blue-200 shadow-xl hover:shadow-2xl transition-all duration-300 hover:border-blue-400">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-500/20 to-transparent rounded-bl-full" />
            <CardHeader className="pb-3 bg-gradient-to-r from-blue-50 to-indigo-50">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/30">
                  <Building2 className="h-5 w-5 text-white" />
                </div>
                <CardTitle className="text-base font-bold text-slate-900">Building Summary</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-2 pt-4">
              <Link to={createPageUrl('AssetRegister')}>
                <div className="flex items-center justify-between p-3 bg-gradient-to-r from-blue-50 to-transparent rounded-lg hover:from-blue-100 transition-all cursor-pointer border border-blue-100">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg shadow-md">
                      <Building2 className="h-4 w-4 text-white" />
                    </div>
                    <span className="text-sm font-semibold text-slate-800">Assets</span>
                  </div>
                  <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">{filteredAssets.length}</span>
                </div>
              </Link>
              <Link to={createPageUrl('ResidentsCenter')}>
                <div className="flex items-center justify-between p-3 bg-gradient-to-r from-purple-50 to-transparent rounded-lg hover:from-purple-100 transition-all cursor-pointer border border-purple-100">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg shadow-md">
                      <Users className="h-4 w-4 text-white" />
                    </div>
                    <span className="text-sm font-semibold text-slate-800">Residents</span>
                  </div>
                  <span className="text-xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">{filteredResidents.length}</span>
                </div>
              </Link>
              <Link to={createPageUrl('OperationsCenter')}>
                <div className="flex items-center justify-between p-3 bg-gradient-to-r from-green-50 to-transparent rounded-lg hover:from-green-100 transition-all cursor-pointer border border-green-100">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-gradient-to-br from-green-500 to-green-600 rounded-lg shadow-md">
                      <Wrench className="h-4 w-4 text-white" />
                    </div>
                    <span className="text-sm font-semibold text-slate-800">Work Orders</span>
                  </div>
                  <span className="text-xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">{filteredWorkOrders.length}</span>
                </div>
              </Link>
              <Link to={createPageUrl('Contractors')}>
                <div className="flex items-center justify-between p-3 bg-gradient-to-r from-orange-50 to-transparent rounded-lg hover:from-orange-100 transition-all cursor-pointer border border-orange-100">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg shadow-md">
                      <HardHat className="h-4 w-4 text-white" />
                    </div>
                    <span className="text-sm font-semibold text-slate-800">Contractors</span>
                  </div>
                  <span className="text-xl font-bold bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent">{contractors.length}</span>
                </div>
              </Link>
              <Link to={createPageUrl('OperationsCenter')}>
                <div className="flex items-center justify-between p-3 bg-gradient-to-r from-red-50 to-transparent rounded-lg hover:from-red-100 transition-all cursor-pointer border border-red-100">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-gradient-to-br from-red-500 to-red-600 rounded-lg shadow-md">
                      <AlertCircle className="h-4 w-4 text-white" />
                    </div>
                    <span className="text-sm font-semibold text-slate-800">Active Cases</span>
                  </div>
                  <span className="text-xl font-bold bg-gradient-to-r from-red-600 to-orange-600 bg-clip-text text-transparent">{filteredActiveCases}</span>
                </div>
              </Link>
            </CardContent>
          </Card>
        </div>

        {/* Middle Column */}
        <div className="space-y-6">
          {/* Items Requiring Action */}
          <Card className="overflow-hidden border-2 border-red-200 shadow-xl hover:shadow-2xl transition-all duration-300 hover:border-red-400">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-red-500/20 to-transparent rounded-bl-full" />
            <CardHeader className="pb-3 bg-gradient-to-r from-red-50 to-orange-50">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-red-500 to-orange-600 flex items-center justify-center shadow-lg shadow-red-500/30 animate-pulse">
                  <AlertCircle className="h-5 w-5 text-white" />
                </div>
                <CardTitle className="text-base font-bold text-slate-900">Items Requiring Action</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {filteredDocuments.filter(d => d.expiry_date && new Date(d.expiry_date) < new Date()).length > 0 && (
                <div className="flex items-center justify-between p-3 rounded-lg bg-white shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-red-600" />
                    <span className="text-sm font-medium text-slate-700">Expired Documents</span>
                  </div>
                  <Badge className="bg-red-600 text-white">
                    {filteredDocuments.filter(d => d.expiry_date && new Date(d.expiry_date) < new Date()).length}
                  </Badge>
                </div>
              )}
              {filteredWorkOrders.filter(wo => wo.status === 'open' && wo.priority === 'urgent').length > 0 && (
                <div className="flex items-center justify-between p-3 rounded-lg bg-white shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-center gap-2">
                    <Wrench className="h-4 w-4 text-orange-600" />
                    <span className="text-sm font-medium text-slate-700">Urgent Work Orders</span>
                  </div>
                  <Badge className="bg-orange-600 text-white">
                    {filteredWorkOrders.filter(wo => wo.status === 'open' && wo.priority === 'urgent').length}
                  </Badge>
                </div>
              )}
              {filteredWorkOrders.filter(wo => wo.status === 'open').length === 0 && filteredDocuments.filter(d => d.expiry_date && new Date(d.expiry_date) < new Date()).length === 0 && (
                <div className="text-center py-8">
                  <div className="inline-flex items-center justify-center w-12 h-12 bg-green-100 rounded-full mb-2">
                    <TrendingUp className="h-6 w-6 text-green-600" />
                  </div>
                  <p className="text-sm font-medium text-slate-700">All clear!</p>
                  <p className="text-xs text-slate-500 mt-1">No items requiring action</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Notes */}
          <Card className="overflow-hidden border-2 border-yellow-200 shadow-xl hover:shadow-2xl transition-all duration-300 hover:border-yellow-400">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-yellow-500/20 to-transparent rounded-bl-full" />
            <CardHeader className="flex flex-row items-center justify-between pb-3 bg-gradient-to-r from-yellow-50 to-amber-50">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-yellow-500 to-amber-600 flex items-center justify-center shadow-lg shadow-yellow-500/30">
                  <FileText className="h-5 w-5 text-white" />
                </div>
                <CardTitle className="text-base font-bold text-slate-900">Notes</CardTitle>
              </div>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-9 w-9 rounded-lg bg-gradient-to-br from-yellow-500 to-amber-600 hover:from-yellow-600 hover:to-amber-700 text-white shadow-lg shadow-yellow-500/30"
                onClick={() => setShowNoteDialog(true)}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent className="space-y-2">
              {filteredNotes.slice(0, 3).map((note) => (
                <div key={note.id} className="p-3 bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between">
                    <p className="text-sm font-semibold text-slate-900">{note.title}</p>
                    <Badge variant="outline" className="text-xs capitalize">{note.category}</Badge>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">{note.created_date && format(new Date(note.created_date), 'dd/MM/yyyy')}</p>
                  <p className="text-xs text-slate-600 mt-2 line-clamp-2">{note.content}</p>
                </div>
              ))}
              {filteredNotes.length === 0 && (
                <div className="text-center py-8">
                  <div className="inline-flex items-center justify-center w-12 h-12 bg-yellow-100 rounded-full mb-2">
                    <FileText className="h-6 w-6 text-yellow-600" />
                  </div>
                  <p className="text-sm font-medium text-slate-700">No notes yet</p>
                  <p className="text-xs text-slate-500 mt-1">Click + to add a note</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Numbers */}
          <Card className="overflow-hidden border-2 border-green-200 shadow-xl hover:shadow-2xl transition-all duration-300 hover:border-green-400">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-green-500/20 to-transparent rounded-bl-full" />
            <CardHeader className="flex flex-row items-center justify-between pb-3 bg-gradient-to-r from-green-50 to-emerald-50">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center shadow-lg shadow-green-500/30">
                  <Phone className="h-5 w-5 text-white" />
                </div>
                <CardTitle className="text-base font-bold text-slate-900">Important Numbers</CardTitle>
              </div>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-9 w-9 rounded-lg bg-gradient-to-br from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white shadow-lg shadow-green-500/30"
                onClick={() => setShowNumberDialog(true)}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent className="space-y-2">
              {filteredNumbers.slice(0, 4).map((number) => (
                <div key={number.id} className="flex items-center justify-between p-3 bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-green-100 rounded-lg">
                      <Phone className="h-4 w-4 text-green-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-900">{number.name}</p>
                      <p className="text-xs text-slate-500 capitalize">{number.category}</p>
                    </div>
                  </div>
                  <span className="text-sm font-semibold text-slate-700">{number.phone_number}</span>
                </div>
              ))}
              {filteredNumbers.length === 0 && (
                <div className="text-center py-8">
                  <div className="inline-flex items-center justify-center w-12 h-12 bg-green-100 rounded-full mb-2">
                    <Phone className="h-6 w-6 text-green-600" />
                  </div>
                  <p className="text-sm font-medium text-slate-700">No numbers saved</p>
                  <p className="text-xs text-slate-500 mt-1">Click + to add a contact</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Activity & Latest Work Orders */}
        <div className="space-y-6">
          {/* Latest Work Order Sent */}
          <Card className="overflow-hidden border-2 border-purple-200 shadow-xl hover:shadow-2xl transition-all duration-300 hover:border-purple-400">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-purple-500/20 to-transparent rounded-bl-full" />
            <CardHeader className="flex flex-row items-center justify-between pb-3 bg-gradient-to-r from-purple-50 to-pink-50">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center shadow-lg shadow-purple-500/30">
                  <Wrench className="h-5 w-5 text-white" />
                </div>
                <CardTitle className="text-base font-bold text-slate-900">Latest Work Orders</CardTitle>
              </div>
              <Button variant="ghost" size="sm" className="h-7 text-xs text-purple-600 hover:text-purple-700 hover:bg-purple-100" asChild>
                <Link to={createPageUrl('WorkOrders')}>
                  <Eye className="h-3 w-3 mr-1" /> View All
                </Link>
              </Button>
            </CardHeader>
            <CardContent className="space-y-2">
              {filteredWorkOrders.slice(0, 5).map((order) => (
                <div key={order.id} className="p-3 bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between mb-2">
                    <p className="text-sm font-semibold text-slate-900 line-clamp-1 flex-1">{order.title}</p>
                    <Badge variant="outline" className="text-xs ml-2">{order.status}</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-slate-500">
                      {order.created_date && format(new Date(order.created_date), 'dd/MM/yyyy')}
                    </p>
                    <Button variant="ghost" size="sm" className="h-6 px-2 text-xs text-purple-600 hover:text-purple-700" asChild>
                      <Link to={createPageUrl('WorkOrders')}>View</Link>
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Activity */}
          <Card className="overflow-hidden border-2 border-cyan-200 shadow-xl hover:shadow-2xl transition-all duration-300 hover:border-cyan-400">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-cyan-500/20 to-transparent rounded-bl-full" />
            <CardHeader className="pb-3 bg-gradient-to-r from-cyan-50 to-blue-50">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/30">
                  <Clock className="h-5 w-5 text-white" />
                </div>
                <CardTitle className="text-base font-bold text-slate-900">Recent Activity</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {filteredWorkOrders.slice(0, 6).map((order) => (
                <div key={order.id} className="p-3 bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-start gap-3">
                    <div className="p-1.5 bg-cyan-100 rounded-lg mt-0.5">
                      <Activity className="h-3 w-3 text-cyan-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-slate-900">
                        {format(new Date(order.created_date), 'dd/MM/yyyy')}
                      </p>
                      <p className="text-xs text-slate-600 mt-1">
                        <span className="font-medium text-cyan-600">{format(new Date(order.created_date), 'HH:mm')}</span> • {order.title}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Note Dialog */}
      <Dialog open={showNoteDialog} onOpenChange={setShowNoteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Note</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Title</Label>
              <Input
                value={noteForm.title}
                onChange={(e) => setNoteForm({ ...noteForm, title: e.target.value })}
                placeholder="Note title..."
              />
            </div>
            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={noteForm.category} onValueChange={(v) => setNoteForm({ ...noteForm, category: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="general">General</SelectItem>
                  <SelectItem value="security">Security</SelectItem>
                  <SelectItem value="maintenance">Maintenance</SelectItem>
                  <SelectItem value="resident">Resident</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Content</Label>
              <Textarea
                value={noteForm.content}
                onChange={(e) => setNoteForm({ ...noteForm, content: e.target.value })}
                placeholder="Note content..."
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNoteDialog(false)}>Cancel</Button>
            <Button 
              onClick={() => createNoteMutation.mutate(noteForm)}
              disabled={!noteForm.title || !noteForm.content || createNoteMutation.isPending}
            >
              {createNoteMutation.isPending ? 'Adding...' : 'Add Note'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Number Dialog */}
      <Dialog open={showNumberDialog} onOpenChange={setShowNumberDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Important Number</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input
                value={numberForm.name}
                onChange={(e) => setNumberForm({ ...numberForm, name: e.target.value })}
                placeholder="Contact name..."
              />
            </div>
            <div className="space-y-2">
              <Label>Phone Number</Label>
              <Input
                value={numberForm.phone_number}
                onChange={(e) => setNumberForm({ ...numberForm, phone_number: e.target.value })}
                placeholder="0400 000 000"
              />
            </div>
            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={numberForm.category} onValueChange={(v) => setNumberForm({ ...numberForm, category: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="emergency">Emergency</SelectItem>
                  <SelectItem value="management">Management</SelectItem>
                  <SelectItem value="committee">Committee</SelectItem>
                  <SelectItem value="contractor">Contractor</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNumberDialog(false)}>Cancel</Button>
            <Button 
              onClick={() => createNumberMutation.mutate(numberForm)}
              disabled={!numberForm.name || !numberForm.phone_number || createNumberMutation.isPending}
            >
              {createNumberMutation.isPending ? 'Adding...' : 'Add Number'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}