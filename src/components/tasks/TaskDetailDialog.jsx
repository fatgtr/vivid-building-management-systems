import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from 'sonner';
import { format } from 'date-fns';
import { 
  Calendar, 
  Clock, 
  User, 
  FileText, 
  Download, 
  Edit, 
  Trash2,
  CheckCircle,
  Upload,
  MessageSquare
} from 'lucide-react';
import TaskDialog from './TaskDialog';

export default function TaskDetailDialog({ task, onClose, contractors }) {
  const queryClient = useQueryClient();
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [noteText, setNoteText] = useState('');
  const [user, setUser] = useState(null);
  const [uploading, setUploading] = useState(false);

  React.useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Task.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['tasks']);
      toast.success('Task updated successfully');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Task.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['tasks']);
      toast.success('Task deleted successfully');
      onClose();
    },
  });

  const handleStatusChange = (newStatus) => {
    const updates = { status: newStatus };
    if (newStatus === 'completed' && !task.completed_date) {
      updates.completed_date = new Date().toISOString().split('T')[0];
    }
    updateMutation.mutate({ id: task.id, data: updates });
  };

  const handleAddNote = () => {
    if (!noteText.trim()) return;

    const newNote = {
      text: noteText,
      author: user?.full_name || 'Unknown',
      author_email: user?.email || '',
      timestamp: new Date().toISOString(),
    };

    updateMutation.mutate({
      id: task.id,
      data: {
        notes: [...(task.notes || []), newNote],
      },
    });
    setNoteText('');
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      updateMutation.mutate({
        id: task.id,
        data: {
          attachments: [...(task.attachments || []), file_url],
        },
      });
      toast.success('File uploaded successfully');
    } catch (error) {
      toast.error('Failed to upload file: ' + error.message);
    } finally {
      setUploading(false);
    }
  };

  const priorityColors = {
    low: 'bg-blue-100 text-blue-800',
    medium: 'bg-yellow-100 text-yellow-800',
    high: 'bg-orange-100 text-orange-800',
    urgent: 'bg-red-100 text-red-800',
  };

  const statusColors = {
    pending: 'bg-slate-100 text-slate-800',
    in_progress: 'bg-blue-100 text-blue-800',
    completed: 'bg-green-100 text-green-800',
    cancelled: 'bg-red-100 text-red-800',
  };

  if (showEditDialog) {
    return (
      <TaskDialog
        task={task}
        onClose={() => {
          setShowEditDialog(false);
          onClose();
        }}
        contractors={contractors}
      />
    );
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <DialogTitle className="text-2xl mb-2">{task.title}</DialogTitle>
              <div className="flex items-center gap-2 flex-wrap">
                <Badge className={priorityColors[task.priority]}>
                  {task.priority}
                </Badge>
                <Badge className={statusColors[task.status]}>
                  {task.status.replace('_', ' ')}
                </Badge>
                {task.tags?.map((tag, idx) => (
                  <Badge key={idx} variant="outline">
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setShowEditDialog(true)}>
                <Edit className="h-4 w-4 mr-1" />
                Edit
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => {
                  if (confirm('Are you sure you want to delete this task?')) {
                    deleteMutation.mutate(task.id);
                  }
                }}
              >
                <Trash2 className="h-4 w-4 mr-1" />
                Delete
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Quick Actions */}
          {task.status !== 'completed' && (
            <Card>
              <CardContent className="p-4">
                <div className="flex gap-2 flex-wrap">
                  {task.status === 'pending' && (
                    <Button size="sm" onClick={() => handleStatusChange('in_progress')}>
                      Start Task
                    </Button>
                  )}
                  {task.status === 'in_progress' && (
                    <Button size="sm" onClick={() => handleStatusChange('completed')} className="bg-green-600 hover:bg-green-700">
                      <CheckCircle className="h-4 w-4 mr-1" />
                      Mark Complete
                    </Button>
                  )}
                  {task.status !== 'cancelled' && (
                    <Button size="sm" variant="outline" onClick={() => handleStatusChange('cancelled')}>
                      Cancel Task
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Description */}
          {task.description && (
            <Card>
              <CardContent className="p-4">
                <h3 className="font-semibold mb-2 flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Description
                </h3>
                <p className="text-slate-600 whitespace-pre-wrap">{task.description}</p>
              </CardContent>
            </Card>
          )}

          {/* Details */}
          <div className="grid grid-cols-2 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="space-y-3">
                  {task.assigned_to_name && (
                    <div className="flex items-center gap-2 text-sm">
                      <User className="h-4 w-4 text-slate-400" />
                      <span className="text-slate-600">Assigned to:</span>
                      <span className="font-medium">{task.assigned_to_name}</span>
                    </div>
                  )}
                  {task.start_date && (
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="h-4 w-4 text-slate-400" />
                      <span className="text-slate-600">Start:</span>
                      <span className="font-medium">{format(new Date(task.start_date), 'MMM d, yyyy')}</span>
                    </div>
                  )}
                  {task.due_date && (
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="h-4 w-4 text-slate-400" />
                      <span className="text-slate-600">Due:</span>
                      <span className="font-medium">{format(new Date(task.due_date), 'MMM d, yyyy')}</span>
                    </div>
                  )}
                  {task.completed_date && (
                    <div className="flex items-center gap-2 text-sm">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <span className="text-slate-600">Completed:</span>
                      <span className="font-medium">{format(new Date(task.completed_date), 'MMM d, yyyy')}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="space-y-3">
                  {task.estimated_hours && (
                    <div className="flex items-center gap-2 text-sm">
                      <Clock className="h-4 w-4 text-slate-400" />
                      <span className="text-slate-600">Est. Hours:</span>
                      <span className="font-medium">{task.estimated_hours}h</span>
                    </div>
                  )}
                  {task.actual_hours && (
                    <div className="flex items-center gap-2 text-sm">
                      <Clock className="h-4 w-4 text-slate-400" />
                      <span className="text-slate-600">Actual Hours:</span>
                      <span className="font-medium">{task.actual_hours}h</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="h-4 w-4 text-slate-400" />
                    <span className="text-slate-600">Created:</span>
                    <span className="font-medium">{format(new Date(task.created_date), 'MMM d, yyyy')}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Attachments */}
          <Card>
            <CardContent className="p-4">
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Attachments ({task.attachments?.length || 0})
              </h3>
              <div className="space-y-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => document.getElementById('task-file-upload').click()}
                  disabled={uploading}
                >
                  <Upload className="h-4 w-4 mr-2" />
                  {uploading ? 'Uploading...' : 'Add Attachment'}
                </Button>
                <input
                  id="task-file-upload"
                  type="file"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                {task.attachments?.map((url, index) => (
                  <div key={index} className="flex items-center justify-between bg-slate-50 p-2 rounded">
                    <span className="text-sm text-slate-600 truncate flex-1">
                      {url.split('/').pop()}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => window.open(url, '_blank')}
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Notes */}
          <Card>
            <CardContent className="p-4">
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                Notes & Updates
              </h3>
              <div className="space-y-4">
                <div className="flex gap-2">
                  <Textarea
                    value={noteText}
                    onChange={(e) => setNoteText(e.target.value)}
                    placeholder="Add a note or update..."
                    rows={3}
                  />
                  <Button onClick={handleAddNote} disabled={!noteText.trim()}>
                    Add
                  </Button>
                </div>
                <div className="space-y-3">
                  {task.notes?.map((note, index) => (
                    <div key={index} className="bg-slate-50 p-3 rounded">
                      <div className="flex items-start justify-between mb-2">
                        <span className="font-medium text-sm">{note.author}</span>
                        <span className="text-xs text-slate-500">
                          {format(new Date(note.timestamp), 'MMM d, yyyy HH:mm')}
                        </span>
                      </div>
                      <p className="text-sm text-slate-600 whitespace-pre-wrap">{note.text}</p>
                    </div>
                  ))}
                  {(!task.notes || task.notes.length === 0) && (
                    <p className="text-sm text-slate-500 text-center py-4">No notes yet</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}