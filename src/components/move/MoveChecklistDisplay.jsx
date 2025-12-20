import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { 
  CheckCircle2, 
  Circle, 
  Upload, 
  FileText, 
  Calendar,
  User,
  AlertCircle,
  ExternalLink,
  Download
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

export default function MoveChecklistDisplay({ checklist, userRole = 'building_manager' }) {
  const [uploadingTask, setUploadingTask] = useState(null);
  const [uploadedFile, setUploadedFile] = useState(null);
  const [uploadNotes, setUploadNotes] = useState('');
  const queryClient = useQueryClient();

  const updateChecklistMutation = useMutation({
    mutationFn: ({ checklistId, data }) => base44.entities.MoveChecklist.update(checklistId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['moveChecklists'] });
      toast.success('Checklist updated');
    },
  });

  const completedTasks = checklist.tasks?.filter(t => t.is_completed).length || 0;
  const totalTasks = checklist.tasks?.length || 0;
  const progress = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

  const handleToggleTask = async (taskId) => {
    const task = checklist.tasks.find(t => t.id === taskId);
    if (!task) return;

    // Check if task requires upload and isn't completed yet
    if (task.requires_upload && !task.is_completed && !task.linked_document_url) {
      setUploadingTask(task);
      return;
    }

    const updatedTasks = checklist.tasks.map(t => {
      if (t.id === taskId) {
        return {
          ...t,
          is_completed: !t.is_completed,
          completed_date: !t.is_completed ? new Date().toISOString() : null,
          completed_by: !t.is_completed ? userRole : null
        };
      }
      return t;
    });

    // Check if all tasks are completed
    const allCompleted = updatedTasks.every(t => t.is_completed);
    const newStatus = allCompleted ? 'completed' : 'in_progress';

    updateChecklistMutation.mutate({
      checklistId: checklist.id,
      data: { tasks: updatedTasks, status: newStatus }
    });
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setUploadedFile(file_url);
      toast.success('File uploaded successfully');
    } catch (error) {
      toast.error('Failed to upload file');
      console.error(error);
    }
  };

  const handleSubmitWithUpload = async () => {
    if (!uploadedFile || !uploadingTask) return;

    const updatedTasks = checklist.tasks.map(t => {
      if (t.id === uploadingTask.id) {
        return {
          ...t,
          is_completed: true,
          completed_date: new Date().toISOString(),
          completed_by: userRole,
          linked_document_url: uploadedFile
        };
      }
      return t;
    });

    // Update dilapidation report fields if applicable
    const updateData = { tasks: updatedTasks };
    
    if (uploadingTask.id === 'dilapidation-before') {
      updateData.dilapidation_report_before = uploadedFile;
    } else if (uploadingTask.id === 'dilapidation-after') {
      updateData.dilapidation_report_after = uploadedFile;
    }

    // Check if all tasks are completed
    const allCompleted = updatedTasks.every(t => t.is_completed);
    if (allCompleted) {
      updateData.status = 'completed';
    } else {
      updateData.status = 'in_progress';
    }

    if (uploadNotes) {
      updateData.notes = (checklist.notes || '') + `\n[${uploadingTask.task_name}]: ${uploadNotes}`;
    }

    updateChecklistMutation.mutate({
      checklistId: checklist.id,
      data: updateData
    });

    setUploadingTask(null);
    setUploadedFile(null);
    setUploadNotes('');
  };

  const getTaskIcon = (task) => {
    if (task.is_completed) {
      return <CheckCircle2 className="h-5 w-5 text-green-600" />;
    }
    return <Circle className="h-5 w-5 text-slate-400" />;
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800 border-red-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-blue-100 text-blue-800 border-blue-200';
      default: return 'bg-slate-100 text-slate-800 border-slate-200';
    }
  };

  const getRoleBadgeColor = (role) => {
    switch (role) {
      case 'tenant': return 'bg-purple-100 text-purple-800';
      case 'managing_agent': return 'bg-blue-100 text-blue-800';
      case 'building_manager': return 'bg-green-100 text-green-800';
      default: return 'bg-slate-100 text-slate-800';
    }
  };

  const myTasks = checklist.tasks?.filter(t => t.assigned_to === userRole) || [];
  const otherTasks = checklist.tasks?.filter(t => t.assigned_to !== userRole) || [];

  return (
    <div className="space-y-6">
      <Card className="border-2 border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50">
        <CardContent className="p-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h2 className="text-2xl font-bold text-slate-900 capitalize">
                  {checklist.move_type?.replace('_', '-')} Checklist
                </h2>
                <Badge className={
                  checklist.status === 'completed' ? 'bg-green-600' :
                  checklist.status === 'in_progress' ? 'bg-blue-600' :
                  'bg-slate-600'
                }>
                  {checklist.status}
                </Badge>
              </div>
              <div className="flex items-center gap-4 text-sm text-slate-600">
                <div className="flex items-center gap-1">
                  <User className="h-4 w-4" />
                  {checklist.resident_name}
                </div>
                <div className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  {format(new Date(checklist.checklist_date), 'MMM d, yyyy')}
                </div>
              </div>
            </div>
            <div className="text-right">
              <p className="text-3xl font-bold text-blue-600">{completedTasks}/{totalTasks}</p>
              <p className="text-sm text-slate-600">Tasks Complete</p>
            </div>
          </div>
          
          <Progress value={progress} className="h-3" />
        </CardContent>
      </Card>

      {/* My Tasks */}
      {myTasks.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5 text-blue-600" />
              My Tasks
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {myTasks.map((task) => (
              <div 
                key={task.id}
                className={`p-4 rounded-lg border-2 transition-all ${
                  task.is_completed 
                    ? 'bg-green-50 border-green-200' 
                    : 'bg-white border-slate-200 hover:border-blue-300'
                }`}
              >
                <div className="flex items-start gap-3">
                  <button
                    onClick={() => handleToggleTask(task.id)}
                    className="mt-0.5 flex-shrink-0"
                    disabled={task.requires_upload && !task.is_completed && !task.linked_document_url}
                  >
                    {getTaskIcon(task)}
                  </button>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <h4 className={`font-semibold text-slate-900 ${task.is_completed ? 'line-through' : ''}`}>
                        {task.task_name}
                      </h4>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <Badge variant="outline" className={getPriorityColor(task.priority)}>
                          {task.priority}
                        </Badge>
                        {task.requires_upload && (
                          <Badge variant="outline" className="bg-orange-100 text-orange-800 border-orange-200">
                            <Upload className="h-3 w-3 mr-1" />
                            Upload Required
                          </Badge>
                        )}
                      </div>
                    </div>
                    
                    <p className="text-sm text-slate-600 mb-3">{task.description}</p>
                    
                    {task.linked_document_url && (
                      <a
                        href={task.linked_document_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-sm text-blue-600 hover:underline"
                      >
                        <FileText className="h-3 w-3" />
                        View Uploaded Document
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                    
                    {task.requires_upload && !task.is_completed && (
                      <Button
                        size="sm"
                        onClick={() => setUploadingTask(task)}
                        className="mt-2"
                      >
                        <Upload className="h-4 w-4 mr-2" />
                        Upload Document
                      </Button>
                    )}
                    
                    {task.is_completed && task.completed_date && (
                      <p className="text-xs text-slate-500 mt-2">
                        Completed on {format(new Date(task.completed_date), 'MMM d, yyyy')}
                        {task.completed_by && ` by ${task.completed_by.replace('_', ' ')}`}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Other Tasks */}
      {otherTasks.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-slate-600" />
              Other Tasks
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {otherTasks.map((task) => (
              <div 
                key={task.id}
                className={`p-4 rounded-lg border ${
                  task.is_completed 
                    ? 'bg-green-50 border-green-200' 
                    : 'bg-slate-50 border-slate-200'
                }`}
              >
                <div className="flex items-start gap-3">
                  {getTaskIcon(task)}
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <h4 className={`font-semibold text-slate-900 ${task.is_completed ? 'line-through' : ''}`}>
                        {task.task_name}
                      </h4>
                      <Badge className={getRoleBadgeColor(task.assigned_to)}>
                        {task.assigned_to?.replace('_', ' ')}
                      </Badge>
                    </div>
                    
                    <p className="text-sm text-slate-600">{task.description}</p>
                    
                    {task.is_completed && task.completed_date && (
                      <p className="text-xs text-slate-500 mt-2">
                        Completed on {format(new Date(task.completed_date), 'MMM d, yyyy')}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Dilapidation Reports Summary */}
      {(checklist.dilapidation_report_before || checklist.dilapidation_report_after) && (
        <Card className="border-2 border-orange-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-orange-600" />
              Dilapidation Reports
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {checklist.dilapidation_report_before && (
              <div className="flex items-center justify-between p-3 bg-orange-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-orange-600" />
                  <span className="font-medium">Pre-Move Report</span>
                </div>
                <a
                  href={checklist.dilapidation_report_before}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline flex items-center gap-1"
                >
                  <Download className="h-4 w-4" />
                  Download
                </a>
              </div>
            )}
            {checklist.dilapidation_report_after && (
              <div className="flex items-center justify-between p-3 bg-orange-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-orange-600" />
                  <span className="font-medium">Post-Move Report</span>
                </div>
                <a
                  href={checklist.dilapidation_report_after}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline flex items-center gap-1"
                >
                  <Download className="h-4 w-4" />
                  Download
                </a>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Upload Dialog */}
      <Dialog open={!!uploadingTask} onOpenChange={() => {
        setUploadingTask(null);
        setUploadedFile(null);
        setUploadNotes('');
      }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{uploadingTask?.task_name}</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-sm text-slate-700">{uploadingTask?.description}</p>
            </div>

            <div>
              <Label>Upload Document</Label>
              <div className="mt-2">
                <Button variant="outline" className="w-full" asChild>
                  <label className="cursor-pointer">
                    <Upload className="h-4 w-4 mr-2" />
                    Choose File
                    <input
                      type="file"
                      className="hidden"
                      onChange={handleFileUpload}
                      accept=".pdf,.jpg,.jpeg,.png"
                    />
                  </label>
                </Button>
              </div>
              {uploadedFile && (
                <p className="text-sm text-green-600 mt-2 flex items-center gap-1">
                  <CheckCircle2 className="h-4 w-4" />
                  File uploaded successfully
                </p>
              )}
            </div>

            <div>
              <Label>Notes (Optional)</Label>
              <Textarea
                value={uploadNotes}
                onChange={(e) => setUploadNotes(e.target.value)}
                placeholder="Add any additional notes or observations..."
                rows={3}
                className="mt-2"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setUploadingTask(null);
              setUploadedFile(null);
              setUploadNotes('');
            }}>
              Cancel
            </Button>
            <Button 
              onClick={handleSubmitWithUpload}
              disabled={!uploadedFile}
            >
              Submit & Mark Complete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}