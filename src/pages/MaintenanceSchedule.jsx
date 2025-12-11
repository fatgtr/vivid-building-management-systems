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
import { Calendar, Search, Building2, MoreVertical, Pencil, Trash2, Eye, Upload, X, FileText, Image as ImageIcon } from 'lucide-react';
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
  event_start: '',
  event_end: '',
  recurrence: 'one_time',
  contractor_id: '',
  contractor_name: '',
  asset: '',
  job_area: '',
  assigned_to: '',
  auto_send_email: false,
  never_expire: false,
  status: 'active',
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
      event_start: schedule.event_start || '',
      event_end: schedule.event_end || '',
      recurrence: schedule.recurrence || 'one_time',
      contractor_id: schedule.contractor_id || '',
      contractor_name: schedule.contractor_name || '',
      asset: schedule.asset || '',
      job_area: schedule.job_area || '',
      assigned_to: schedule.assigned_to || '',
      auto_send_email: schedule.auto_send_email || false,
      never_expire: schedule.never_expire || false,
      status: schedule.status || 'active',
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
        documents: documentUrls.length > 0 ? documentUrls : undefined,
        photos: photoUrls.length > 0 ? photoUrls : undefined,
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
  const getContractorName = (contractorId) => contractors.find(c => c.id === contractorId)?.company_name || '';

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
        action={() => setShowDialog(true)}
        actionLabel="New Event"
      />

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
                <TableHead>Event Start</TableHead>
                <TableHead>Event End</TableHead>
                <TableHead>Recurrence</TableHead>
                <TableHead>Contractor</TableHead>
                <TableHead>Asset</TableHead>
                <TableHead>Auto Email</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredSchedules.map((schedule) => (
                <TableRow key={schedule.id}>
                  <TableCell className="font-medium">{schedule.subject}</TableCell>
                  <TableCell>{schedule.event_start && format(new Date(schedule.event_start), 'MMM d, yyyy')}</TableCell>
                  <TableCell>{schedule.event_end ? format(new Date(schedule.event_end), 'MMM d, yyyy') : 'Never Expires'}</TableCell>
                  <TableCell className="capitalize">{schedule.recurrence?.replace(/_/g, ' ')}</TableCell>
                  <TableCell>{schedule.contractor_name || getContractorName(schedule.contractor_id)}</TableCell>
                  <TableCell>{schedule.asset || '-'}</TableCell>
                  <TableCell>
                    <StatusBadge status={schedule.auto_send_email ? 'active' : 'inactive'} />
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setViewingSchedule(schedule)}>
                          <Eye className="mr-2 h-4 w-4" /> View Details
                        </DropdownMenuItem>
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
                  placeholder="AC - System maintenance"
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
                <Label htmlFor="event_start">Event Start *</Label>
                <Input
                  id="event_start"
                  type="date"
                  value={formData.event_start}
                  onChange={(e) => setFormData({ ...formData, event_start: e.target.value })}
                  required
                />
              </div>

              <div>
                <Label htmlFor="event_end">Event End</Label>
                <Input
                  id="event_end"
                  type="date"
                  value={formData.event_end}
                  onChange={(e) => setFormData({ ...formData, event_end: e.target.value })}
                  disabled={formData.never_expire}
                />
              </div>

              <div>
                <Label htmlFor="recurrence">Recurrence</Label>
                <Select value={formData.recurrence} onValueChange={(v) => setFormData({ ...formData, recurrence: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="one_time">One Time</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="bi_monthly">Bi Monthly</SelectItem>
                    <SelectItem value="quarterly">Quarterly</SelectItem>
                    <SelectItem value="half_yearly">Half Yearly</SelectItem>
                    <SelectItem value="yearly">Yearly</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="contractor_id">Contractor</Label>
                <Select value={formData.contractor_id} onValueChange={(v) => {
                  const contractor = contractors.find(c => c.id === v);
                  setFormData({ ...formData, contractor_id: v, contractor_name: contractor?.company_name || '' });
                }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select contractor" />
                  </SelectTrigger>
                  <SelectContent>
                    {contractors.map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.company_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="job_area">Job Area</Label>
                <Input
                  id="job_area"
                  value={formData.job_area}
                  onChange={(e) => setFormData({ ...formData, job_area: e.target.value })}
                  placeholder="Common Area"
                />
              </div>

              <div>
                <Label htmlFor="asset">Asset</Label>
                <Input
                  id="asset"
                  value={formData.asset}
                  onChange={(e) => setFormData({ ...formData, asset: e.target.value })}
                  placeholder="HVAC System"
                />
              </div>

              <div>
                <Label htmlFor="assigned_to">Assigned To</Label>
                <Input
                  id="assigned_to"
                  value={formData.assigned_to}
                  onChange={(e) => setFormData({ ...formData, assigned_to: e.target.value })}
                  placeholder="Staff member"
                />
              </div>

              <div className="md:col-span-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  placeholder="Detailed description of maintenance task"
                />
              </div>

              <div className="flex items-center gap-2">
                <Switch
                  checked={formData.auto_send_email}
                  onCheckedChange={(checked) => setFormData({ ...formData, auto_send_email: checked })}
                />
                <Label>Auto Send Email</Label>
              </div>

              <div className="flex items-center gap-2">
                <Switch
                  checked={formData.never_expire}
                  onCheckedChange={(checked) => setFormData({ ...formData, never_expire: checked, event_end: checked ? '' : formData.event_end })}
                />
                <Label>Never Expire</Label>
              </div>

              {/* Documents Upload */}
              <div className="md:col-span-2">
                <Label>Documents</Label>
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

              {/* Photos Upload */}
              <div className="md:col-span-2">
                <Label>Photos</Label>
                <div className="mt-2">
                  <Button type="button" variant="outline" className="w-full" asChild>
                    <label>
                      <ImageIcon className="h-4 w-4 mr-2" />
                      Upload Photos ({selectedPhotos.length})
                      <input
                        type="file"
                        multiple
                        accept="image/*"
                        className="hidden"
                        onChange={handlePhotoSelect}
                      />
                    </label>
                  </Button>
                  {selectedPhotos.length > 0 && (
                    <div className="grid grid-cols-4 gap-2 mt-2">
                      {selectedPhotos.map((file, idx) => (
                        <div key={idx} className="relative group">
                          <img 
                            src={URL.createObjectURL(file)} 
                            alt="" 
                            className="w-full h-20 object-cover rounded"
                          />
                          <button
                            type="button"
                            onClick={() => removePhoto(idx)}
                            className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X className="h-3 w-3" />
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

      {/* View Details Dialog */}
      {viewingSchedule && (
        <Dialog open={!!viewingSchedule} onOpenChange={() => setViewingSchedule(null)}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>View Maintenance Event</DialogTitle>
            </DialogHeader>
            <div className="space-y-6">
              {/* Event Information */}
              <div>
                <h3 className="font-semibold text-lg mb-3">Event Information</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-slate-500">Start Date:</span>
                    <p className="font-medium">{viewingSchedule.event_start && format(new Date(viewingSchedule.event_start), 'MMM d, yyyy')}</p>
                  </div>
                  <div>
                    <span className="text-slate-500">End Date:</span>
                    <p className="font-medium">{viewingSchedule.event_end ? format(new Date(viewingSchedule.event_end), 'MMM d, yyyy') : 'Never Expires'}</p>
                  </div>
                  <div>
                    <span className="text-slate-500">Frequency:</span>
                    <p className="font-medium capitalize">{viewingSchedule.recurrence?.replace(/_/g, ' ')}</p>
                  </div>
                  <div>
                    <span className="text-slate-500">Auto Send Email:</span>
                    <p className="font-medium">{viewingSchedule.auto_send_email ? 'Yes' : 'No'}</p>
                  </div>
                </div>
              </div>

              {/* Asset Information */}
              <div>
                <h3 className="font-semibold text-lg mb-3">Asset Information</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-slate-500">Job Area:</span>
                    <p className="font-medium">{viewingSchedule.job_area || '-'}</p>
                  </div>
                  <div>
                    <span className="text-slate-500">Asset:</span>
                    <p className="font-medium">{viewingSchedule.asset || '-'}</p>
                  </div>
                  <div>
                    <span className="text-slate-500">Assigned To:</span>
                    <p className="font-medium">{viewingSchedule.assigned_to || '-'}</p>
                  </div>
                </div>
              </div>

              {/* Job Information */}
              <div>
                <h3 className="font-semibold text-lg mb-3">Job Information</h3>
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="text-slate-500">Subject:</span>
                    <p className="font-medium">{viewingSchedule.subject}</p>
                  </div>
                  <div>
                    <span className="text-slate-500">Description:</span>
                    <p className="font-medium">{viewingSchedule.description || '-'}</p>
                  </div>
                </div>
              </div>

              {/* Documents */}
              {viewingSchedule.documents && viewingSchedule.documents.length > 0 && (
                <div>
                  <h3 className="font-semibold text-lg mb-3">Documents</h3>
                  <div className="space-y-2">
                    {viewingSchedule.documents.map((doc, idx) => (
                      <a
                        key={idx}
                        href={doc}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 p-2 bg-slate-50 rounded hover:bg-slate-100"
                      >
                        <FileText className="h-4 w-4 text-blue-600" />
                        <span className="text-sm">Document {idx + 1}</span>
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* Photos */}
              {viewingSchedule.photos && viewingSchedule.photos.length > 0 && (
                <div>
                  <h3 className="font-semibold text-lg mb-3">Photos</h3>
                  <div className="grid grid-cols-4 gap-2">
                    {viewingSchedule.photos.map((photo, idx) => (
                      <img
                        key={idx}
                        src={photo}
                        alt=""
                        className="w-full h-24 object-cover rounded cursor-pointer hover:opacity-75"
                        onClick={() => window.open(photo, '_blank')}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}