import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import StatusBadge from '@/components/common/StatusBadge';
import FaultReportingWizard from '@/components/resident/FaultReportingWizard';
import { 
  Home, 
  Wrench, 
  Bell, 
  FileText, 
  Plus, 
  Calendar,
  AlertCircle,
  Download,
  Eye,
  User,
  Building2,
  Clock,
  CheckCircle2
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

const categories = [
  { value: 'plumbing', label: 'Plumbing' },
  { value: 'electrical', label: 'Electrical' },
  { value: 'hvac', label: 'HVAC' },
  { value: 'appliance', label: 'Appliance' },
  { value: 'structural', label: 'Structural' },
  { value: 'pest_control', label: 'Pest Control' },
  { value: 'cleaning', label: 'Cleaning' },
  { value: 'other', label: 'Other' },
];

const priorityOptions = [
  { value: 'low', label: 'Low - Can wait', icon: Clock },
  { value: 'medium', label: 'Medium - Soon as possible', icon: AlertCircle },
  { value: 'high', label: 'High - Urgent', icon: AlertCircle },
  { value: 'urgent', label: 'Emergency', icon: AlertCircle },
];

export default function ResidentPortal() {
  const [user, setUser] = useState(null);
  const [resident, setResident] = useState(null);
  const [showRequestDialog, setShowRequestDialog] = useState(false);
  const [showWizard, setShowWizard] = useState(true);
  const [wizardData, setWizardData] = useState(null);
  const [selectedWorkOrder, setSelectedWorkOrder] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'other',
    priority: 'medium',
  });
  const [selectedPhotos, setSelectedPhotos] = useState([]);
  const [uploadingFiles, setUploadingFiles] = useState(false);

  const queryClient = useQueryClient();

  // Fetch user data
  useEffect(() => {
    base44.auth.me().then(userData => {
      setUser(userData);
    }).catch(() => {});
  }, []);

  // Fetch resident profile
  const { data: residents = [] } = useQuery({
    queryKey: ['residents', user?.email],
    queryFn: () => base44.entities.Resident.filter({ email: user?.email }),
    enabled: !!user?.email,
  });

  useEffect(() => {
    if (residents.length > 0) {
      setResident(residents[0]);
    }
  }, [residents]);

  // Fetch work orders for this resident
  const { data: workOrders = [] } = useQuery({
    queryKey: ['workOrders', user?.email],
    queryFn: () => base44.entities.WorkOrder.filter({ reported_by: user?.email }),
    enabled: !!user?.email,
  });

  // Fetch announcements for resident's building
  const { data: announcements = [] } = useQuery({
    queryKey: ['announcements', resident?.building_id],
    queryFn: async () => {
      const all = await base44.entities.Announcement.filter({ 
        building_id: resident?.building_id,
        status: 'published'
      });
      return all.filter(a => {
        const today = new Date();
        const publishDate = a.publish_date ? new Date(a.publish_date) : null;
        const expiryDate = a.expiry_date ? new Date(a.expiry_date) : null;
        
        const isPublished = !publishDate || publishDate <= today;
        const notExpired = !expiryDate || expiryDate >= today;
        
        return isPublished && notExpired;
      });
    },
    enabled: !!resident?.building_id,
  });

  // Fetch documents for resident's building
  const { data: documents = [] } = useQuery({
    queryKey: ['documents', resident?.building_id],
    queryFn: () => base44.entities.Document.filter({ 
      building_id: resident?.building_id,
      status: 'active'
    }),
    enabled: !!resident?.building_id,
  });

  // Fetch building info
  const { data: buildings = [] } = useQuery({
    queryKey: ['buildings'],
    queryFn: () => base44.entities.Building.list(),
  });

  // Fetch units
  const { data: units = [] } = useQuery({
    queryKey: ['units'],
    queryFn: () => base44.entities.Unit.list(),
  });

  const createWorkOrderMutation = useMutation({
    mutationFn: (data) => base44.entities.WorkOrder.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workOrders'] });
      setShowRequestDialog(false);
      setFormData({ title: '', description: '', category: 'other', priority: 'medium' });
      setSelectedPhotos([]);
      toast.success('Work order submitted successfully!');
    },
  });

  const handlePhotoSelect = (e) => {
    const files = Array.from(e.target.files || []);
    if (selectedPhotos.length + files.length > 5) {
      toast.error('Maximum 5 photos allowed');
      return;
    }
    setSelectedPhotos([...selectedPhotos, ...files]);
  };

  const removePhoto = (index) => {
    setSelectedPhotos(selectedPhotos.filter((_, i) => i !== index));
  };

  const handleProceedFromWizard = (data) => {
    setWizardData(data);
    setShowWizard(false);
    
    // Pre-populate form with wizard data
    if (data.type && data.item) {
      setFormData({
        ...formData,
        title: `${data.type} - ${data.item}`,
        description: data.requiresAssessment 
          ? `Issue: ${data.item}\n\nNote: This requires assessment to determine responsibility.` 
          : `Issue: ${data.item}`,
      });
    }
  };

  const handleSubmitRequest = async (e) => {
    e.preventDefault();
    
    if (!resident) {
      toast.error('Resident profile not found. Please contact management.');
      return;
    }

    setUploadingFiles(true);

    try {
      let photoUrls = [];

      if (selectedPhotos.length > 0) {
        const photoUploads = await Promise.all(
          selectedPhotos.map(file => base44.integrations.Core.UploadFile({ file }))
        );
        photoUrls = photoUploads.map(r => r.file_url);
      }

      const workOrderData = {
        building_id: resident.building_id,
        unit_id: resident.unit_id,
        title: formData.title,
        description: formData.description,
        category: formData.category,
        priority: formData.priority,
        status: 'open',
        reported_by: user.email,
        reported_by_name: user.full_name || `${resident.first_name} ${resident.last_name}`,
        photos: photoUrls.length > 0 ? photoUrls : undefined,
      };

      createWorkOrderMutation.mutate(workOrderData);
    } catch (error) {
      toast.error('Failed to submit request');
    } finally {
      setUploadingFiles(false);
    }
  };

  const getBuildingName = (buildingId) => buildings.find(b => b.id === buildingId)?.name || 'N/A';
  const getUnitNumber = (unitId) => units.find(u => u.id === unitId)?.unit_number || 'N/A';

  const statusCounts = {
    open: workOrders.filter(o => o.status === 'open').length,
    in_progress: workOrders.filter(o => o.status === 'in_progress').length,
    completed: workOrders.filter(o => o.status === 'completed').length,
  };

  const getAnnouncementTypeStyle = (type) => {
    const styles = {
      emergency: 'bg-red-50 border-red-200 text-red-700',
      maintenance: 'bg-orange-50 border-orange-200 text-orange-700',
      event: 'bg-purple-50 border-purple-200 text-purple-700',
      policy: 'bg-blue-50 border-blue-200 text-blue-700',
      general: 'bg-slate-50 border-slate-200 text-slate-700',
    };
    return styles[type] || styles.general;
  };

  const visibleDocuments = documents.filter(doc => 
    doc.visibility === 'public' || 
    doc.visibility === 'residents_only' ||
    (doc.visibility === 'owners_only' && resident?.resident_type === 'owner')
  );

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Card className="w-96 text-center p-8">
          <User className="h-12 w-12 mx-auto text-slate-400 mb-4" />
          <h3 className="text-lg font-semibold mb-2">Please Log In</h3>
          <p className="text-slate-600 mb-4">Access the resident portal to submit maintenance requests and view announcements.</p>
        </Card>
      </div>
    );
  }

  if (!resident) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Card className="w-96 text-center p-8">
          <AlertCircle className="h-12 w-12 mx-auto text-orange-500 mb-4" />
          <h3 className="text-lg font-semibold mb-2">Resident Profile Not Found</h3>
          <p className="text-slate-600">Please contact building management to set up your resident profile.</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl p-8 text-white">
        <h1 className="text-3xl font-bold mb-2">Welcome, {resident.first_name}!</h1>
        <div className="flex items-center gap-4 text-blue-100">
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            <span>{getBuildingName(resident.building_id)}</span>
          </div>
          <div className="flex items-center gap-2">
            <Home className="h-4 w-4" />
            <span>Unit {getUnitNumber(resident.unit_id)}</span>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-0 shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500 mb-1">Open Requests</p>
                <p className="text-3xl font-bold text-slate-900">{statusCounts.open}</p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-yellow-50 flex items-center justify-center">
                <Clock className="h-6 w-6 text-yellow-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500 mb-1">In Progress</p>
                <p className="text-3xl font-bold text-slate-900">{statusCounts.in_progress}</p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-blue-50 flex items-center justify-center">
                <Wrench className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500 mb-1">Completed</p>
                <p className="text-3xl font-bold text-slate-900">{statusCounts.completed}</p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-green-50 flex items-center justify-center">
                <CheckCircle2 className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="requests" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="requests">
            <Wrench className="h-4 w-4 mr-2" />
            My Requests
          </TabsTrigger>
          <TabsTrigger value="announcements">
            <Bell className="h-4 w-4 mr-2" />
            Announcements
          </TabsTrigger>
          <TabsTrigger value="documents">
            <FileText className="h-4 w-4 mr-2" />
            Documents
          </TabsTrigger>
        </TabsList>

        {/* Maintenance Requests Tab */}
        <TabsContent value="requests" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Maintenance Requests</h2>
            <Button onClick={() => setShowRequestDialog(true)} className="bg-blue-600 hover:bg-blue-700">
              <Plus className="h-4 w-4 mr-2" />
              Submit Request
            </Button>
          </div>

          {workOrders.length === 0 ? (
            <Card className="border-0 shadow-sm">
              <CardContent className="p-12 text-center">
                <Wrench className="h-12 w-12 mx-auto text-slate-300 mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Requests Yet</h3>
                <p className="text-slate-600 mb-4">Submit your first maintenance request to get started.</p>
                <Button onClick={() => setShowRequestDialog(true)} variant="outline">
                  <Plus className="h-4 w-4 mr-2" />
                  Submit Request
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {workOrders.map((order) => (
                <Card key={order.id} className="border-0 shadow-sm hover:shadow-md transition-shadow cursor-pointer" onClick={() => setSelectedWorkOrder(order)}>
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <StatusBadge status={order.status} />
                          <Badge variant="outline" className="capitalize">
                            {order.priority}
                          </Badge>
                        </div>
                        <h3 className="font-semibold text-lg text-slate-900 mb-1">{order.title}</h3>
                        <p className="text-sm text-slate-600 line-clamp-2">{order.description}</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-sm text-slate-500">
                      <div className="flex items-center gap-4">
                        <span className="capitalize">{order.category?.replace(/_/g, ' ')}</span>
                        {order.due_date && (
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {format(new Date(order.due_date), 'MMM d')}
                          </span>
                        )}
                      </div>
                      <span>Submitted {format(new Date(order.created_date), 'MMM d, yyyy')}</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Announcements Tab */}
        <TabsContent value="announcements" className="space-y-4">
          <h2 className="text-xl font-semibold">Building Announcements</h2>

          {announcements.length === 0 ? (
            <Card className="border-0 shadow-sm">
              <CardContent className="p-12 text-center">
                <Bell className="h-12 w-12 mx-auto text-slate-300 mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Announcements</h3>
                <p className="text-slate-600">There are currently no announcements for your building.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {announcements.map((announcement) => (
                <Card key={announcement.id} className={`border ${getAnnouncementTypeStyle(announcement.type)}`}>
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant="outline" className="capitalize">
                            {announcement.type}
                          </Badge>
                          {announcement.priority === 'urgent' && (
                            <Badge className="bg-red-600">Urgent</Badge>
                          )}
                        </div>
                        <h3 className="font-semibold text-lg mb-2">{announcement.title}</h3>
                        <div className="prose prose-sm max-w-none text-slate-700" 
                             dangerouslySetInnerHTML={{ __html: announcement.content }} />
                        {announcement.attachments && announcement.attachments.length > 0 && (
                          <div className="mt-4 flex flex-wrap gap-2">
                            {announcement.attachments.map((url, idx) => (
                              <a
                                key={idx}
                                href={url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-sm text-blue-600 hover:underline flex items-center gap-1"
                              >
                                <FileText className="h-3 w-3" />
                                Attachment {idx + 1}
                              </a>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="text-xs text-slate-500">
                        {announcement.publish_date && format(new Date(announcement.publish_date), 'MMM d, yyyy')}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Documents Tab */}
        <TabsContent value="documents" className="space-y-4">
          <h2 className="text-xl font-semibold">Building Documents</h2>

          {visibleDocuments.length === 0 ? (
            <Card className="border-0 shadow-sm">
              <CardContent className="p-12 text-center">
                <FileText className="h-12 w-12 mx-auto text-slate-300 mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Documents</h3>
                <p className="text-slate-600">There are currently no documents available.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {visibleDocuments.map((doc) => (
                <Card key={doc.id} className="border-0 shadow-sm hover:shadow-md transition-shadow">
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <Badge variant="outline" className="mb-2 capitalize">
                          {doc.category?.replace(/_/g, ' ')}
                        </Badge>
                        <h3 className="font-semibold text-slate-900 mb-1">{doc.title}</h3>
                        {doc.description && (
                          <p className="text-sm text-slate-600 mb-3 line-clamp-2">{doc.description}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-slate-500">
                        {doc.file_type?.toUpperCase()} • {doc.file_size ? `${(doc.file_size / 1024).toFixed(0)}KB` : 'N/A'}
                      </span>
                      {doc.file_url && (
                        <a
                          href={doc.file_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-700"
                        >
                          <Button variant="ghost" size="sm">
                            <Download className="h-4 w-4 mr-2" />
                            Download
                          </Button>
                        </a>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Submit Request Dialog */}
      <Dialog open={showRequestDialog} onOpenChange={(open) => {
        setShowRequestDialog(open);
        if (!open) {
          setShowWizard(true);
          setWizardData(null);
          setFormData({ title: '', description: '', category: 'other', priority: 'medium' });
          setSelectedPhotos([]);
        }
      }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Submit Maintenance Request</DialogTitle>
          </DialogHeader>
          
          {showWizard ? (
            <FaultReportingWizard onProceedToReport={handleProceedFromWizard} />
          ) : (
            <form onSubmit={handleSubmitRequest} className="space-y-4">
            <div>
              <Label htmlFor="title">Issue Title *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Brief description of the issue"
                required
              />
            </div>

            <div>
              <Label htmlFor="category">Category *</Label>
              <Select value={formData.category} onValueChange={(v) => setFormData({ ...formData, category: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {categories.map(c => (
                    <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="priority">Priority *</Label>
              <Select value={formData.priority} onValueChange={(v) => setFormData({ ...formData, priority: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {priorityOptions.map(p => (
                    <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="description">Detailed Description *</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={4}
                placeholder="Please provide as much detail as possible about the issue..."
                required
              />
            </div>

            <div>
              <Label>Photos (Optional, Max 5)</Label>
              <div className="mt-2">
                <Button type="button" variant="outline" className="w-full" asChild>
                  <label>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Photos ({selectedPhotos.length}/5)
                    <input
                      type="file"
                      multiple
                      accept="image/*"
                      className="hidden"
                      onChange={handlePhotoSelect}
                      disabled={selectedPhotos.length >= 5}
                    />
                  </label>
                </Button>
                {selectedPhotos.length > 0 && (
                  <div className="grid grid-cols-3 gap-2 mt-3">
                    {selectedPhotos.map((file, idx) => (
                      <div key={idx} className="relative group">
                        <img 
                          src={URL.createObjectURL(file)} 
                          alt="" 
                          className="w-full h-24 object-cover rounded border"
                        />
                        <button
                          type="button"
                          onClick={() => removePhoto(idx)}
                          className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-800">
                <strong>Request Details:</strong><br />
                Building: {getBuildingName(resident.building_id)}<br />
                Unit: {getUnitNumber(resident.unit_id)}
              </p>
            </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setShowWizard(true)}>
                  Back to Responsibility Check
                </Button>
                <Button type="button" variant="outline" onClick={() => setShowRequestDialog(false)}>
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  className="bg-blue-600 hover:bg-blue-700"
                  disabled={createWorkOrderMutation.isPending || uploadingFiles}
                >
                  {uploadingFiles ? 'Uploading...' : createWorkOrderMutation.isPending ? 'Submitting...' : 'Submit Request'}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Work Order Detail Dialog */}
      {selectedWorkOrder && (
        <Dialog open={!!selectedWorkOrder} onOpenChange={() => setSelectedWorkOrder(null)}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Request Details</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <StatusBadge status={selectedWorkOrder.status} />
                <Badge variant="outline" className="capitalize">{selectedWorkOrder.priority}</Badge>
                <Badge variant="outline" className="capitalize">{selectedWorkOrder.category?.replace(/_/g, ' ')}</Badge>
              </div>

              <div>
                <h3 className="font-semibold text-xl mb-2">{selectedWorkOrder.title}</h3>
                <p className="text-slate-600">{selectedWorkOrder.description}</p>
              </div>

              <div className="grid grid-cols-2 gap-4 p-4 bg-slate-50 rounded-lg">
                <div>
                  <p className="text-xs text-slate-500 mb-1">Submitted</p>
                  <p className="font-medium">{format(new Date(selectedWorkOrder.created_date), 'MMM d, yyyy h:mm a')}</p>
                </div>
                {selectedWorkOrder.due_date && (
                  <div>
                    <p className="text-xs text-slate-500 mb-1">Due Date</p>
                    <p className="font-medium">{format(new Date(selectedWorkOrder.due_date), 'MMM d, yyyy')}</p>
                  </div>
                )}
                {selectedWorkOrder.assigned_to && (
                  <div>
                    <p className="text-xs text-slate-500 mb-1">Assigned To</p>
                    <p className="font-medium">{selectedWorkOrder.assigned_to}</p>
                  </div>
                )}
                {selectedWorkOrder.completed_date && (
                  <div>
                    <p className="text-xs text-slate-500 mb-1">Completed</p>
                    <p className="font-medium">{format(new Date(selectedWorkOrder.completed_date), 'MMM d, yyyy')}</p>
                  </div>
                )}
              </div>

              {selectedWorkOrder.photos && selectedWorkOrder.photos.length > 0 && (
                <div>
                  <h4 className="font-semibold mb-2">Photos</h4>
                  <div className="grid grid-cols-3 gap-2">
                    {selectedWorkOrder.photos.map((url, idx) => (
                      <a key={idx} href={url} target="_blank" rel="noopener noreferrer">
                        <img src={url} alt="" className="w-full h-24 object-cover rounded border hover:opacity-75 transition-opacity" />
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {selectedWorkOrder.resolution_notes && (
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                  <h4 className="font-semibold text-green-900 mb-2">Resolution Notes</h4>
                  <p className="text-sm text-green-800">{selectedWorkOrder.resolution_notes}</p>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}