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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import PageHeader from '@/components/common/PageHeader';
import EmptyState from '@/components/common/EmptyState';
import StatusBadge from '@/components/common/StatusBadge';
import WorkOrderDetail from '@/components/workorders/WorkOrderDetail';
import KanbanBoard from '@/components/workorders/KanbanBoard';
import RatingDialog from '@/components/workorders/RatingDialog';
import AISchedulingAssistant from '@/components/workorders/AISchedulingAssistant';
import DescriptionAIAssistant from '@/components/workorders/DescriptionAIAssistant';
import ResponsibilityLookup from '@/components/workorders/ResponsibilityLookup';
import { Wrench, Search, Building2, AlertCircle, Clock, CheckCircle2, XCircle, MoreVertical, Pencil, Trash2, Calendar, User, Eye, Upload, Image as ImageIcon, Video, X, LayoutGrid, List, Star, Repeat, Sparkles, Home } from 'lucide-react';
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

const categories = [
  { value: 'plumbing', label: 'Plumbing' },
  { value: 'electrical', label: 'Electrical' },
  { value: 'hvac', label: 'HVAC' },
  { value: 'appliance', label: 'Appliance' },
  { value: 'structural', label: 'Structural' },
  { value: 'pest_control', label: 'Pest Control' },
  { value: 'cleaning', label: 'Cleaning' },
  { value: 'landscaping', label: 'Landscaping' },
  { value: 'security', label: 'Security' },
  { value: 'other', label: 'Other' },
];

const initialFormState = {
  building_id: '',
  unit_id: '',
  is_common_area: false,
  title: '',
  description: '',
  category: 'other',
  priority: 'medium',
  status: 'open',
  reported_by_name: '',
  assigned_to: '',
  assigned_contractor_id: '',
  due_date: '',
  estimated_cost: '',
  actual_cost: '',
  notes: '',
  is_recurring: false,
  recurrence_pattern: 'monthly',
  recurrence_end_date: '',
};

