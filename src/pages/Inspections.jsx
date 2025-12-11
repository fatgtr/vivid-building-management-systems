import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import PageHeader from '@/components/common/PageHeader';
import EmptyState from '@/components/common/EmptyState';
import StatusBadge from '@/components/common/StatusBadge';
import { ClipboardCheck, Search, Building2, MoreVertical, Pencil, Trash2, Calendar, User, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { format } from 'date-fns';

const inspectionTypes = [
  { value: 'fire_safety', label: 'Fire Safety' },
  { value: 'electrical', label: 'Electrical' },
  { value: 'plumbing', label: 'Plumbing' },
  { value: 'structural', label: 'Structural' },
  { value: 'elevator', label: 'Elevator' },
  { value: 'pool', label: 'Pool' },
  { value: 'general', label: 'General' },
  { value: 'move_in', label: 'Move In' },
  { value: 'move_out', label: 'Move Out' },
  { value: 'annual', label: 'Annual' },
];

const initialFormState = {
  building_id: '',
  unit_id: '',
  title: '',
  inspection_type: 'general',
  scheduled_date: '',
  inspector_name: '',
  inspector_company: '',
  status: 'scheduled',
  findings: '',
  recommendations: '',
  next_inspection_date: '',
};

export default function Inspections() {
  const [showDialog, setShowDialog] = useState(false);
  const [editingInspection, setEditingInspection] = useState(null);
  const [formData, setFormData] = useState(initialFormState);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterBuilding, setFilterBuilding] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [deleteInspection, setDeleteInspection] = useState(null);

  const queryClient = useQueryClient();

  const { data: inspections = [], isLoading } = useQuery({
    queryKey: ['inspections'],
    queryFn: () => base44.entities.Inspection.list('-scheduled_date'),
  });

  const { data: buildings = [] } = useQuery({
    queryKey: ['buildings'],
    queryFn: () => base44.entities.Building.list(),
  });

  const { data: units = [] } = useQuery({
    queryKey: ['units'],
    queryFn: () => base44.entities.Unit.list(),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Inspection.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inspections'] });
      handleCloseDialog();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Inspection.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inspections'] });
      handleCloseDialog();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Inspection.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inspections'] });
      setDeleteInspection(null);
    },
  });

  const handleCloseDialog = () => {
    setShowDialog(false);
    setEditingInspection(null);
    setFormData(initialFormState);
  };

  const handleEdit = (inspection) => {
    setEditingInspection(inspection);
    setFormData({
      building_id: inspection.building_id || '',
      unit_id: inspection.unit_id || '',
      title: inspection.title || '',
      inspection_type: inspection.inspection_type || 'general',
      scheduled_date: inspection.scheduled_date || '',
      inspector_name: inspection.inspector_name || '',
      inspector_company: inspection.inspector_company || '',
      status: inspection.status || 'scheduled',
      findings: inspection.findings || '',
      recommendations: inspection.recommendations || '',
      next_inspection_date: inspection.next_inspection_date || '',
    });
    setShowDialog(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (editingInspection) {
      updateMutation.mutate({ id: editingInspection.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const getBuildingName = (buildingId) => buildings.find(b => b.id === buildingId)?.name || 'Unknown';
  const getUnitNumber = (unitId) => units.find(u => u.id === unitId)?.unit_number || '';
  const getFilteredUnits = () => units.filter(u => u.building_id === formData.building_id);

  const getStatusIcon = (status) => {
    switch (status) {
      case 'passed': return <CheckCircle className="h-5 w-5 text-emerald-500" />;
      case 'failed': return <XCircle className="h-5 w-5 text-red-500" />;
      case 'requires_followup': return <AlertTriangle className="h-5 w-5 text-orange-500" />;
      default: return <Calendar className="h-5 w-5 text-blue-500" />;
    }
  };

  const filteredInspections = inspections.filter(i => {
    const matchesSearch = i.title?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesBuilding = filterBuilding === 'all' || i.building_id === filterBuilding;
    const matchesStatus = filterStatus === 'all' || i.status === filterStatus;
    return matchesSearch && matchesBuilding && matchesStatus;
  });

  const upcomingCount = inspections.filter(i => i.status === 'scheduled').length;

  if (isLoading) {
    return (
      <div className="space-y-8">
        <PageHeader title="Inspections" subtitle="Schedule and track inspections" />
        <Skeleton className="h-96 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Inspections" 
        subtitle={`${upcomingCount} upcoming inspections`}
        action={() => setShowDialog(true)}
        actionLabel="Schedule Inspection"
      />

      {/* Filters */}
      <div className="flex flex-wrap gap-4">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search inspections..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={filterBuilding} onValueChange={setFilterBuilding}>
          <SelectTrigger className="w-[200px]">
            <Building2 className="h-4 w-4 mr-2 text-slate-400" />
            <SelectValue placeholder="All Buildings" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Buildings</SelectItem>
            {buildings.map(b => (
              <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="All Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="scheduled">Scheduled</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="passed">Passed</SelectItem>
            <SelectItem value="failed">Failed</SelectItem>
            <SelectItem value="requires_followup">Requires Follow-up</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {filteredInspections.length === 0 ? (
        <EmptyState
          icon={ClipboardCheck}
          title="No inspections"
          description="Schedule inspections to maintain compliance and safety"
          action={() => setShowDialog(true)}
          actionLabel="Schedule Inspection"
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredInspections.map((inspection) => (
            <Card key={inspection.id} className="border-0 shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    {getStatusIcon(inspection.status)}
                    <StatusBadge status={inspection.status} />
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleEdit(inspection)}>
                        <Pencil className="mr-2 h-4 w-4" /> Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setDeleteInspection(inspection)} className="text-red-600">
                        <Trash2 className="mr-2 h-4 w-4" /> Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                <h3 className="font-semibold text-slate-900 mb-1">{inspection.title}</h3>
                <p className="text-sm text-slate-500 mb-3 capitalize">{inspection.inspection_type?.replace(/_/g, ' ')}</p>

                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2 text-slate-600">
                    <Building2 className="h-4 w-4 text-slate-400" />
                    <span>{getBuildingName(inspection.building_id)}</span>
                    {inspection.unit_id && <span>• Unit {getUnitNumber(inspection.unit_id)}</span>}
                  </div>
                  {inspection.scheduled_date && (
                    <div className="flex items-center gap-2 text-slate-600">
                      <Calendar className="h-4 w-4 text-slate-400" />
                      <span>{format(new Date(inspection.scheduled_date), 'MMM d, yyyy')}</span>
                    </div>
                  )}
                  {inspection.inspector_name && (
                    <div className="flex items-center gap-2 text-slate-600">
                      <User className="h-4 w-4 text-slate-400" />
                      <span>{inspection.inspector_name}</span>
                      {inspection.inspector_company && <span className="text-slate-400">({inspection.inspector_company})</span>}
                    </div>
                  )}
                </div>

                {(inspection.findings || inspection.recommendations) && (
                  <div className="mt-4 pt-3 border-t border-slate-100">
                    {inspection.findings && (
                      <p className="text-xs text-slate-600 line-clamp-2">
                        <span className="font-medium">Findings:</span> {inspection.findings}
                      </p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingInspection ? 'Edit Inspection' : 'Schedule Inspection'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <Label htmlFor="title">Title *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g., Annual Fire Safety Inspection"
                  required
                />
              </div>
              <div>
                <Label htmlFor="building_id">Building *</Label>
                <Select value={formData.building_id} onValueChange={(v) => setFormData({ ...formData, building_id: v, unit_id: '' })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select building" />
                  </SelectTrigger>
                  <SelectContent>
                    {buildings.map(b => (
                      <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="unit_id">Unit (optional)</Label>
                <Select value={formData.unit_id} onValueChange={(v) => setFormData({ ...formData, unit_id: v })} disabled={!formData.building_id}>
                  <SelectTrigger>
                    <SelectValue placeholder="Building-wide" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={null}>Building-wide</SelectItem>
                    {getFilteredUnits().map(u => (
                      <SelectItem key={u.id} value={u.id}>Unit {u.unit_number}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="inspection_type">Type *</Label>
                <Select value={formData.inspection_type} onValueChange={(v) => setFormData({ ...formData, inspection_type: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {inspectionTypes.map(t => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="scheduled_date">Scheduled Date *</Label>
                <Input
                  id="scheduled_date"
                  type="date"
                  value={formData.scheduled_date}
                  onChange={(e) => setFormData({ ...formData, scheduled_date: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="inspector_name">Inspector Name</Label>
                <Input
                  id="inspector_name"
                  value={formData.inspector_name}
                  onChange={(e) => setFormData({ ...formData, inspector_name: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="inspector_company">Inspector Company</Label>
                <Input
                  id="inspector_company"
                  value={formData.inspector_company}
                  onChange={(e) => setFormData({ ...formData, inspector_company: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="status">Status</Label>
                <Select value={formData.status} onValueChange={(v) => setFormData({ ...formData, status: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="scheduled">Scheduled</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="passed">Passed</SelectItem>
                    <SelectItem value="failed">Failed</SelectItem>
                    <SelectItem value="requires_followup">Requires Follow-up</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="next_inspection_date">Next Inspection Date</Label>
                <Input
                  id="next_inspection_date"
                  type="date"
                  value={formData.next_inspection_date}
                  onChange={(e) => setFormData({ ...formData, next_inspection_date: e.target.value })}
                />
              </div>
              <div className="md:col-span-2">
                <Label htmlFor="findings">Findings</Label>
                <Textarea
                  id="findings"
                  value={formData.findings}
                  onChange={(e) => setFormData({ ...formData, findings: e.target.value })}
                  rows={3}
                  placeholder="Document inspection findings..."
                />
              </div>
              <div className="md:col-span-2">
                <Label htmlFor="recommendations">Recommendations</Label>
                <Textarea
                  id="recommendations"
                  value={formData.recommendations}
                  onChange={(e) => setFormData({ ...formData, recommendations: e.target.value })}
                  rows={2}
                  placeholder="Recommendations for follow-up actions..."
                />
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleCloseDialog}>Cancel</Button>
              <Button type="submit" className="bg-blue-600 hover:bg-blue-700" disabled={createMutation.isPending || updateMutation.isPending}>
                {createMutation.isPending || updateMutation.isPending ? 'Saving...' : (editingInspection ? 'Update' : 'Schedule')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteInspection} onOpenChange={() => setDeleteInspection(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Inspection</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deleteInspection?.title}"?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteMutation.mutate(deleteInspection.id)} className="bg-red-600 hover:bg-red-700">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}