import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { useBuildingContext } from '@/components/BuildingContext';
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
  Clock
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

export default function Dashboard() {
  const { selectedBuildingId } = useBuildingContext();
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
      {/* Top Section - Calendar */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <CalendarWidget workOrders={filteredWorkOrders} maintenanceSchedules={filteredMaintenanceSchedules} residents={filteredResidents} />
        </div>
        <div>
          <CasesChart workOrders={filteredWorkOrders} />
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column */}
        <div className="space-y-6">
          {/* Building Summary */}
          <Card className="border-0 shadow-lg bg-gradient-to-br from-blue-50 to-indigo-50">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold text-slate-900">Building Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Building2 className="h-5 w-5 text-blue-600" />
                  </div>
                  <span className="text-sm font-medium text-slate-700">Assets</span>
                </div>
                <span className="text-lg font-bold text-blue-600">{filteredUnits.length}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <Users className="h-5 w-5 text-purple-600" />
                  </div>
                  <span className="text-sm font-medium text-slate-700">Residents</span>
                </div>
                <span className="text-lg font-bold text-purple-600">{filteredResidents.length}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <Wrench className="h-5 w-5 text-green-600" />
                  </div>
                  <span className="text-sm font-medium text-slate-700">Work Orders</span>
                </div>
                <span className="text-lg font-bold text-green-600">{filteredWorkOrders.length}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-orange-100 rounded-lg">
                    <HardHat className="h-5 w-5 text-orange-600" />
                  </div>
                  <span className="text-sm font-medium text-slate-700">Contractors</span>
                </div>
                <span className="text-lg font-bold text-orange-600">{contractors.length}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-red-100 rounded-lg">
                    <AlertCircle className="h-5 w-5 text-red-600" />
                  </div>
                  <span className="text-sm font-medium text-slate-700">Active Cases</span>
                </div>
                <span className="text-lg font-bold text-red-600">{filteredActiveCases}</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Middle Column */}
        <div className="space-y-6">
          {/* Items Requiring Action */}
          <Card className="border-0 shadow-lg bg-gradient-to-br from-red-50 to-orange-50">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-red-100 rounded-lg">
                  <AlertCircle className="h-4 w-4 text-red-600" />
                </div>
                <CardTitle className="text-base font-semibold text-slate-900">Items Requiring Action</CardTitle>
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
          <Card className="border-0 shadow-lg bg-gradient-to-br from-yellow-50 to-amber-50">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-base font-semibold text-slate-900">Notes</CardTitle>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8 bg-yellow-100 hover:bg-yellow-200 text-yellow-700"
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
          <Card className="border-0 shadow-lg bg-gradient-to-br from-green-50 to-emerald-50">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-base font-semibold text-slate-900">Important Numbers</CardTitle>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8 bg-green-100 hover:bg-green-200 text-green-700"
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
          <Card className="border-0 shadow-lg bg-gradient-to-br from-purple-50 to-pink-50">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Wrench className="h-4 w-4 text-purple-600" />
                </div>
                <CardTitle className="text-base font-semibold text-slate-900">Latest Work Orders</CardTitle>
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
          <Card className="border-0 shadow-lg bg-gradient-to-br from-cyan-50 to-blue-50">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-cyan-100 rounded-lg">
                  <Clock className="h-4 w-4 text-cyan-600" />
                </div>
                <CardTitle className="text-base font-semibold text-slate-900">Recent Activity</CardTitle>
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