export default function WorkOrders() {
  const [showDialog, setShowDialog] = useState(false);
  const [editingOrder, setEditingOrder] = useState(null);
  const [formData, setFormData] = useState(initialFormState);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterPriority, setFilterPriority] = useState('all');
  const [deleteOrder, setDeleteOrder] = useState(null);
  const [viewingOrder, setViewingOrder] = useState(null);
  const [uploadingFiles, setUploadingFiles] = useState(false);
  const [selectedPhotos, setSelectedPhotos] = useState([]);
  const [selectedVideos, setSelectedVideos] = useState([]);
  const [viewMode, setViewMode] = useState('grid');
  const [ratingOrder, setRatingOrder] = useState(null);
  const [showAIAssistant, setShowAIAssistant] = useState(false);
  const [selectedQuotes, setSelectedQuotes] = useState([]);
  const [selectedInvoices, setSelectedInvoices] = useState([]);

  const queryClient = useQueryClient();

  const { data: workOrders = [], isLoading } = useQuery({
    queryKey: ['workOrders'],
    queryFn: () => base44.entities.WorkOrder.list('-created_date'),
  });

  const { data: buildings = [] } = useQuery({
    queryKey: ['buildings'],
    queryFn: () => base44.entities.Building.list(),
  });

  const { data: units = [] } = useQuery({
    queryKey: ['units'],
    queryFn: () => base44.entities.Unit.list(),
  });

  const { data: contractors = [] } = useQuery({
    queryKey: ['contractors'],
    queryFn: () => base44.entities.Contractor.list(),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.WorkOrder.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workOrders'] });
      handleCloseDialog();
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data, previousData }) => {
      const result = await base44.entities.WorkOrder.update(id, data);
      
      // Send notifications for contractor assignment or status change
      if (previousData) {
        const contractorChanged = data.assigned_contractor_id && 
                                  data.assigned_contractor_id !== previousData.assigned_contractor_id;
        const statusChanged = data.status !== previousData.status;

        if (contractorChanged) {
          await base44.functions.invoke('notifyWorkOrderAssignment', {
            workOrderId: id,
            contractorId: data.assigned_contractor_id,
            action: 'assigned'
          });
        }
        
        if (statusChanged) {
          await base44.functions.invoke('notifyWorkOrderAssignment', {
            workOrderId: id,
            action: 'status_changed'
          });
        }
      }
      
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workOrders'] });
      handleCloseDialog();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.WorkOrder.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workOrders'] });
      setDeleteOrder(null);
    },
  });

  const handleCloseDialog = () => {
    setShowDialog(false);
    setEditingOrder(null);
    setFormData(initialFormState);
    setSelectedPhotos([]);
    setSelectedVideos([]);
    setSelectedQuotes([]);
    setSelectedInvoices([]);
  };

  const handleEdit = (order) => {
    setEditingOrder(order);
    setFormData({
      building_id: order.building_id || '',
      unit_id: order.unit_id || '',
      title: order.title || '',
      description: order.description || '',
      category: order.category || 'other',
      priority: order.priority || 'medium',
      status: order.status || 'open',
      reported_by_name: order.reported_by_name || '',
      assigned_to: order.assigned_to || '',
      assigned_contractor_id: order.assigned_contractor_id || '',
      due_date: order.due_date || '',
      estimated_cost: order.estimated_cost || '',
      actual_cost: order.actual_cost || '',
      notes: order.notes || '',
      is_common_area: order.is_common_area || false,
      is_recurring: order.is_recurring || false,
      recurrence_pattern: order.recurrence_pattern || 'monthly',
      recurrence_end_date: order.recurrence_end_date || '',
    });
    setSelectedPhotos([]);
    setSelectedVideos([]);
    setSelectedQuotes([]);
    setSelectedInvoices([]);
    setShowDialog(true);
  };

  const handleStatusChange = (order, newStatus) => {
    const updateData = { ...order, status: newStatus };
    if (newStatus === 'completed' && !order.completed_date) {
      updateData.completed_date = new Date().toISOString().split('T')[0];
    }
    updateMutation.mutate({ id: order.id, data: updateData, previousData: order });
  };

  const handleRatingSubmit = (orderId, ratingData) => {
    const order = workOrders.find(o => o.id === orderId);
    updateMutation.mutate({ id: orderId, data: { ...order, ...ratingData } });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setUploadingFiles(true);

    try {
      let photoUrls = [];
      let videoUrls = [];
      let quoteUrls = [];
      let invoiceUrls = [];

      if (selectedPhotos.length > 0) {
        const photoUploads = await Promise.all(
          selectedPhotos.map(file => base44.integrations.Core.UploadFile({ file }))
        );
        photoUrls = photoUploads.map(r => r.file_url);
      }

      if (selectedVideos.length > 0) {
        const videoUploads = await Promise.all(
          selectedVideos.map(file => base44.integrations.Core.UploadFile({ file }))
        );
        videoUrls = videoUploads.map(r => r.file_url);
      }

      if (selectedQuotes.length > 0) {
        const quoteUploads = await Promise.all(
          selectedQuotes.map(file => base44.integrations.Core.UploadFile({ file }))
        );
        quoteUrls = quoteUploads.map(r => r.file_url);
      }

      if (selectedInvoices.length > 0) {
        const invoiceUploads = await Promise.all(
          selectedInvoices.map(file => base44.integrations.Core.UploadFile({ file }))
        );
        invoiceUrls = invoiceUploads.map(r => r.file_url);
      }

      const data = {
        ...formData,
        estimated_cost: formData.estimated_cost ? Number(formData.estimated_cost) : null,
        actual_cost: formData.actual_cost ? Number(formData.actual_cost) : null,
        photos: photoUrls.length > 0 ? photoUrls : editingOrder?.photos || undefined,
        videos: videoUrls.length > 0 ? videoUrls : editingOrder?.videos || undefined,
        quotes: quoteUrls.length > 0 ? quoteUrls : editingOrder?.quotes || undefined,
        invoices: invoiceUrls.length > 0 ? invoiceUrls : editingOrder?.invoices || undefined,
      };

      if (editingOrder) {
        // Check for contractor assignment change
        const contractorChanged = data.assigned_contractor_id && 
                                  data.assigned_contractor_id !== editingOrder.assigned_contractor_id;
        
        await updateMutation.mutateAsync({ 
          id: editingOrder.id, 
          data,
          previousData: editingOrder 
        });
        
        // Handle maintenance schedule for recurring work orders
        if (data.is_recurring) {
          await handleMaintenanceScheduleSync(editingOrder.id, data);
        } else {
          // If changed from recurring to non-recurring, remove linked maintenance schedule
          await removeMaintenanceSchedule(editingOrder.id);
        }
        
        queryClient.invalidateQueries({ queryKey: ['workOrders'] });
        queryClient.invalidateQueries({ queryKey: ['maintenanceSchedules'] });
        handleCloseDialog();
      } else {
        const createdOrder = await base44.entities.WorkOrder.create(data);
        
        // Process quotes if any
        if (quoteUrls.length > 0 && createdOrder.id) {
          for (const quoteUrl of quoteUrls) {
            try {
              const { data: quoteSummary } = await base44.functions.invoke('summarizeQuote', { file_url: quoteUrl });
              if (quoteSummary?.summary) {
                await base44.entities.WorkOrder.update(createdOrder.id, { 
                  description: `${createdOrder.description || ''}\n\nQuote Summary:\n${quoteSummary.summary}` 
                });
              }
            } catch (err) {
              console.error('Failed to summarize quote:', err);
            }
          }
        }

        // Process invoices if any
        if (invoiceUrls.length > 0 && createdOrder.id && createdOrder.building_id) {
          for (const invoiceUrl of invoiceUrls) {
            try {
              const { data: invoiceData } = await base44.functions.invoke('processInvoice', { file_url: invoiceUrl });
              if (invoiceData?.extracted_data) {
                const extracted = invoiceData.extracted_data;
                await base44.entities.WorkOrder.update(createdOrder.id, {
                  actual_cost: extracted.total_amount || createdOrder.actual_cost
                });
                await base44.functions.invoke('sendInvoiceToStrata', {
                  buildingId: createdOrder.building_id,
                  invoiceFileUrl: invoiceUrl,
                  workOrderTitle: createdOrder.title,
                  invoiceNumber: extracted.invoice_number,
                  totalAmount: extracted.total_amount,
                });
              }
            } catch (err) {
              console.error('Failed to process invoice:', err);
            }
          }
        }
        
        // Send notification if contractor assigned on creation
        if (data.assigned_contractor_id && createdOrder.id) {
          await base44.functions.invoke('notifyWorkOrderAssignment', {
            workOrderId: createdOrder.id,
            contractorId: data.assigned_contractor_id,
            action: 'assigned'
          });
        }
        
        // Create maintenance schedule if recurring
        if (data.is_recurring && createdOrder.id) {
          await handleMaintenanceScheduleSync(createdOrder.id, data);
        }
        
        queryClient.invalidateQueries({ queryKey: ['workOrders'] });
        queryClient.invalidateQueries({ queryKey: ['maintenanceSchedules'] });
        handleCloseDialog();
      }
    } catch (error) {
      console.error('Operation failed:', error);
    } finally {
      setUploadingFiles(false);
    }
  };

  const handleMaintenanceScheduleSync = async (workOrderId, workOrderData) => {
    try {
      // Check if maintenance schedule already exists for this work order
      const existingSchedules = await base44.entities.MaintenanceSchedule.filter({ 
        work_order_id: workOrderId 
      });

      const recurrenceMap = {
        daily: 'one_time',
        weekly: 'one_time',
        monthly: 'monthly',
        quarterly: 'quarterly',
        yearly: 'yearly'
      };

      const scheduleData = {
        building_id: workOrderData.building_id,
        subject: workOrderData.title,
        description: workOrderData.description || '',
        event_start: workOrderData.due_date || new Date().toISOString().split('T')[0],
        event_end: workOrderData.recurrence_end_date || null,
        recurrence: recurrenceMap[workOrderData.recurrence_pattern] || 'monthly',
        contractor_id: workOrderData.assigned_contractor_id || null,
        assigned_to: workOrderData.assigned_to || null,
        never_expire: !workOrderData.recurrence_end_date,
        status: 'active',
        work_order_id: workOrderId
      };

      if (existingSchedules && existingSchedules.length > 0) {
        // Update existing schedule
        await base44.entities.MaintenanceSchedule.update(existingSchedules[0].id, scheduleData);
      } else {
        // Create new schedule
        await base44.entities.MaintenanceSchedule.create(scheduleData);
      }
    } catch (error) {
      console.error('Failed to sync maintenance schedule:', error);
    }
  };

  const removeMaintenanceSchedule = async (workOrderId) => {
    try {
      const existingSchedules = await base44.entities.MaintenanceSchedule.filter({ 
        work_order_id: workOrderId 
      });
      
      if (existingSchedules && existingSchedules.length > 0) {
        await base44.entities.MaintenanceSchedule.delete(existingSchedules[0].id);
      }
    } catch (error) {
      console.error('Failed to remove maintenance schedule:', error);
    }
  };

  const handlePhotoSelect = (e) => {
    const files = Array.from(e.target.files || []);
    if (selectedPhotos.length + files.length > 12) {
      alert('Maximum 12 photos allowed');
      return;
    }
    setSelectedPhotos([...selectedPhotos, ...files]);
  };

  const handleVideoSelect = (e) => {
    const files = Array.from(e.target.files || []);
    setSelectedVideos([...selectedVideos, ...files]);
  };

  const removePhoto = (index) => {
    setSelectedPhotos(selectedPhotos.filter((_, i) => i !== index));
  };

  const removeVideo = (index) => {
    setSelectedVideos(selectedVideos.filter((_, i) => i !== index));
  };

  const handleQuoteSelect = (e) => {
    const files = Array.from(e.target.files || []);
    setSelectedQuotes([...selectedQuotes, ...files]);
  };

  const removeQuote = (index) => {
    setSelectedQuotes(selectedQuotes.filter((_, i) => i !== index));
  };

  const handleInvoiceSelect = (e) => {
    const files = Array.from(e.target.files || []);
    setSelectedInvoices([...selectedInvoices, ...files]);
  };

  const removeInvoice = (index) => {
    setSelectedInvoices(selectedInvoices.filter((_, i) => i !== index));
  };

  const getBuildingName = (buildingId) => buildings.find(b => b.id === buildingId)?.name || 'Unknown';
  const getUnitNumber = (unitId) => units.find(u => u.id === unitId)?.unit_number || '';
  const getFilteredUnits = () => units.filter(u => u.building_id === formData.building_id);

  const filteredOrders = workOrders.filter(order => {
    const matchesSearch = order.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         order.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = filterStatus === 'all' || order.status === filterStatus;
    const matchesPriority = filterPriority === 'all' || order.priority === filterPriority;
    return matchesSearch && matchesStatus && matchesPriority;
  });

  const statusCounts = {
    all: workOrders.length,
    open: workOrders.filter(o => o.status === 'open').length,
    in_progress: workOrders.filter(o => o.status === 'in_progress').length,
    completed: workOrders.filter(o => o.status === 'completed').length,
  };

  const priorityIcons = {
    urgent: <AlertCircle className="h-4 w-4 text-red-500" />,
    high: <AlertCircle className="h-4 w-4 text-orange-500" />,
    medium: <Clock className="h-4 w-4 text-blue-500" />,
    low: <Clock className="h-4 w-4 text-slate-400" />,
  };

  if (isLoading) {
    return (
      <div className="space-y-8">
        <PageHeader title="Work Orders" subtitle="Manage maintenance requests" />
        <Skeleton className="h-96 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Work Orders" 
        subtitle={`${statusCounts.open} open, ${statusCounts.in_progress} in progress`}
        action={() => setShowDialog(true)}
        actionLabel="Create Work Order"
      >
        <div className="flex items-center gap-2">
          <ResponsibilityLookup />
          <div className="flex items-center gap-2 bg-slate-100 rounded-lg p-1">
            <Button
              variant={viewMode === 'grid' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('grid')}
              className="h-8"
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'kanban' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('kanban')}
              className="h-8"
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </PageHeader>

      {/* Filters */}
      <div className="flex flex-wrap gap-4">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search work orders..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="All Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status ({statusCounts.all})</SelectItem>
            <SelectItem value="open">Open ({statusCounts.open})</SelectItem>
            <SelectItem value="in_progress">In Progress ({statusCounts.in_progress})</SelectItem>
            <SelectItem value="completed">Completed ({statusCounts.completed})</SelectItem>
            <SelectItem value="on_hold">On Hold</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterPriority} onValueChange={setFilterPriority}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="All Priority" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Priority</SelectItem>
            <SelectItem value="urgent">Urgent</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="low">Low</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {filteredOrders.length === 0 ? (
        <EmptyState
          icon={Wrench}
          title="No work orders found"
          description="Create a work order to track maintenance requests"
          action={() => setShowDialog(true)}
          actionLabel="Create Work Order"
        />
      ) : viewMode === 'kanban' ? (
        <KanbanBoard
          workOrders={filteredOrders}
          buildings={buildings}
          units={units}
          onViewDetails={setViewingOrder}
          onStatusChange={handleStatusChange}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredOrders.map((order) => (
            <Card key={order.id} className="group border-0 shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden">
              <div className={`h-1.5 w-full ${
                order.priority === 'urgent' ? 'bg-gradient-to-r from-red-500 to-red-600' :
                order.priority === 'high' ? 'bg-gradient-to-r from-orange-500 to-orange-600' :
                order.priority === 'medium' ? 'bg-gradient-to-r from-blue-500 to-blue-600' : 
                'bg-gradient-to-r from-slate-400 to-slate-500'
              }`} />
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <StatusBadge status={order.status} />
                    <Badge 
                      variant="outline" 
                      className={`capitalize font-medium ${
                        order.priority === 'urgent' ? 'border-red-300 text-red-700 bg-red-50' :
                        order.priority === 'high' ? 'border-orange-300 text-orange-700 bg-orange-50' :
                        order.priority === 'medium' ? 'border-blue-300 text-blue-700 bg-blue-50' :
                        'border-slate-300 text-slate-700 bg-slate-50'
                      }`}
                    >
                      {order.priority}
                    </Badge>
                    {order.is_recurring && (
                      <Badge className="bg-purple-100 text-purple-700 border border-purple-200">
                        <Repeat className="h-3 w-3 mr-1" />
                        Recurring
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
                      <DropdownMenuItem onClick={() => setViewingOrder(order)}>
                        <Eye className="mr-2 h-4 w-4" /> View Details
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => { setViewingOrder(order); setShowAIAssistant(true); }}>
                        <Sparkles className="mr-2 h-4 w-4" /> AI Insights
                      </DropdownMenuItem>
                      {order.status === 'completed' && (
                        <DropdownMenuItem onClick={() => setRatingOrder(order)}>
                          <Star className="mr-2 h-4 w-4" /> Rate Work
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem onClick={() => handleEdit(order)}>
                        <Pencil className="mr-2 h-4 w-4" /> Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setDeleteOrder(order)} className="text-red-600">
                        <Trash2 className="mr-2 h-4 w-4" /> Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                <h3 className="font-bold text-lg text-slate-900 mb-2 line-clamp-2 group-hover:text-blue-700 transition-colors leading-tight">
                  {order.title}
                </h3>
                <p className="text-sm text-slate-600 mb-4 line-clamp-2 leading-relaxed">
                  {order.description || 'No description'}
                </p>

                <div className="space-y-2.5 mb-4">
                  <div className="flex items-center gap-2 text-xs bg-slate-50 px-3 py-2 rounded-lg">
                    <Building2 className="h-3.5 w-3.5 text-slate-500 flex-shrink-0" />
                    <span className="text-slate-700 font-medium truncate">
                      {getBuildingName(order.building_id)}
                      {order.unit_id && <span className="text-slate-500"> • Unit {getUnitNumber(order.unit_id)}</span>}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-2 text-xs bg-slate-50 px-3 py-2 rounded-lg">
                    <Wrench className="h-3.5 w-3.5 text-slate-500 flex-shrink-0" />
                    <span className="capitalize text-slate-700">{order.category?.replace(/_/g, ' ')}</span>
                  </div>

                  {order.due_date && (
                    <div className="flex items-center gap-2 text-xs bg-orange-50 px-3 py-2 rounded-lg">
                      <Calendar className="h-3.5 w-3.5 text-orange-600 flex-shrink-0" />
                      <span className="text-orange-700 font-medium">
                        Due {format(new Date(order.due_date), 'MMM d, yyyy')}
                      </span>
                    </div>
                  )}

                  {order.assigned_to && (
                    <div className="flex items-center gap-2 text-xs bg-blue-50 px-3 py-2 rounded-lg">
                      <User className="h-3.5 w-3.5 text-blue-600 flex-shrink-0" />
                      <span className="text-slate-700 font-medium truncate">{order.assigned_to}</span>
                    </div>
                  )}

                  {order.assigned_contractor_id && (
                    <div className="flex items-center gap-2 text-xs bg-indigo-50 px-3 py-2 rounded-lg">
                      <Wrench className="h-3.5 w-3.5 text-indigo-600 flex-shrink-0" />
                      <span className="text-indigo-700 font-medium truncate">
                        {contractors.find(c => c.id === order.assigned_contractor_id)?.company_name || 'Contractor'}
                      </span>
                    </div>
                  )}
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs text-slate-500">
                    <Clock className="h-3 w-3" />
                    <span>{order.created_date && format(new Date(order.created_date), 'MMM d, yyyy')}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    {order.rating && (
                      <div className="flex items-center gap-1 text-amber-500">
                        <Star className="h-3.5 w-3.5 fill-amber-500" />
                        <span className="text-xs font-semibold text-slate-700">{order.rating}</span>
                      </div>
                    )}
                    {order.estimated_cost && (
                      <span className="text-sm font-bold text-slate-900">${order.estimated_cost.toLocaleString()}</span>
                    )}
                    {order.completed_date && (
                      <div className="flex items-center gap-1 text-green-600">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader className="border-b pb-4">
            <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              {editingOrder ? 'Edit Work Order' : 'Create Work Order'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-6 pt-2">
            {/* Basic Information Card */}
            <Card className="border-2 border-blue-100 shadow-sm">
              <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Wrench className="h-5 w-5 text-blue-600" />
                  Work Order Details
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6 space-y-4">
                <div className="md:col-span-2">
                  <Label htmlFor="title" className="text-sm font-semibold">Title *</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="Brief description of the issue"
                    required
                    className="mt-1.5"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="building_id" className="text-sm font-semibold">Building *</Label>
                    <Select value={formData.building_id} onValueChange={(v) => setFormData({ ...formData, building_id: v, unit_id: '', is_common_area: false })}>
                      <SelectTrigger className="mt-1.5">
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
                    <div className="flex items-center space-x-2 mb-2">
                      <Checkbox
                        id="is_common_area"
                        checked={formData.is_common_area}
                        onCheckedChange={(checked) => setFormData({ ...formData, is_common_area: checked, unit_id: '' })}
                        disabled={!formData.building_id}
                      />
                      <Label htmlFor="is_common_area" className="cursor-pointer text-sm font-medium">Common Area</Label>
                    </div>
                    {!formData.is_common_area && (
                      <>
                        <Label htmlFor="unit_id" className="text-sm font-semibold">Unit</Label>
                        <Select value={formData.unit_id} onValueChange={(v) => setFormData({ ...formData, unit_id: v })} disabled={!formData.building_id}>
                          <SelectTrigger className="mt-1.5">
                            <SelectValue placeholder="Select unit (optional)" />
                          </SelectTrigger>
                          <SelectContent>
                            {getFilteredUnits().map(u => (
                              <SelectItem key={u.id} value={u.id}>Unit {u.unit_number}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="category" className="text-sm font-semibold">Category *</Label>
                    <Select value={formData.category} onValueChange={(v) => setFormData({ ...formData, category: v })}>
                      <SelectTrigger className="mt-1.5">
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
                    <Label htmlFor="priority" className="text-sm font-semibold">Priority</Label>
                    <Select value={formData.priority} onValueChange={(v) => setFormData({ ...formData, priority: v })}>
                      <SelectTrigger className="mt-1.5">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">
                          <div className="flex items-center gap-2">
                            <div className="h-2 w-2 rounded-full bg-slate-400" />
                            Low
                          </div>
                        </SelectItem>
                        <SelectItem value="medium">
                          <div className="flex items-center gap-2">
                            <div className="h-2 w-2 rounded-full bg-blue-500" />
                            Medium
                          </div>
                        </SelectItem>
                        <SelectItem value="high">
                          <div className="flex items-center gap-2">
                            <div className="h-2 w-2 rounded-full bg-orange-500" />
                            High
                          </div>
                        </SelectItem>
                        <SelectItem value="urgent">
                          <div className="flex items-center gap-2">
                            <div className="h-2 w-2 rounded-full bg-red-500" />
                            Urgent
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="status" className="text-sm font-semibold">Status</Label>
                    <Select value={formData.status} onValueChange={(v) => setFormData({ ...formData, status: v })}>
                      <SelectTrigger className="mt-1.5">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="open">Open</SelectItem>
                        <SelectItem value="in_progress">In Progress</SelectItem>
                        <SelectItem value="on_hold">On Hold</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                        <SelectItem value="cancelled">Cancelled</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="due_date" className="text-sm font-semibold">Due Date</Label>
                    <Input
                      id="due_date"
                      type="date"
                      value={formData.due_date}
                      onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                      className="mt-1.5"
                    />
                  </div>
                </div>

                <div className="pt-2">
                  <Label htmlFor="description" className="text-sm font-semibold">Description</Label>
                  <div className="mt-2">
                    <DescriptionAIAssistant
                      title={formData.title}
                      category={formData.category}
                      selectedPhotos={selectedPhotos}
                      selectedVideos={selectedVideos}
                      currentDescription={formData.description}
                      onDescriptionGenerated={(desc) => setFormData({ ...formData, description: desc })}
                      onTitleGenerated={(title) => setFormData({ ...formData, title: title })}
                      generateTitle={!editingOrder}
                    />
                  </div>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={4}
                    placeholder="Detailed description of the issue"
                    className="mt-2"
                  />
                </div>

                <div>
                  <Label htmlFor="notes" className="text-sm font-semibold">Additional Notes</Label>
                  <Textarea
                    id="notes"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    rows={2}
                    placeholder="Any additional information"
                    className="mt-1.5"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Assignment Card */}
            <Card className="border-2 border-indigo-100 shadow-sm">
              <CardHeader className="bg-gradient-to-r from-indigo-50 to-purple-50 border-b">
                <CardTitle className="text-lg flex items-center gap-2">
                  <User className="h-5 w-5 text-indigo-600" />
                  Assignment & Responsibility
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="reported_by_name" className="text-sm font-semibold">Reported By</Label>
                    <Input
                      id="reported_by_name"
                      value={formData.reported_by_name}
                      onChange={(e) => setFormData({ ...formData, reported_by_name: e.target.value })}
                      placeholder="Name of person reporting"
                      className="mt-1.5"
                    />
                  </div>

                  <div>
                    <Label htmlFor="assigned_to" className="text-sm font-semibold">Assigned To</Label>
                    <Input
                      id="assigned_to"
                      value={formData.assigned_to}
                      onChange={(e) => setFormData({ ...formData, assigned_to: e.target.value })}
                      placeholder="Staff member name"
                      className="mt-1.5"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <Label htmlFor="assigned_contractor_id" className="text-sm font-semibold">Assign Contractor</Label>
                    <Select value={formData.assigned_contractor_id} onValueChange={(v) => setFormData({ ...formData, assigned_contractor_id: v })}>
                      <SelectTrigger className="mt-1.5">
                        <SelectValue placeholder="Select contractor (optional)" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={null}>No contractor</SelectItem>
                        {contractors.map(c => (
                          <SelectItem key={c.id} value={c.id}>
                            <div className="flex flex-col">
                              <span>{c.company_name}</span>
                              <span className="text-xs text-slate-500">{c.contact_name} • {c.email}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {formData.assigned_contractor_id && (
                      <div className="mt-2 flex items-center gap-2 text-xs bg-blue-50 text-blue-700 px-3 py-2 rounded-lg">
                        <CheckCircle2 className="h-4 w-4" />
                        Contractor will be notified via email
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Cost Tracking Card */}
            <Card className="border-2 border-green-100 shadow-sm">
              <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50 border-b">
                <CardTitle className="text-lg flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-green-600" />
                  Cost Tracking
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="estimated_cost" className="text-sm font-semibold">Estimated Cost</Label>
                    <div className="relative mt-1.5">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">$</span>
                      <Input
                        id="estimated_cost"
                        type="number"
                        value={formData.estimated_cost}
                        onChange={(e) => setFormData({ ...formData, estimated_cost: e.target.value })}
                        placeholder="0.00"
                        className="pl-7"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="actual_cost" className="text-sm font-semibold">Actual Cost</Label>
                    <div className="relative mt-1.5">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">$</span>
                      <Input
                        id="actual_cost"
                        type="number"
                        value={formData.actual_cost}
                        onChange={(e) => setFormData({ ...formData, actual_cost: e.target.value })}
                        placeholder="0.00"
                        className="pl-7"
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Recurring Options Card */}
            <Card className="border-2 border-purple-100 shadow-sm">
              <CardHeader className="bg-gradient-to-r from-purple-50 to-pink-50 border-b">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Repeat className="h-5 w-5 text-purple-600" />
                  Recurring Options
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6 space-y-4">
                <div className="flex items-center gap-3 p-3 bg-purple-50 rounded-lg">
                  <Checkbox
                    id="is_recurring"
                    checked={formData.is_recurring}
                    onCheckedChange={(checked) => setFormData({ ...formData, is_recurring: checked })}
                  />
                  <Label htmlFor="is_recurring" className="cursor-pointer font-medium">Make this a recurring work order</Label>
                </div>

                {formData.is_recurring && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                    <div>
                      <Label htmlFor="recurrence_pattern" className="text-sm font-semibold">Recurrence Pattern</Label>
                      <Select value={formData.recurrence_pattern} onValueChange={(v) => setFormData({ ...formData, recurrence_pattern: v })}>
                        <SelectTrigger className="mt-1.5">
                          <SelectValue placeholder="Select pattern" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="daily">Daily</SelectItem>
                          <SelectItem value="weekly">Weekly</SelectItem>
                          <SelectItem value="monthly">Monthly</SelectItem>
                          <SelectItem value="quarterly">Quarterly</SelectItem>
                          <SelectItem value="yearly">Yearly</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="recurrence_end_date" className="text-sm font-semibold">End Date (Optional)</Label>
                      <Input
                        id="recurrence_end_date"
                        type="date"
                        value={formData.recurrence_end_date || ''}
                        onChange={(e) => setFormData({ ...formData, recurrence_end_date: e.target.value })}
                        className="mt-1.5"
                      />
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Attachments Card */}
            <Card className="border-2 border-orange-100 shadow-sm">
              <CardHeader className="bg-gradient-to-r from-orange-50 to-amber-50 border-b">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Upload className="h-5 w-5 text-orange-600" />
                  Attachments
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6 space-y-6">
                {/* Photos Upload */}
                <div>
                  <Label className="text-sm font-semibold flex items-center gap-2">
                    <ImageIcon className="h-4 w-4 text-blue-600" />
                    Photos (Max 12)
                  </Label>
                  <div className="mt-2">
                    <Button type="button" variant="outline" className="w-full border-2 border-dashed hover:border-blue-400 hover:bg-blue-50" asChild>
                      <label className="cursor-pointer">
                        <ImageIcon className="h-4 w-4 mr-2" />
                        Upload Photos ({selectedPhotos.length}/12)
                        <input
                          type="file"
                          multiple
                          accept="image/*"
                          className="hidden"
                          onChange={handlePhotoSelect}
                          disabled={selectedPhotos.length >= 12}
                        />
                      </label>
                    </Button>
                    {selectedPhotos.length > 0 && (
                      <div className="grid grid-cols-4 gap-3 mt-3">
                        {selectedPhotos.map((file, idx) => (
                          <div key={idx} className="relative group">
                            <img 
                              src={URL.createObjectURL(file)} 
                              alt="" 
                              className="w-full h-24 object-cover rounded-lg border-2 border-slate-200 shadow-sm"
                            />
                            <button
                              type="button"
                              onClick={() => removePhoto(idx)}
                              className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Videos Upload */}
                <div>
                  <Label className="text-sm font-semibold flex items-center gap-2">
                    <Video className="h-4 w-4 text-purple-600" />
                    Videos
                  </Label>
                  <div className="mt-2">
                    <Button type="button" variant="outline" className="w-full border-2 border-dashed hover:border-purple-400 hover:bg-purple-50" asChild>
                      <label className="cursor-pointer">
                        <Video className="h-4 w-4 mr-2" />
                        Upload Videos ({selectedVideos.length})
                        <input
                          type="file"
                          multiple
                          accept="video/*"
                          className="hidden"
                          onChange={handleVideoSelect}
                        />
                      </label>
                    </Button>
                    {selectedVideos.length > 0 && (
                      <div className="space-y-2 mt-3">
                        {selectedVideos.map((file, idx) => (
                          <div key={idx} className="flex items-center justify-between p-3 bg-purple-50 border border-purple-200 rounded-lg">
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                              <Video className="h-4 w-4 text-purple-600 flex-shrink-0" />
                              <span className="text-sm truncate">{file.name}</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => removeVideo(idx)}
                              className="text-red-500 hover:text-red-700 ml-2"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Quotes Upload */}
                <div>
                  <Label className="text-sm font-semibold flex items-center gap-2">
                    <Upload className="h-4 w-4 text-green-600" />
                    Quotes <Badge variant="outline" className="ml-2">AI will summarize</Badge>
                  </Label>
                  <div className="mt-2">
                    <Button type="button" variant="outline" className="w-full border-2 border-dashed hover:border-green-400 hover:bg-green-50" asChild>
                      <label className="cursor-pointer">
                        <Upload className="h-4 w-4 mr-2" />
                        Upload Quotes ({selectedQuotes.length})
                        <input
                          type="file"
                          multiple
                          accept=".pdf,.doc,.docx,.jpg,.png"
                          className="hidden"
                          onChange={handleQuoteSelect}
                        />
                      </label>
                    </Button>
                    {selectedQuotes.length > 0 && (
                      <div className="space-y-2 mt-3">
                        {selectedQuotes.map((file, idx) => (
                          <div key={idx} className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                              <Upload className="h-4 w-4 text-green-600 flex-shrink-0" />
                              <span className="text-sm truncate">{file.name}</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => removeQuote(idx)}
                              className="text-red-500 hover:text-red-700 ml-2"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Invoices Upload */}
                <div>
                  <Label className="text-sm font-semibold flex items-center gap-2">
                    <Upload className="h-4 w-4 text-indigo-600" />
                    Invoices <Badge variant="outline" className="ml-2">Auto-send to strata</Badge>
                  </Label>
                  <div className="mt-2">
                    <Button type="button" variant="outline" className="w-full border-2 border-dashed hover:border-indigo-400 hover:bg-indigo-50" asChild>
                      <label className="cursor-pointer">
                        <Upload className="h-4 w-4 mr-2" />
                        Upload Invoices ({selectedInvoices.length})
                        <input
                          type="file"
                          multiple
                          accept=".pdf,.doc,.docx,.jpg,.png"
                          className="hidden"
                          onChange={handleInvoiceSelect}
                        />
                      </label>
                    </Button>
                    {selectedInvoices.length > 0 && (
                      <div className="space-y-2 mt-3">
                        {selectedInvoices.map((file, idx) => (
                          <div key={idx} className="flex items-center justify-between p-3 bg-indigo-50 border border-indigo-200 rounded-lg">
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                              <Upload className="h-4 w-4 text-indigo-600 flex-shrink-0" />
                              <span className="text-sm truncate">{file.name}</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => removeInvoice(idx)}
                              className="text-red-500 hover:text-red-700 ml-2"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

              <DialogFooter className="border-t pt-4 bg-slate-50">
                <Button type="button" variant="outline" onClick={handleCloseDialog} className="min-w-24">
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white min-w-32" 
                  disabled={createMutation.isPending || updateMutation.isPending || uploadingFiles}
                >
                  {uploadingFiles ? (
                    <>
                      <Upload className="h-4 w-4 mr-2 animate-pulse" />
                      Uploading...
                    </>
                  ) : (createMutation.isPending || updateMutation.isPending) ? (
                    <>
                      <Clock className="h-4 w-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : editingOrder ? (
                    <>
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                      Update Work Order
                    </>
                  ) : (
                    <>
                      <Wrench className="h-4 w-4 mr-2" />
                      Create Work Order
                    </>
                  )}
                </Button>
              </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteOrder} onOpenChange={() => setDeleteOrder(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Work Order</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deleteOrder?.title}"?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteMutation.mutate(deleteOrder.id)} className="bg-red-600 hover:bg-red-700">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Work Order Detail Modal */}
      {viewingOrder && !showAIAssistant && (
        <WorkOrderDetail
          order={viewingOrder}
          onClose={() => setViewingOrder(null)}
          buildings={buildings}
          units={units}
          contractors={contractors}
        />
      )}

      {/* AI Scheduling Assistant Modal */}
      {viewingOrder && showAIAssistant && (
        <Dialog open={true} onOpenChange={() => { setViewingOrder(null); setShowAIAssistant(false); }}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-blue-600" />
                AI Analysis: {viewingOrder.title}
              </DialogTitle>
            </DialogHeader>
            <AISchedulingAssistant 
              workOrder={viewingOrder} 
              buildingId={viewingOrder.building_id}
            />
          </DialogContent>
        </Dialog>
      )}

      {/* Rating Dialog */}
      {ratingOrder && (
        <RatingDialog
          workOrder={ratingOrder}
          open={!!ratingOrder}
          onClose={() => setRatingOrder(null)}
          onSubmit={handleRatingSubmit}
        />
      )}
      </div>
      );
      }