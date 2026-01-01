import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import PageHeader from '@/components/common/PageHeader';
import EmptyState from '@/components/common/EmptyState';
import StatusBadge from '@/components/common/StatusBadge';
import { Calendar, Search, Building2, MoreVertical, Pencil, Trash2, Play, Pause, Repeat, HardHat, CheckCircle, Sparkles, Loader2, AlertCircle, X, FileText, Clock } from 'lucide-react';
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
import { useBuildingContext } from '@/components/BuildingContext';
import { toast } from 'sonner';

const initialFormState = {
  building_id: '',
  subject: '',
  description: '',
  scheduled_date: '',
  recurrence: 'none',
  recurrence_end_date: '',
  assigned_contractor_id: '',
  assigned_contractor_type: '',
  asset_id: '',
  status: 'active',
  notes: ''
};

export default function MaintenanceSchedule() {
  const { selectedBuildingId } = useBuildingContext();
  const [showDialog, setShowDialog] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState(null);
  const [formData, setFormData] = useState(initialFormState);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('active');
  const [filterRecurrence, setFilterRecurrence] = useState('all');
  const [filterContractorType, setFilterContractorType] = useState('all');
  const [deleteSchedule, setDeleteSchedule] = useState(null);
  const [uploadingFiles, setUploadingFiles] = useState(false);
  const [selectedDocuments, setSelectedDocuments] = useState([]);
  const [generatingSchedules, setGeneratingSchedules] = useState(false);
  const [aiResults, setAiResults] = useState(null);

  const queryClient = useQueryClient();

  const { data: schedules = [], isLoading } = useQuery({
    queryKey: ['maintenanceSchedules', selectedBuildingId],
    queryFn: () => selectedBuildingId 
      ? base44.entities.MaintenanceSchedule.filter({ building_id: selectedBuildingId })
      : base44.entities.MaintenanceSchedule.list()
  });

  const { data: buildings = [] } = useQuery({
    queryKey: ['buildings'],
    queryFn: () => base44.entities.Building.list(),
  });

  const { data: contractors = [] } = useQuery({
    queryKey: ['contractors'],
    queryFn: () => base44.entities.Contractor.list(),
  });

  const { data: assets = [] } = useQuery({
    queryKey: ['assets', selectedBuildingId],
    queryFn: () => selectedBuildingId ? base44.entities.Asset.filter({ building_id: selectedBuildingId }) : [],
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.MaintenanceSchedule.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenanceSchedules'] });
      handleCloseDialog();
      toast.success('Maintenance schedule created!');
    },
    onError: (error) => {
      toast.error('Failed to create: ' + error.message);
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.MaintenanceSchedule.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenanceSchedules'] });
      handleCloseDialog();
      toast.success('Schedule updated!');
    },
    onError: (error) => {
      toast.error('Failed to update: ' + error.message);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.MaintenanceSchedule.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenanceSchedules'] });
      setDeleteSchedule(null);
      toast.success('Schedule deleted!');
    },
    onError: (error) => {
      toast.error('Failed to delete: ' + error.message);
    }
  });

  const toggleStatusMutation = useMutation({
    mutationFn: ({ id, status }) => {
      const newStatus = status === 'active' ? 'inactive' : 'active';
      return base44.entities.MaintenanceSchedule.update(id, { status: newStatus });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenanceSchedules'] });
      toast.success('Status updated!');
    },
  });

  const handleCloseDialog = () => {
    setShowDialog(false);
    setEditingSchedule(null);
    setFormData(initialFormState);
    setSelectedDocuments([]);
  };

  const handleEdit = (schedule) => {
    setEditingSchedule(schedule);
    setFormData({
      building_id: schedule.building_id || '',
      subject: schedule.subject || '',
      description: schedule.description || '',
      scheduled_date: schedule.scheduled_date || schedule.next_due_date || '',
      recurrence: schedule.recurrence || 'none',
      recurrence_end_date: schedule.recurrence_end_date || '',
      assigned_contractor_id: schedule.assigned_contractor_id || '',
      assigned_contractor_type: schedule.assigned_contractor_type || '',
      asset_id: schedule.asset_id || '',
      status: schedule.status || 'active',
      notes: schedule.notes || '',
    });
    setSelectedDocuments([]);
    setShowDialog(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setUploadingFiles(true);

    try {
      let documentUrls = [];

      if (selectedDocuments.length > 0) {
        const docUploads = await Promise.all(
          selectedDocuments.map(file => base44.integrations.Core.UploadFile({ file }))
        );
        documentUrls = docUploads.map(r => r.file_url);
      }

      const data = {
        ...formData,
        documents: documentUrls.length > 0 ? documentUrls : (editingSchedule?.documents || []),
        next_due_date: formData.scheduled_date,
      };

      if (editingSchedule) {
        await updateMutation.mutateAsync({ id: editingSchedule.id, data });
      } else {
        await createMutation.mutateAsync(data);
      }
    } catch (error) {
      console.error('Operation failed:', error);
    } finally {
      setUploadingFiles(false);
    }
  };

  const handleDocumentSelect = (e) => {
    const files = Array.from(e.target.files || []);
    setSelectedDocuments([...selectedDocuments, ...files]);
  };

  const removeDocument = (index) => {
    setSelectedDocuments(selectedDocuments.filter((_, i) => i !== index));
  };

  const getBuildingName = (buildingId) => buildings.find(b => b.id === buildingId)?.name || 'Unknown';
  const getContractorName = (schedule) => {
    if (schedule.assigned_contractor_id) {
      return contractors.find(c => c.id === schedule.assigned_contractor_id)?.company_name || 'Unknown';
    }
    if (schedule.assigned_contractor_type) {
      return `Any ${schedule.assigned_contractor_type.replace(/_/g, ' ')}`;
    }
    return 'Not assigned';
  };
  const getAssetName = (assetId) => assets.find(a => a.id === assetId)?.name || '';

  const generateAISchedules = async () => {
    setGeneratingSchedules(true);
    setAiResults(null);
    
    try {
      const { data } = await base44.functions.invoke('generateAssetMaintenanceSchedules', {
        building_id: selectedBuildingId
      });
      
      setAiResults(data);
      queryClient.invalidateQueries({ queryKey: ['maintenanceSchedules'] });
      toast.success('AI generation complete!');
    } catch (error) {
      console.error('AI generation error:', error);
      setAiResults({ error: 'Failed to generate schedules', success: false });
      toast.error('Generation failed');
    } finally {
      setGeneratingSchedules(false);
    }
  };

  const filteredSchedules = schedules.filter(schedule => {
    const matchesSearch = schedule.subject?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          schedule.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          getBuildingName(schedule.building_id).toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = filterStatus === 'all' || schedule.status === filterStatus;
    const matchesRecurrence = filterRecurrence === 'all' || schedule.recurrence === filterRecurrence;
    const matchesContractorType = filterContractorType === 'all' || schedule.assigned_contractor_type === filterContractorType;

    return matchesSearch && matchesStatus && matchesRecurrence && matchesContractorType;
  });

  const ScheduleCard = ({ schedule }) => (
    <Card className="group border-0 shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden">
      <div className={`h-1.5 w-full ${
        schedule.status === 'active' ? 'bg-gradient-to-r from-blue-500 to-blue-600' :
        schedule.status === 'pending_assignment' ? 'bg-gradient-to-r from-orange-500 to-orange-600' :
        'bg-gradient-to-r from-green-500 to-green-600'
      }`} />
      <CardContent className="p-5">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2 flex-wrap">
            <StatusBadge status={schedule.status} />
            {schedule.recurrence !== 'none' && (
              <Badge variant="outline" className="flex items-center gap-1 bg-purple-50 text-purple-700 border-purple-200">
                <Repeat className="h-3 w-3" />
                {schedule.recurrence}
              </Badge>
            )}
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 opacity-60 group-hover:opacity-100 transition-opacity">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => handleEdit(schedule)}>
                <Pencil className="mr-2 h-4 w-4" /> Edit
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => toggleStatusMutation.mutate({ 
                id: schedule.id, 
                status: schedule.status 
              })}>
                {schedule.status === 'active' ? (
                  <><Pause className="h-4 w-4 mr-2" /> Pause</>
                ) : (
                  <><Play className="h-4 w-4 mr-2" /> Activate</>
                )}
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => setDeleteSchedule(schedule)}
                className="text-red-600"
              >
                <Trash2 className="mr-2 h-4 w-4" /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <h3 className="font-bold text-lg text-slate-900 mb-2 line-clamp-2 group-hover:text-blue-700 transition-colors leading-tight">
          {schedule.subject}
        </h3>
        <p className="text-sm text-slate-600 mb-4 line-clamp-2 leading-relaxed">
          {schedule.description || 'No description'}
        </p>

        <div className="space-y-2.5 mb-4">
          <div className="flex items-center gap-2 text-xs bg-slate-50 px-3 py-2 rounded-lg">
            <Building2 className="h-3.5 w-3.5 text-slate-500 flex-shrink-0" />
            <span className="text-slate-700 font-medium truncate">
              {getBuildingName(schedule.building_id)}
            </span>
          </div>
          
          {schedule.next_due_date && (
            <div className="flex items-center gap-2 text-xs bg-orange-50 px-3 py-2 rounded-lg">
              <Calendar className="h-3.5 w-3.5 text-orange-600 flex-shrink-0" />
              <span className="text-orange-700 font-medium">
                Next Due {format(new Date(schedule.next_due_date), 'MMM d, yyyy')}
              </span>
            </div>
          )}

          <div className="flex items-center gap-2 text-xs bg-indigo-50 px-3 py-2 rounded-lg">
            <HardHat className="h-3.5 w-3.5 text-indigo-600 flex-shrink-0" />
            <span className="text-indigo-700 font-medium truncate">
              {getContractorName(schedule)}
            </span>
          </div>
        </div>

        <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <Clock className="h-3 w-3" />
            <span>{schedule.created_date && format(new Date(schedule.created_date), 'MMM d, yyyy')}</span>
          </div>
          {schedule.task_ids?.length > 0 && (
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <span>{schedule.task_ids.length} task{schedule.task_ids.length !== 1 ? 's' : ''}</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );

  if (isLoading) {
    return (
      <div className="space-y-8">
        <PageHeader title="Maintenance Schedules" subtitle="Manage recurring maintenance events" />
        <Skeleton className="h-96 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Maintenance Schedules" 
        subtitle={`${schedules.filter(s => s.status === 'active').length} active schedules`}
        action={() => setShowDialog(true)}
        actionLabel="Create Schedule"
        actionIcon={Calendar}
      >
        <Button 
          onClick={generateAISchedules} 
          variant="outline"
          disabled={generatingSchedules}
          className="gap-2"
        >
          {generatingSchedules ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Analyzing...
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4" />
              AI Generate
            </>
          )}
        </Button>
      </PageHeader>

      {aiResults && (
        <Card className={`border-2 ${aiResults.success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
          <CardContent className="p-4">
            {aiResults.success ? (
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <Sparkles className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <h3 className="font-semibold text-green-900 mb-1">AI Analysis Complete</h3>
                    <p className="text-sm text-green-700">
                      Analyzed {aiResults.total_analyzed} assets • Created {aiResults.scheduled} schedules • Flagged {aiResults.flagged} critical assets
                    </p>
                  </div>
                  <Button size="sm" variant="ghost" onClick={() => setAiResults(null)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                
                {aiResults.flagged_assets && aiResults.flagged_assets.length > 0 && (
                  <div className="bg-white rounded-lg p-3 border border-orange-200">
                    <h4 className="font-medium text-orange-900 mb-2 flex items-center gap-2">
                      <AlertCircle className="h-4 w-4" />
                      Assets Requiring Immediate Attention
                    </h4>
                    <div className="space-y-2">
                      {aiResults.flagged_assets.map((asset, idx) => (
                        <div key={idx} className="text-sm bg-orange-50 p-2 rounded">
                          <p className="font-medium text-orange-900">{asset.asset_name}</p>
                          <p className="text-xs text-orange-700">Priority: {asset.priority} • {asset.reason}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h3 className="font-semibold text-red-900 mb-1">Generation Failed</h3>
                  <p className="text-sm text-red-700">{aiResults.error || 'Unable to generate schedules'}</p>
                </div>
                <Button size="sm" variant="ghost" onClick={() => setAiResults(null)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Tabs value={filterStatus} onValueChange={setFilterStatus} className="space-y-6">
        <div className="flex flex-wrap gap-4 justify-between items-center">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search schedules..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <TabsList className="grid w-full sm:w-auto grid-cols-3">
            <TabsTrigger value="active">Active ({schedules.filter(s => s.status === 'active').length})</TabsTrigger>
            <TabsTrigger value="pending_assignment">Pending ({schedules.filter(s => s.status === 'pending_assignment').length})</TabsTrigger>
            <TabsTrigger value="completed">Completed ({schedules.filter(s => s.status === 'completed').length})</TabsTrigger>
          </TabsList>
          <div className="flex flex-wrap gap-2">
            <Select value={filterRecurrence} onValueChange={setFilterRecurrence}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Recurrence" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Recurrence</SelectItem>
                <SelectItem value="none">One-time</SelectItem>
                <SelectItem value="weekly">Weekly</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
                <SelectItem value="quarterly">Quarterly</SelectItem>
                <SelectItem value="yearly">Yearly</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterContractorType} onValueChange={setFilterContractorType}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="plumbing">Plumbing</SelectItem>
                <SelectItem value="electrical">Electrical</SelectItem>
                <SelectItem value="hvac">HVAC</SelectItem>
                <SelectItem value="cleaning">Cleaning</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <TabsContent value="active" className="space-y-4">
          {filteredSchedules.filter(s => s.status === 'active').length === 0 ? (
            <EmptyState
              icon={Calendar}
              title="No active schedules"
              description="Create a new maintenance schedule to get started."
              action={() => setShowDialog(true)}
              actionLabel="Create Schedule"
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredSchedules.filter(s => s.status === 'active').map((schedule) => (
                <ScheduleCard key={schedule.id} schedule={schedule} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="pending_assignment" className="space-y-4">
          {filteredSchedules.filter(s => s.status === 'pending_assignment').length === 0 ? (
            <EmptyState
              icon={HardHat}
              title="No pending assignments"
              description="Schedules with pending contractor assignments will appear here."
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredSchedules.filter(s => s.status === 'pending_assignment').map((schedule) => (
                <ScheduleCard key={schedule.id} schedule={schedule} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="completed" className="space-y-4">
          {filteredSchedules.filter(s => s.status === 'completed').length === 0 ? (
            <EmptyState
              icon={CheckCircle}
              title="No completed schedules"
              description="Completed maintenance schedules will appear here."
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredSchedules.filter(s => s.status === 'completed').map((schedule) => (
                <ScheduleCard key={schedule.id} schedule={schedule} />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingSchedule ? 'Edit Maintenance Event' : 'New Maintenance Event'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <Label htmlFor="subject">Subject *</Label>
                <Input
                  id="subject"
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  placeholder="e.g., Quarterly HVAC Inspection"
                  required
                />
              </div>

              <div>
                <Label htmlFor="building_id">Building *</Label>
                <Select value={formData.building_id} onValueChange={(v) => setFormData({ ...formData, building_id: v })}>
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
                <Label htmlFor="recurrence">Recurrence</Label>
                <Select value={formData.recurrence} onValueChange={(v) => setFormData({ ...formData, recurrence: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">One-time</SelectItem>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="quarterly">Quarterly</SelectItem>
                    <SelectItem value="half_yearly">Half-Yearly</SelectItem>
                    <SelectItem value="yearly">Yearly</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {formData.recurrence !== 'none' && (
                <div className="md:col-span-2">
                  <Label htmlFor="recurrence_end_date">Recurrence End Date (Optional)</Label>
                  <Input
                    id="recurrence_end_date"
                    type="date"
                    value={formData.recurrence_end_date}
                    onChange={(e) => setFormData({ ...formData, recurrence_end_date: e.target.value })}
                  />
                </div>
              )}

              <div>
                <Label htmlFor="asset_id">Asset (Optional)</Label>
                <Select value={formData.asset_id} onValueChange={(v) => setFormData({ ...formData, asset_id: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select asset" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={null}>No specific asset</SelectItem>
                    {assets.map(a => (
                      <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div />

              <div className="md:col-span-2 space-y-3">
                <Label>Contractor Assignment</Label>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs text-slate-500">Specific Contractor</Label>
                    <Select
                      value={formData.assigned_contractor_id}
                      onValueChange={(v) => setFormData({ ...formData, assigned_contractor_id: v, assigned_contractor_type: '' })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select contractor" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={null}>None</SelectItem>
                        {contractors.map(c => (
                          <SelectItem key={c.id} value={c.id}>{c.company_name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="text-xs text-slate-500">Or Contractor Type</Label>
                    <Select
                      value={formData.assigned_contractor_type}
                      onValueChange={(v) => setFormData({ ...formData, assigned_contractor_type: v, assigned_contractor_id: '' })}
                      disabled={!!formData.assigned_contractor_id}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={null}>None</SelectItem>
                        <SelectItem value="plumbing">Plumbing</SelectItem>
                        <SelectItem value="electrical">Electrical</SelectItem>
                        <SelectItem value="hvac">HVAC</SelectItem>
                        <SelectItem value="appliance">Appliance</SelectItem>
                        <SelectItem value="structural">Structural</SelectItem>
                        <SelectItem value="pest_control">Pest Control</SelectItem>
                        <SelectItem value="cleaning">Cleaning</SelectItem>
                        <SelectItem value="landscaping">Landscaping</SelectItem>
                        <SelectItem value="security">Security</SelectItem>
                        <SelectItem value="general">General</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <p className="text-xs text-slate-500">
                  Choose a specific contractor OR a contractor type. System will auto-assign compliant contractors.
                </p>
              </div>

              <div className="md:col-span-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  placeholder="Detailed description of maintenance work..."
                />
              </div>

              <div className="md:col-span-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={2}
                  placeholder="Additional notes..."
                />
              </div>

              <div className="md:col-span-2">
                <Label>Documents (Optional)</Label>
                <div className="mt-2">
                  <Button type="button" variant="outline" className="w-full" asChild>
                    <label>
                      <FileText className="h-4 w-4 mr-2" />
                      Upload Documents ({selectedDocuments.length})
                      <input
                        type="file"
                        multiple
                        accept=".pdf,.doc,.docx"
                        className="hidden"
                        onChange={handleDocumentSelect}
                      />
                    </label>
                  </Button>
                  {selectedDocuments.length > 0 && (
                    <div className="space-y-2 mt-2">
                      {selectedDocuments.map((file, idx) => (
                        <div key={idx} className="flex items-center justify-between p-2 bg-slate-50 rounded">
                          <span className="text-sm truncate">{file.name}</span>
                          <button
                            type="button"
                            onClick={() => removeDocument(idx)}
                            className="text-red-500 hover:text-red-700"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleCloseDialog}>Cancel</Button>
              <Button type="submit" className="bg-blue-600 hover:bg-blue-700" disabled={createMutation.isPending || updateMutation.isPending || uploadingFiles}>
                {uploadingFiles ? 'Uploading...' : (createMutation.isPending || updateMutation.isPending ? 'Saving...' : (editingSchedule ? 'Update' : 'Create'))}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteSchedule} onOpenChange={() => setDeleteSchedule(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Maintenance Event</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deleteSchedule?.subject}"?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteMutation.mutate(deleteSchedule.id)} className="bg-red-600 hover:bg-red-700">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}