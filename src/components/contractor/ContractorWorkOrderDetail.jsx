import React, { useState } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import StatusBadge from '@/components/common/StatusBadge';
import { Camera, Mic, Upload, Send, Loader2, FileText, X, MessageSquare, ClipboardCheck, History, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

export default function ContractorWorkOrderDetail({ workOrder, onClose }) {
  const [newComment, setNewComment] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [newStatus, setNewStatus] = useState(workOrder.status);
  const [managerMessage, setManagerMessage] = useState('');
  const [actualCost, setActualCost] = useState(workOrder.actual_cost || '');
  
  const queryClient = useQueryClient();

  const { data: buildings = [] } = useQuery({
    queryKey: ['buildings'],
    queryFn: () => base44.entities.Building.list(),
  });

  const { data: inspections = [] } = useQuery({
    queryKey: ['inspections', workOrder.building_id],
    queryFn: () => base44.entities.Inspection.filter({ building_id: workOrder.building_id }),
    enabled: !!workOrder.building_id,
  });

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const building = buildings.find(b => b.id === workOrder.building_id);
  const relatedInspections = inspections.filter(i => 
    i.unit_id === workOrder.unit_id || 
    i.title.toLowerCase().includes(workOrder.title.toLowerCase().split(' ')[0])
  );

  const updateMutation = useMutation({
    mutationFn: (data) => base44.entities.WorkOrder.update(workOrder.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contractor-work-orders'] });
      toast.success('Work order updated');
    },
  });

  const handlePhotoUpload = async (e, type) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    setUploading(true);
    try {
      const uploadPromises = files.map(file => base44.integrations.Core.UploadFile({ file }));
      const results = await Promise.all(uploadPromises);
      const urls = results.map(r => r.file_url);
      
      updateMutation.mutate({
        ...workOrder,
        photos: [...(workOrder.photos || []), ...urls],
        comments: [
          ...(workOrder.comments || []),
          {
            text: `${type === 'before' ? 'Before' : 'After'} photos uploaded`,
            author: 'Contractor',
            timestamp: new Date().toISOString()
          }
        ]
      });
      toast.success(`${type === 'before' ? 'Before' : 'After'} photos uploaded`);
    } catch (error) {
      toast.error('Failed to upload photos');
    } finally {
      setUploading(false);
    }
  };

  const handleInvoiceUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      updateMutation.mutate({
        ...workOrder,
        invoices: [...(workOrder.invoices || []), file_url],
        comments: [
          ...(workOrder.comments || []),
          {
            text: 'Invoice uploaded',
            author: 'Contractor',
            timestamp: new Date().toISOString()
          }
        ]
      });
      toast.success('Invoice uploaded');
    } catch (error) {
      toast.error('Failed to upload invoice');
    } finally {
      setUploading(false);
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      const audioChunks = [];

      mediaRecorder.ondataavailable = (event) => {
        audioChunks.push(event.data);
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
        const recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
        recognition.continuous = false;
        recognition.interimResults = false;

        recognition.onresult = (event) => {
          const transcript = event.results[0][0].transcript;
          setNewComment(prev => prev + (prev ? ' ' : '') + transcript);
        };

        recognition.start();
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);

      setTimeout(() => {
        if (mediaRecorder.state === 'recording') {
          mediaRecorder.stop();
          setIsRecording(false);
        }
      }, 30000);

    } catch (error) {
      toast.error('Microphone access denied');
    }
  };

  const stopRecording = () => {
    setIsRecording(false);
  };

  const handleAddComment = () => {
    if (!newComment.trim()) return;

    updateMutation.mutate({
      ...workOrder,
      comments: [
        ...(workOrder.comments || []),
        {
          text: newComment,
          author: 'Contractor',
          timestamp: new Date().toISOString()
        }
      ]
    });
    setNewComment('');
  };

  const handleStatusUpdate = () => {
    if (newStatus !== workOrder.status) {
      updateMutation.mutate({
        ...workOrder,
        status: newStatus,
        actual_cost: actualCost ? Number(actualCost) : workOrder.actual_cost,
        ...(newStatus === 'completed' && { completed_date: new Date().toISOString() })
      });
    }
  };

  const handleSendMessage = async () => {
    if (!managerMessage.trim()) return;

    // Create notification for building manager
    try {
      await base44.entities.Notification.create({
        recipient_email: workOrder.assigned_to || building?.manager_email || 'admin@vivid.com',
        title: `Contractor Message: ${workOrder.title}`,
        message: managerMessage,
        type: 'work_order',
        priority: 'medium',
        reference_id: workOrder.id,
        reference_type: 'WorkOrder',
        building_id: workOrder.building_id,
      });

      updateMutation.mutate({
        ...workOrder,
        comments: [
          ...(workOrder.comments || []),
          {
            text: `[MESSAGE TO MANAGER] ${managerMessage}`,
            author: user?.full_name || 'Contractor',
            timestamp: new Date().toISOString()
          }
        ]
      });

      setManagerMessage('');
      toast.success('Message sent to building manager');
    } catch (error) {
      toast.error('Failed to send message');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Info */}
      <Card>
        <CardContent className="pt-6 space-y-3">
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold">{workOrder.title}</h2>
            <StatusBadge status={workOrder.status} />
            {workOrder.priority === 'urgent' && (
              <Badge className="bg-red-100 text-red-700">
                <AlertTriangle className="h-3 w-3 mr-1" />
                Urgent
              </Badge>
            )}
          </div>
          <div className="grid grid-cols-2 gap-4 text-sm">
            {building && (
              <div>
                <p className="text-slate-500">Building</p>
                <p className="font-medium">{building.name}</p>
              </div>
            )}
            {workOrder.job_area && (
              <div>
                <p className="text-slate-500">Location</p>
                <p className="font-medium">{workOrder.job_area}</p>
              </div>
            )}
            {workOrder.due_date && (
              <div>
                <p className="text-slate-500">Due Date</p>
                <p className="font-medium">{format(new Date(workOrder.due_date), 'MMM d, yyyy')}</p>
              </div>
            )}
            {workOrder.estimated_cost && (
              <div>
                <p className="text-slate-500">Estimated Cost</p>
                <p className="font-medium">${workOrder.estimated_cost}</p>
              </div>
            )}
          </div>
          <div>
            <p className="text-slate-500 text-sm mb-1">Description</p>
            <p className="text-slate-700">{workOrder.description}</p>
          </div>
        </CardContent>
      </Card>

      {/* Related Inspections */}
      {relatedInspections.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <ClipboardCheck className="h-4 w-4" />
              Related Inspection History
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {relatedInspections.slice(0, 3).map(inspection => (
              <div key={inspection.id} className="p-3 bg-slate-50 rounded-lg text-sm">
                <div className="flex items-center justify-between mb-1">
                  <p className="font-medium">{inspection.title}</p>
                  <StatusBadge status={inspection.status} />
                </div>
                {inspection.findings && (
                  <p className="text-slate-600 text-xs line-clamp-2">{inspection.findings}</p>
                )}
                <p className="text-slate-400 text-xs mt-1">
                  {format(new Date(inspection.scheduled_date), 'MMM d, yyyy')}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Status & Cost Update */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Update Work Order</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={newStatus} onValueChange={setNewStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="open">Open</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Actual Cost ($)</Label>
              <Input
                type="number"
                value={actualCost}
                onChange={(e) => setActualCost(e.target.value)}
                placeholder="Enter final cost"
              />
            </div>
          </div>
          <Button 
            onClick={handleStatusUpdate} 
            disabled={newStatus === workOrder.status && actualCost === workOrder.actual_cost || updateMutation.isPending}
            className="w-full"
          >
            Update Work Order
          </Button>
        </CardContent>
      </Card>

      {/* Message Building Manager */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            Message Building Manager
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Textarea
            value={managerMessage}
            onChange={(e) => setManagerMessage(e.target.value)}
            placeholder="Ask questions or provide updates to the building manager..."
            rows={3}
          />
          <Button 
            onClick={handleSendMessage} 
            disabled={!managerMessage.trim() || updateMutation.isPending}
            className="w-full"
          >
            <Send className="h-4 w-4 mr-2" />
            Send Message
          </Button>
        </CardContent>
      </Card>

      {/* Photo Uploads */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Progress Photos</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div className="space-y-2">
              <Label>Before Photos</Label>
              <div className="relative">
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  capture="environment"
                  onChange={(e) => handlePhotoUpload(e, 'before')}
                  className="hidden"
                  id="before-photos"
                  disabled={uploading}
                />
                <Button asChild variant="outline" className="w-full" disabled={uploading}>
                  <label htmlFor="before-photos" className="cursor-pointer">
                    <Camera className="h-4 w-4 mr-2" />
                    {uploading ? 'Uploading...' : 'Upload Before Photos'}
                  </label>
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label>After Photos</Label>
              <div className="relative">
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  capture="environment"
                  onChange={(e) => handlePhotoUpload(e, 'after')}
                  className="hidden"
                  id="after-photos"
                  disabled={uploading}
                />
                <Button asChild variant="outline" className="w-full" disabled={uploading}>
                  <label htmlFor="after-photos" className="cursor-pointer">
                    <Camera className="h-4 w-4 mr-2" />
                    {uploading ? 'Uploading...' : 'Upload After Photos'}
                  </label>
                </Button>
              </div>
            </div>
          </div>

          {/* Photo Gallery */}
          {workOrder.photos && workOrder.photos.length > 0 && (
            <div className="grid grid-cols-4 gap-2">
              {workOrder.photos.map((photo, idx) => (
                <img key={idx} src={photo} alt={`Work photo ${idx + 1}`} className="w-full h-20 object-cover rounded-lg" />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Notes/Comments */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <History className="h-4 w-4" />
            Progress Reports & Notes
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Type your notes here or use voice input..."
            rows={4}
          />
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={isRecording ? stopRecording : startRecording}
              disabled={updateMutation.isPending}
            >
              {isRecording ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Recording...
                </>
              ) : (
                <>
                  <Mic className="h-4 w-4 mr-2" />
                  Voice Input
                </>
              )}
            </Button>
            <Button onClick={handleAddComment} disabled={!newComment.trim() || updateMutation.isPending} className="flex-1">
              <Send className="h-4 w-4 mr-2" />
              Add Note
            </Button>
          </div>

          {/* Comments History */}
          {workOrder.comments && workOrder.comments.length > 0 && (
            <div className="space-y-2 max-h-64 overflow-y-auto mt-4 border-t pt-3">
              {workOrder.comments.map((comment, idx) => (
                <div key={idx} className={`p-3 rounded-lg ${comment.text.includes('[MESSAGE TO MANAGER]') ? 'bg-blue-50 border border-blue-200' : 'bg-slate-50'}`}>
                  <p className="text-sm text-slate-700">{comment.text}</p>
                  <p className="text-xs text-slate-500 mt-1">
                    {comment.author} - {format(new Date(comment.timestamp), 'MMM d, yyyy h:mm a')}
                  </p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Invoice Upload */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Invoices & Documentation
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="relative">
            <input
              type="file"
              accept=".pdf,.jpg,.jpeg,.png"
              onChange={handleInvoiceUpload}
              className="hidden"
              id="invoice-upload"
              disabled={uploading}
            />
            <Button asChild variant="outline" className="w-full" disabled={uploading}>
              <label htmlFor="invoice-upload" className="cursor-pointer">
                <Upload className="h-4 w-4 mr-2" />
                {uploading ? 'Uploading...' : 'Upload Invoice'}
              </label>
            </Button>
          </div>

          {/* Invoices List */}
          {workOrder.invoices && workOrder.invoices.length > 0 && (
            <div className="space-y-2 border-t pt-3">
              {workOrder.invoices.map((invoice, idx) => (
                <a
                  key={idx}
                  href={invoice}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors"
                >
                  <FileText className="h-4 w-4 text-blue-600" />
                  <span className="text-sm text-blue-600 font-medium">Invoice {idx + 1}</span>
                </a>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}