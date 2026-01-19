import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import StatusBadge from '@/components/common/StatusBadge';
import WorkOrderHistoryAnalysis from './WorkOrderHistoryAnalysis';
import TimeTracker from './TimeTracker';
import { 
  X, Upload, File, Image as ImageIcon, Video, FileText, 
  Package, MessageSquare, Trash2, Calendar, Building2, User, BarChart3 
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

export default function WorkOrderDetail({ order, onClose, buildings, units, contractors }) {
  const [uploading, setUploading] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [inventoryItem, setInventoryItem] = useState({ name: '', quantity: '', unit: '' });
  const [activeTab, setActiveTab] = useState('details');

  const queryClient = useQueryClient();

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.WorkOrder.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workOrders'] });
      toast.success('Work order updated');
    },
  });

  const getBuildingName = (buildingId) => buildings?.find(b => b.id === buildingId)?.name || 'Unknown';
  const getUnitNumber = (unitId) => units?.find(u => u.id === unitId)?.unit_number || '';
  const getContractorName = (contractorId) => contractors?.find(c => c.id === contractorId)?.company_name || '';

  const handleFileUpload = async (e, type) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setUploading(true);
    try {
      const uploadPromises = files.map(file => base44.integrations.Core.UploadFile({ file }));
      const results = await Promise.all(uploadPromises);
      const fileUrls = results.map(r => r.file_url);

      const currentFiles = order[type] || [];
      updateMutation.mutate({
        id: order.id,
        data: { [type]: [...currentFiles, ...fileUrls] }
      });
    } catch (error) {
      toast.error('Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveFile = (type, index) => {
    const currentFiles = order[type] || [];
    const newFiles = currentFiles.filter((_, i) => i !== index);
    updateMutation.mutate({
      id: order.id,
      data: { [type]: newFiles }
    });
  };

  const handleAddComment = () => {
    if (!newComment.trim()) return;
    const comments = order.comments || [];
    updateMutation.mutate({
      id: order.id,
      data: {
        comments: [...comments, {
          text: newComment,
          author: 'Current User',
          timestamp: new Date().toISOString()
        }]
      }
    });
    setNewComment('');
  };

  const handleAddInventory = () => {
    if (!inventoryItem.name || !inventoryItem.quantity) return;
    const items = order.inventory_items || [];
    updateMutation.mutate({
      id: order.id,
      data: {
        inventory_items: [...items, {
          name: inventoryItem.name,
          quantity: Number(inventoryItem.quantity),
          unit: inventoryItem.unit
        }]
      }
    });
    setInventoryItem({ name: '', quantity: '', unit: '' });
  };

  const handleRemoveInventory = (index) => {
    const items = order.inventory_items || [];
    updateMutation.mutate({
      id: order.id,
      data: { inventory_items: items.filter((_, i) => i !== index) }
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 overflow-y-auto">
      <div className="min-h-screen px-4 py-8">
        <div className="max-w-7xl mx-auto">
          <Card className="border-0 shadow-xl">
            <CardHeader className="flex flex-row items-center justify-between border-b">
              <div>
                <CardTitle className="text-2xl">Work Order #{order.id?.slice(-6)}</CardTitle>
                <div className="flex items-center gap-3 mt-2">
                  <StatusBadge status={order.status} />
                  <StatusBadge status={order.priority} />
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={onClose}>
                <X className="h-5 w-5" />
              </Button>
            </CardHeader>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <div className="px-6 pt-4">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="details">
                    <FileText className="h-4 w-4 mr-2" />
                    Work Order Details
                  </TabsTrigger>
                  <TabsTrigger value="analysis">
                    <BarChart3 className="h-4 w-4 mr-2" />
                    History & Trends
                  </TabsTrigger>
                </TabsList>
              </div>

              <TabsContent value="details" className="p-6 mt-0">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Column - Main Info */}
                <div className="lg:col-span-2 space-y-6">
                  {/* Time Tracker */}
                  <TimeTracker
                    workOrder={order}
                    onSave={(data) => updateMutation.mutate({ id: order.id, data: { ...order, ...data } })}
                  />
                  {/* Case Information */}
                  <Card className="border shadow-sm">
                    <CardHeader>
                      <CardTitle className="text-base">Case Information</CardTitle>
                    </CardHeader>
                    <CardContent className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-slate-500">Case Type</Label>
                        <p className="font-medium capitalize">{order.category?.replace(/_/g, ' ')}</p>
                      </div>
                      <div>
                        <Label className="text-slate-500">Due Date</Label>
                        <p className="font-medium">{order.due_date ? format(new Date(order.due_date), 'dd/MM/yyyy') : 'Not set'}</p>
                      </div>
                      <div>
                        <Label className="text-slate-500">Start Date</Label>
                        <p className="font-medium">{order.start_date ? format(new Date(order.start_date), 'dd/MM/yyyy') : 'Not set'}</p>
                      </div>
                      <div>
                        <Label className="text-slate-500">Status</Label>
                        <StatusBadge status={order.status} />
                      </div>
                      <div>
                        <Label className="text-slate-500">Priority</Label>
                        <StatusBadge status={order.priority} />
                      </div>
                      <div>
                        <Label className="text-slate-500">Created</Label>
                        <p className="font-medium">{order.created_date ? format(new Date(order.created_date), 'dd/MM/yyyy') : '-'}</p>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Asset Information */}
                  <Card className="border shadow-sm">
                    <CardHeader>
                      <CardTitle className="text-base">Asset Information</CardTitle>
                    </CardHeader>
                    <CardContent className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-slate-500">Job Area</Label>
                        <p className="font-medium">{order.job_area || 'Not specified'}</p>
                      </div>
                      <div>
                        <Label className="text-slate-500">Categories</Label>
                        <p className="font-medium capitalize">{order.category?.replace(/_/g, ' ')}</p>
                      </div>
                      <div>
                        <Label className="text-slate-500">Building</Label>
                        <p className="font-medium">{getBuildingName(order.building_id)}</p>
                      </div>
                      <div>
                        <Label className="text-slate-500">Unit</Label>
                        <p className="font-medium">{order.unit_id ? `Unit ${getUnitNumber(order.unit_id)}` : 'Common Area'}</p>
                      </div>
                      <div>
                        <Label className="text-slate-500">Asset</Label>
                        <p className="font-medium">{order.asset_info || 'Not specified'}</p>
                      </div>
                      <div>
                        <Label className="text-slate-500">Company</Label>
                        <p className="font-medium">{order.company_name || getContractorName(order.assigned_contractor_id) || 'Not assigned'}</p>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Job Information */}
                  <Card className="border shadow-sm">
                    <CardHeader>
                      <CardTitle className="text-base">Job Information</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <Label className="text-slate-500">Case Title</Label>
                        <p className="font-medium">{order.title}</p>
                      </div>
                      <div>
                        <Label className="text-slate-500">Description</Label>
                        <p className="text-slate-700">{order.description || 'No description provided'}</p>
                      </div>
                      {order.reported_by_name && (
                        <div>
                          <Label className="text-slate-500">Reported By</Label>
                          <p className="font-medium">{order.reported_by_name}</p>
                        </div>
                      )}
                      {order.assigned_to && (
                        <div>
                          <Label className="text-slate-500">Assigned To</Label>
                          <p className="font-medium">{order.assigned_to}</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Notes */}
                  <Card className="border shadow-sm">
                    <CardHeader>
                      <CardTitle className="text-base">Notes</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-slate-700 whitespace-pre-wrap">{order.notes || 'No notes'}</p>
                    </CardContent>
                  </Card>

                  {/* Comments */}
                  <Card className="border shadow-sm">
                    <CardHeader>
                      <CardTitle className="text-base flex items-center gap-2">
                        <MessageSquare className="h-4 w-4" />
                        Comments ({order.comments?.length || 0})
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {order.comments?.map((comment, idx) => (
                        <div key={idx} className="border-l-2 border-blue-500 pl-3 py-2 bg-slate-50 rounded">
                          <p className="text-sm text-slate-700">{comment.text}</p>
                          <p className="text-xs text-slate-500 mt-1">
                            {comment.author} - {comment.timestamp && format(new Date(comment.timestamp), 'dd/MM/yyyy HH:mm')}
                          </p>
                        </div>
                      ))}
                      <div className="flex gap-2">
                        <Input
                          placeholder="Add a comment..."
                          value={newComment}
                          onChange={(e) => setNewComment(e.target.value)}
                          onKeyPress={(e) => e.key === 'Enter' && handleAddComment()}
                        />
                        <Button onClick={handleAddComment}>Post</Button>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Inventory */}
                  <Card className="border shadow-sm">
                    <CardHeader>
                      <CardTitle className="text-base flex items-center gap-2">
                        <Package className="h-4 w-4" />
                        Inventory / Stock
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {order.inventory_items?.map((item, idx) => (
                        <div key={idx} className="flex items-center justify-between p-2 bg-slate-50 rounded">
                          <div>
                            <p className="font-medium">{item.name}</p>
                            <p className="text-sm text-slate-500">{item.quantity} {item.unit}</p>
                          </div>
                          <Button variant="ghost" size="icon" onClick={() => handleRemoveInventory(idx)}>
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      ))}
                      <div className="grid grid-cols-3 gap-2">
                        <Input
                          placeholder="Item name"
                          value={inventoryItem.name}
                          onChange={(e) => setInventoryItem({ ...inventoryItem, name: e.target.value })}
                        />
                        <Input
                          type="number"
                          placeholder="Quantity"
                          value={inventoryItem.quantity}
                          onChange={(e) => setInventoryItem({ ...inventoryItem, quantity: e.target.value })}
                        />
                        <Input
                          placeholder="Unit"
                          value={inventoryItem.unit}
                          onChange={(e) => setInventoryItem({ ...inventoryItem, unit: e.target.value })}
                        />
                      </div>
                      <Button onClick={handleAddInventory} variant="outline" className="w-full">
                        <Package className="h-4 w-4 mr-2" /> Add Item
                      </Button>
                    </CardContent>
                  </Card>
                </div>

                {/* Right Column - Media & Documents */}
                <div className="space-y-6">
                  {/* Photos */}
                  <Card className="border shadow-sm">
                    <CardHeader>
                      <CardTitle className="text-base flex items-center justify-between">
                        <span className="flex items-center gap-2">
                          <ImageIcon className="h-4 w-4" />
                          Photos ({order.photos?.length || 0}/12)
                        </span>
                        <Button variant="ghost" size="sm" asChild disabled={uploading || (order.photos?.length >= 12)}>
                          <label>
                            <Upload className="h-4 w-4" />
                            <input
                              type="file"
                              multiple
                              accept="image/*"
                              className="hidden"
                              onChange={(e) => handleFileUpload(e, 'photos')}
                            />
                          </label>
                        </Button>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="grid grid-cols-2 gap-2">
                      {order.photos?.map((photo, idx) => (
                        <div key={idx} className="relative group">
                          <img src={photo} alt="" className="w-full h-24 object-cover rounded" />
                          <Button
                            variant="ghost"
                            size="icon"
                            className="absolute top-1 right-1 h-6 w-6 bg-red-500 hover:bg-red-600 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => handleRemoveFile('photos', idx)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </CardContent>
                  </Card>

                  {/* Videos */}
                  <Card className="border shadow-sm">
                    <CardHeader>
                      <CardTitle className="text-base flex items-center justify-between">
                        <span className="flex items-center gap-2">
                          <Video className="h-4 w-4" />
                          Videos ({order.videos?.length || 0})
                        </span>
                        <Button variant="ghost" size="sm" asChild disabled={uploading}>
                          <label>
                            <Upload className="h-4 w-4" />
                            <input
                              type="file"
                              multiple
                              accept="video/*"
                              className="hidden"
                              onChange={(e) => handleFileUpload(e, 'videos')}
                            />
                          </label>
                        </Button>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {order.videos?.map((video, idx) => (
                        <div key={idx} className="flex items-center justify-between p-2 bg-slate-50 rounded">
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            <Video className="h-4 w-4 text-slate-400 flex-shrink-0" />
                            <a href={video} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 truncate">
                              Video {idx + 1}
                            </a>
                          </div>
                          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleRemoveFile('videos', idx)}>
                            <Trash2 className="h-3 w-3 text-red-500" />
                          </Button>
                        </div>
                      ))}
                      {(!order.videos || order.videos.length === 0) && (
                        <p className="text-sm text-slate-500 text-center py-4">No videos uploaded</p>
                      )}
                    </CardContent>
                  </Card>

                  {/* Quotes */}
                  <Card className="border shadow-sm">
                    <CardHeader>
                      <CardTitle className="text-base flex items-center justify-between">
                        <span className="flex items-center gap-2">
                          <FileText className="h-4 w-4" />
                          Quotes ({order.quotes?.length || 0})
                        </span>
                        <Button variant="ghost" size="sm" asChild disabled={uploading}>
                          <label>
                            <Upload className="h-4 w-4" />
                            <input
                              type="file"
                              multiple
                              accept=".pdf,.doc,.docx"
                              className="hidden"
                              onChange={(e) => handleFileUpload(e, 'quotes')}
                            />
                          </label>
                        </Button>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {order.quotes?.map((quote, idx) => (
                        <div key={idx} className="flex items-center justify-between p-2 bg-slate-50 rounded">
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            <File className="h-4 w-4 text-slate-400 flex-shrink-0" />
                            <a href={quote} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 truncate">
                              Quote {idx + 1}
                            </a>
                          </div>
                          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleRemoveFile('quotes', idx)}>
                            <Trash2 className="h-3 w-3 text-red-500" />
                          </Button>
                        </div>
                      ))}
                      {(!order.quotes || order.quotes.length === 0) && (
                        <p className="text-sm text-slate-500 text-center py-4">Drag and drop files here to upload or click to add</p>
                      )}
                    </CardContent>
                  </Card>

                  {/* Invoices */}
                  <Card className="border shadow-sm">
                    <CardHeader>
                      <CardTitle className="text-base flex items-center justify-between">
                        <span className="flex items-center gap-2">
                          <FileText className="h-4 w-4" />
                          Invoices ({order.invoices?.length || 0})
                        </span>
                        <Button variant="ghost" size="sm" asChild disabled={uploading}>
                          <label>
                            <Upload className="h-4 w-4" />
                            <input
                              type="file"
                              multiple
                              accept=".pdf,.doc,.docx"
                              className="hidden"
                              onChange={(e) => handleFileUpload(e, 'invoices')}
                            />
                          </label>
                        </Button>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {order.invoices?.map((invoice, idx) => (
                        <div key={idx} className="flex items-center justify-between p-2 bg-slate-50 rounded">
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            <File className="h-4 w-4 text-slate-400 flex-shrink-0" />
                            <a href={invoice} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 truncate">
                              Invoice {idx + 1}
                            </a>
                          </div>
                          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleRemoveFile('invoices', idx)}>
                            <Trash2 className="h-3 w-3 text-red-500" />
                          </Button>
                        </div>
                      ))}
                      {(!order.invoices || order.invoices.length === 0) && (
                        <p className="text-sm text-slate-500 text-center py-4">Drag and drop files here to upload or click to add</p>
                      )}
                    </CardContent>
                  </Card>

                  {/* Documents */}
                  <Card className="border shadow-sm">
                    <CardHeader>
                      <CardTitle className="text-base flex items-center justify-between">
                        <span className="flex items-center gap-2">
                          <FileText className="h-4 w-4" />
                          Documents ({order.documents?.length || 0})
                        </span>
                        <Button variant="ghost" size="sm" asChild disabled={uploading}>
                          <label>
                            <Upload className="h-4 w-4" />
                            <input
                              type="file"
                              multiple
                              className="hidden"
                              onChange={(e) => handleFileUpload(e, 'documents')}
                            />
                          </label>
                        </Button>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {order.documents?.map((doc, idx) => (
                        <div key={idx} className="flex items-center justify-between p-2 bg-slate-50 rounded">
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            <File className="h-4 w-4 text-slate-400 flex-shrink-0" />
                            <a href={doc} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 truncate">
                              Document {idx + 1}
                            </a>
                          </div>
                          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleRemoveFile('documents', idx)}>
                            <Trash2 className="h-3 w-3 text-red-500" />
                          </Button>
                        </div>
                      ))}
                      {(!order.documents || order.documents.length === 0) && (
                        <p className="text-sm text-slate-500 text-center py-4">Drag and drop files here to upload or click to add</p>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </div>
              </TabsContent>

              <TabsContent value="analysis" className="p-6 mt-0">
                <WorkOrderHistoryAnalysis
                  buildingId={order.building_id}
                  unitId={order.unit_id}
                  buildingName={getBuildingName(order.building_id)}
                  unitNumber={order.unit_id ? getUnitNumber(order.unit_id) : null}
                />
              </TabsContent>
            </Tabs>
          </Card>
        </div>
      </div>
    </div>
  );
}