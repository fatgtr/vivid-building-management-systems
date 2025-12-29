import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from 'sonner';
import { format } from 'date-fns';
import { 
  Calendar, 
  Clock, 
  CheckCircle, 
  FileText, 
  Upload,
  ChevronDown,
  ChevronUp,
  MessageSquare
} from 'lucide-react';

export default function ContractorTaskCard({ task }) {
  const queryClient = useQueryClient();
  const [expanded, setExpanded] = useState(false);
  const [noteText, setNoteText] = useState('');
  const [uploading, setUploading] = useState(false);
  const [user, setUser] = useState(null);

  React.useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Task.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['contractor-tasks']);
      toast.success('Task updated successfully');
    },
    onError: (error) => {
      toast.error('Failed to update task: ' + error.message);
    },
  });

  const handleMarkComplete = () => {
    updateMutation.mutate({
      id: task.id,
      data: {
        status: 'completed',
        completed_date: new Date().toISOString().split('T')[0],
      },
    });
  };

  const handleAddNote = () => {
    if (!noteText.trim()) return;

    const newNote = {
      text: noteText,
      author: user?.full_name || 'Contractor',
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

  const isOverdue = task.due_date && new Date(task.due_date) < new Date() && task.status !== 'completed';

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex-1">
            <h3 className="font-semibold text-slate-900 mb-1">{task.title}</h3>
            {task.description && (
              <p className="text-sm text-slate-600 line-clamp-2">{task.description}</p>
            )}
          </div>
          <div className="flex flex-col gap-2">
            <Badge className={priorityColors[task.priority]}>
              {task.priority}
            </Badge>
            <Badge className={statusColors[task.status]}>
              {task.status.replace('_', ' ')}
            </Badge>
          </div>
        </div>

        <div className="flex items-center gap-4 text-xs text-slate-500 mb-3">
          {task.due_date && (
            <div className={`flex items-center gap-1 ${isOverdue ? 'text-red-600 font-medium' : ''}`}>
              <Calendar className="h-3 w-3" />
              Due: {format(new Date(task.due_date), 'MMM d, yyyy')}
            </div>
          )}
          {task.estimated_hours && (
            <div className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {task.estimated_hours}h estimated
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          {task.status !== 'completed' && (
            <Button 
              size="sm" 
              onClick={handleMarkComplete}
              disabled={updateMutation.isPending}
              className="bg-green-600 hover:bg-green-700"
            >
              <CheckCircle className="h-4 w-4 mr-1" />
              Mark Complete
            </Button>
          )}
          <Button 
            size="sm" 
            variant="outline"
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            {expanded ? 'Less' : 'More'}
          </Button>
        </div>

        {expanded && (
          <div className="mt-4 pt-4 border-t space-y-4">
            {/* Attachments */}
            <div>
              <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Attachments
              </h4>
              <div className="space-y-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => document.getElementById(`file-upload-${task.id}`).click()}
                  disabled={uploading}
                >
                  <Upload className="h-4 w-4 mr-2" />
                  {uploading ? 'Uploading...' : 'Add File'}
                </Button>
                <input
                  id={`file-upload-${task.id}`}
                  type="file"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                {task.attachments?.map((url, index) => (
                  <div key={index} className="flex items-center justify-between bg-slate-50 p-2 rounded text-sm">
                    <span className="text-slate-600 truncate flex-1">{url.split('/').pop()}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => window.open(url, '_blank')}
                    >
                      View
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            {/* Notes */}
            <div>
              <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                Notes
              </h4>
              <div className="space-y-2">
                <div className="flex gap-2">
                  <Textarea
                    value={noteText}
                    onChange={(e) => setNoteText(e.target.value)}
                    placeholder="Add a note..."
                    rows={2}
                    className="text-sm"
                  />
                  <Button 
                    size="sm"
                    onClick={handleAddNote}
                    disabled={!noteText.trim() || updateMutation.isPending}
                  >
                    Add
                  </Button>
                </div>
                {task.notes?.map((note, index) => (
                  <div key={index} className="bg-slate-50 p-2 rounded text-sm">
                    <div className="flex items-start justify-between mb-1">
                      <span className="font-medium text-xs">{note.author}</span>
                      <span className="text-xs text-slate-500">
                        {format(new Date(note.timestamp), 'MMM d, HH:mm')}
                      </span>
                    </div>
                    <p className="text-slate-600 whitespace-pre-wrap">{note.text}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}