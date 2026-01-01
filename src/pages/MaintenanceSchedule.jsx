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
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import PageHeader from '@/components/common/PageHeader';
import EmptyState from '@/components/common/EmptyState';
import StatusBadge from '@/components/common/StatusBadge';
import ComplianceReportDialog from '@/components/assets/ComplianceReportDialog';
import { Calendar, Search, Building2, MoreVertical, Pencil, Trash2, Eye, Upload, X, FileText, Image as ImageIcon, Sparkles, Loader2, AlertCircle, FileBarChart } from 'lucide-react';
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { format } from 'date-fns';

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
  notes: '',
};

export default function MaintenanceSchedule() {
  const [showDialog, setShowDialog] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState(null);
  const [formData, setFormData] = useState(initialFormState);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [deleteSchedule, setDeleteSchedule] = useState(null);
  const [viewingSchedule, setViewingSchedule] = useState(null);
  const [uploadingFiles, setUploadingFiles] = useState(false);
  const [selectedDocuments, setSelectedDocuments] = useState([]);
  const [selectedPhotos, setSelectedPhotos] = useState([]);
  const [generatingSchedules, setGeneratingSchedules] = useState(false);
  const [aiResults, setAiResults] = useState(null);
  const [complianceReportAsset, setComplianceReportAsset] = useState(null);

  const queryClient = useQueryClient();

  const { data: schedules = [], isLoading } = useQuery({
    queryKey: ['maintenanceSchedules'],
    queryFn: () => base44.entities.MaintenanceSchedule.list('-created_date'),
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
    queryKey: ['assets'],
    queryFn: () => base44.entities.Asset.list(),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.MaintenanceSchedule.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenanceSchedules'] });
      handleCloseDialog();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.MaintenanceSchedule.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenanceSchedules'] });
      handleCloseDialog();
      setViewingSchedule(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.MaintenanceSchedule.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenanceSchedules'] });
      setDeleteSchedule(null);
    },
  });

  const handleCloseDialog = () => {
    setShowDialog(false);
    setEditingSchedule(null);
    setFormData(initialFormState);
    setSelectedDocuments([]);
    setSelectedPhotos([]);
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
    setSelectedPhotos([]);
    setShowDialog(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setUploadingFiles(true);

    try {
      let documentUrls = [];
      let photoUrls = [];

      if (selectedDocuments.length > 0) {
        const docUploads = await Promise.all(
          selectedDocuments.map(file => base44.integrations.Core.UploadFile({ file }))
        );
        documentUrls = docUploads.map(r => r.file_url);
      }

      if (selectedPhotos.length > 0) {
        const photoUploads = await Promise.all(
          selectedPhotos.map(file => base44.integrations.Core.UploadFile({ file }))
        );
        photoUrls = photoUploads.map(r => r.file_url);
      }

      const data = {
        ...formData,
        documents: documentUrls.length > 0 ? documentUrls : (editingSchedule?.documents || []),
        next_due_date: formData.next_due_date || formData.scheduled_date,
      };

      if (editingSchedule) {
        updateMutation.mutate({ id: editingSchedule.id, data });
      } else {
        createMutation.mutate(data);
      }
    } catch (error) {
      console.error('Upload failed:', error);
    } finally {
      setUploadingFiles(false);
    }
  };

  const handleDocumentSelect = (e) => {
    const files = Array.from(e.target.files || []);
    setSelectedDocuments([...selectedDocuments, ...files]);
  };

  const handlePhotoSelect = (e) => {
    const files = Array.from(e.target.files || []);
    setSelectedPhotos([...selectedPhotos, ...files]);
  };

  const removeDocument = (index) => {
    setSelectedDocuments(selectedDocuments.filter((_, i) => i !== index));
  };

  const removePhoto = (index) => {
    setSelectedPhotos(selectedPhotos.filter((_, i) => i !== index));
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

  const generateAISchedules = async (buildingId = null) => {
    setGeneratingSchedules(true);
    setAiResults(null);
    
    try {
      const { data } = await base44.functions.invoke('generateAssetMaintenanceSchedules', {
        building_id: buildingId
      });
      
      setAiResults(data);
      queryClient.invalidateQueries({ queryKey: ['maintenanceSchedules'] });
    } catch (error) {
      console.error('AI generation error:', error);
      setAiResults({ error: 'Failed to generate schedules', success: false });
    } finally {
      setGeneratingSchedules(false);
    }
  };

  const filteredSchedules = schedules.filter(schedule => {
    const matchesSearch = schedule.subject?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         schedule.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = filterStatus === 'all' || schedule.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  if (isLoading) {
    return (
      <div className="space-y-8">
        <PageHeader title="Maintenance Schedule" subtitle="Manage recurring maintenance events" />
        <Skeleton className="h-96 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Maintenance Schedule" 
        subtitle={`${schedules.filter(s => s.status === 'active').length} active maintenance events`}
      >
        <div className="flex gap-2">
          <Button 
            onClick={() => generateAISchedules()} 
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
          <Button onClick={() => setShowDialog(true)}>
            New Event
          </Button>
        </div>
      </PageHeader>

      {/* AI Results */}
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

      {/* Filters */}
      <div className="flex flex-wrap gap-4">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search maintenance events..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Tabs value={filterStatus} onValueChange={setFilterStatus} className="w-auto">
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="active">Active</TabsTrigger>
            <TabsTrigger value="completed">Completed</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {filteredSchedules.length === 0 ? (
        <EmptyState
          icon={Calendar}
          title="No maintenance events found"
          description="Create a maintenance schedule to track recurring maintenance tasks"
          action={() => setShowDialog(true)}
          actionLabel="Create Event"
        />
      ) : (
        <Card className="border-0 shadow-sm">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Subject</TableHead>
                <TableHead>Next Due</TableHead>
                <TableHead>Recurrence</TableHead>
                <TableHead>Contractor</TableHead>
                <TableHead>Asset</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredSchedules.map((schedule) => (
                <TableRow key={schedule.id}>
                  <TableCell className="font-medium">{schedule.subject}</TableCell>
                  <TableCell>
                    {(schedule.next_due_date || schedule.scheduled_date) && 
                      format(new Date(schedule.next_due_date || schedule.scheduled_date), 'MMM d, yyyy')}
                  </TableCell>
                  <TableCell className="capitalize">{schedule.recurrence?.replace(/_/g, ' ')}</TableCell>
                  <TableCell>{getContractorName(schedule)}</TableCell>
                  <TableCell>{getAssetName(schedule.asset_id) || '-'}</TableCell>
                  <TableCell>
                    <StatusBadge status={schedule.status} />
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleEdit(schedule)}>
                          <Pencil className="mr-2 h-4 w-4" /> Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setDeleteSchedule(schedule)} className="text-red-600">
                          <Trash2 className="mr-2 h-4 w-4" /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* Add/Edit Dialog */}
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

              {/* Documents Upload */}
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

      {/* Delete Confirmation */}
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