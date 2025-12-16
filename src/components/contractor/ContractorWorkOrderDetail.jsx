import React, { useState } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import StatusBadge from '@/components/common/StatusBadge';
import { Camera, Mic, Upload, Send, Loader2, FileText, X } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

export default function ContractorWorkOrderDetail({ workOrder, onClose }) {
  const [newComment, setNewComment] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [newStatus, setNewStatus] = useState(workOrder.status);
  
  const queryClient = useQueryClient();

  const { data: buildings = [] } = useQuery({
    queryKey: ['buildings'],
    queryFn: () => base44.entities.Building.list(),
  });

  const building = buildings.find(b => b.id === workOrder.building_id);

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
        ...(newStatus === 'completed' && { completed_date: new Date().toISOString() })
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Info */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <h2 className="text-xl font-bold">{workOrder.title}</h2>
          <StatusBadge status={workOrder.status} />
        </div>
        <div className="text-sm text-slate-500 space-y-1">
          {building && <p>Building: {building.name}</p>}
          {workOrder.job_area && <p>Location: {workOrder.job_area}</p>}
          {workOrder.due_date && <p>Due Date: {format(new Date(workOrder.due_date), 'MMM d, yyyy')}</p>}
        </div>
        <p className="text-slate-700">{workOrder.description}</p>
      </div>

      {/* Status Update */}
      <div className="space-y-2">
        <Label>Update Status</Label>
        <div className="flex gap-2">
          <Select value={newStatus} onValueChange={setNewStatus}>
            <SelectTrigger className="flex-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="open">Open</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={handleStatusUpdate} disabled={newStatus === workOrder.status || updateMutation.isPending}>
            Update
          </Button>
        </div>
      </div>

      {/* Photo Uploads */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
        <div className="space-y-2">
          <Label>Photos</Label>
          <div className="grid grid-cols-3 gap-2">
            {workOrder.photos.map((photo, idx) => (
              <img key={idx} src={photo} alt={`Work photo ${idx + 1}`} className="w-full h-24 object-cover rounded-lg" />
            ))}
          </div>
        </div>
      )}

      {/* Notes/Comments */}
      <div className="space-y-3">
        <Label>Add Case Notes or Report</Label>
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
          <Button onClick={handleAddComment} disabled={!newComment.trim() || updateMutation.isPending}>
            <Send className="h-4 w-4 mr-2" />
            Add Note
          </Button>
        </div>
      </div>

      {/* Comments History */}
      {workOrder.comments && workOrder.comments.length > 0 && (
        <div className="space-y-2">
          <Label>Case Notes History</Label>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {workOrder.comments.map((comment, idx) => (
              <div key={idx} className="p-3 bg-slate-50 rounded-lg">
                <p className="text-sm text-slate-700">{comment.text}</p>
                <p className="text-xs text-slate-500 mt-1">
                  {comment.author} - {format(new Date(comment.timestamp), 'MMM d, yyyy h:mm a')}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Invoice Upload */}
      <div className="space-y-2">
        <Label>Upload Invoice</Label>
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
      </div>

      {/* Invoices List */}
      {workOrder.invoices && workOrder.invoices.length > 0 && (
        <div className="space-y-2">
          <Label>Invoices</Label>
          <div className="space-y-2">
            {workOrder.invoices.map((invoice, idx) => (
              <a
                key={idx}
                href={invoice}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 p-2 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <FileText className="h-4 w-4 text-slate-500" />
                <span className="text-sm text-blue-600">Invoice {idx + 1}</span>
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}