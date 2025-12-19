import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertCircle, Eye, CheckCircle2, X, Wrench } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

export default function QueryNotesWidget({ buildingId }) {
  const [selectedNote, setSelectedNote] = useState(null);
  const [managerNotes, setManagerNotes] = useState('');
  const queryClient = useQueryClient();

  const { data: queryNotes = [] } = useQuery({
    queryKey: ['queryNotes', buildingId],
    queryFn: () => buildingId 
      ? base44.entities.QueryNote.filter({ building_id: buildingId, status: 'pending' })
      : base44.entities.QueryNote.filter({ status: 'pending' }),
  });

  const { data: units = [] } = useQuery({
    queryKey: ['units'],
    queryFn: () => base44.entities.Unit.list(),
  });

  const updateNoteMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.QueryNote.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['queryNotes'] });
      toast.success('Query note updated');
      setSelectedNote(null);
      setManagerNotes('');
    },
  });

  const createWorkOrderMutation = useMutation({
    mutationFn: (workOrderData) => base44.entities.WorkOrder.create(workOrderData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workOrders'] });
      queryClient.invalidateQueries({ queryKey: ['queryNotes'] });
      toast.success('Work order created successfully');
      setSelectedNote(null);
      setManagerNotes('');
    },
  });

  const handleStatusChange = (status) => {
    if (selectedNote) {
      updateNoteMutation.mutate({
        id: selectedNote.id,
        data: {
          status: status,
          manager_notes: managerNotes,
          contacted_date: status === 'contacted' ? new Date().toISOString() : selectedNote.contacted_date
        }
      });
    }
  };

  const handleCreateWorkOrder = () => {
    if (selectedNote) {
      const priority = selectedNote.severity === 'critical' ? 'high' : selectedNote.severity === 'defect' ? 'medium' : 'low';
      
      createWorkOrderMutation.mutate({
        building_id: selectedNote.building_id,
        unit_id: selectedNote.unit_id,
        title: `${selectedNote.issue_type} - ${selectedNote.issue_item}`,
        description: `Issue reported by ${selectedNote.resident_name} (${selectedNote.resident_email})\n\nIssue: ${selectedNote.issue_item}\n\nResponsibility: ${selectedNote.bylaw_responsibility || selectedNote.standard_responsibility}\n\n${managerNotes ? `Manager Notes: ${managerNotes}` : ''}`,
        category: 'other',
        priority: priority,
        reported_by: selectedNote.resident_email,
        reported_by_name: selectedNote.resident_name,
        status: 'open'
      });

      updateNoteMutation.mutate({
        id: selectedNote.id,
        data: {
          status: 'resolved',
          manager_notes: `${managerNotes}\n\nWork order created from this query.`,
        }
      });
    }
  };

  const getUnitNumber = (unitId) => {
    const unit = units.find(u => u.id === unitId);
    return unit?.unit_number || 'N/A';
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'critical': return 'bg-red-100 text-red-800 border-red-200';
      case 'defect': return 'bg-orange-100 text-orange-800 border-orange-200';
      default: return 'bg-blue-100 text-blue-800 border-blue-200';
    }
  };

  const pendingNotes = queryNotes.filter(n => n.status === 'pending');

  return (
    <>
      <Card className="border-0 shadow-lg bg-gradient-to-br from-orange-50 to-red-50">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-orange-100 rounded-lg">
                <AlertCircle className="h-4 w-4 text-orange-600" />
              </div>
              <CardTitle className="text-base font-semibold text-slate-900">
                Abandoned Queries
              </CardTitle>
            </div>
            <Badge className="bg-orange-600 text-white">{pendingNotes.length}</Badge>
          </div>
          <p className="text-xs text-slate-600 mt-1">
            Residents viewed issues but didn't submit requests
          </p>
        </CardHeader>
        <CardContent className="space-y-2">
          {pendingNotes.length > 0 ? (
            pendingNotes.slice(0, 5).map((note) => (
              <div 
                key={note.id} 
                className="p-3 bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => {
                  setSelectedNote(note);
                  setManagerNotes(note.manager_notes || '');
                }}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-slate-900">
                      {note.issue_type} - {note.issue_item}
                    </p>
                    <p className="text-xs text-slate-600">
                      Unit {getUnitNumber(note.unit_id)} • {note.resident_name}
                    </p>
                  </div>
                  <Badge className={`text-xs ${getSeverityColor(note.severity)}`}>
                    {note.severity}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-xs text-slate-500">
                    {format(new Date(note.created_date), 'MMM d, h:mm a')}
                  </p>
                  <Button variant="ghost" size="sm" className="h-6 text-xs">
                    <Eye className="h-3 w-3 mr-1" />
                    View
                  </Button>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-8">
              <div className="inline-flex items-center justify-center w-12 h-12 bg-orange-100 rounded-full mb-2">
                <AlertCircle className="h-6 w-6 text-orange-600" />
              </div>
              <p className="text-sm font-medium text-slate-700">No abandoned queries</p>
              <p className="text-xs text-slate-500 mt-1">Residents are submitting their requests!</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detail Dialog */}
      <Dialog open={!!selectedNote} onOpenChange={() => setSelectedNote(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Abandoned Query Details</DialogTitle>
          </DialogHeader>
          {selectedNote && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 p-4 bg-slate-50 rounded-lg">
                <div>
                  <p className="text-xs text-slate-500 mb-1">Resident</p>
                  <p className="font-medium">{selectedNote.resident_name}</p>
                  <p className="text-xs text-slate-600">{selectedNote.resident_email}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 mb-1">Unit / Lot</p>
                  <p className="font-medium">
                    Unit {getUnitNumber(selectedNote.unit_id)} • Lot {selectedNote.lot_number || 'N/A'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 mb-1">Issue Type</p>
                  <p className="font-medium">{selectedNote.issue_type}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 mb-1">Specific Item</p>
                  <p className="font-medium">{selectedNote.issue_item}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 mb-1">Standard Responsibility</p>
                  <p className="font-medium">{selectedNote.standard_responsibility}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 mb-1">Query Date</p>
                  <p className="font-medium">{format(new Date(selectedNote.created_date), 'MMM d, yyyy h:mm a')}</p>
                </div>
              </div>

              {selectedNote.bylaw_found && (
                <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg">
                  <p className="text-sm font-semibold text-purple-900 mb-1">Bylaw Analysis</p>
                  <p className="text-sm text-slate-700">
                    Responsibility: <strong>{selectedNote.bylaw_responsibility}</strong>
                  </p>
                </div>
              )}

              <div className="space-y-2">
                <Label>Severity Level</Label>
                <Select 
                  value={selectedNote.severity} 
                  onValueChange={(v) => setSelectedNote({ ...selectedNote, severity: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="non_critical">Non-Critical</SelectItem>
                    <SelectItem value="critical">Critical</SelectItem>
                    <SelectItem value="defect">Defect</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Manager Notes</Label>
                <Textarea
                  value={managerNotes}
                  onChange={(e) => setManagerNotes(e.target.value)}
                  placeholder="Add notes about follow-up actions..."
                  rows={3}
                />
              </div>

              <DialogFooter className="gap-2">
                <Button 
                  variant="outline" 
                  onClick={() => handleStatusChange('dismissed')}
                  disabled={updateNoteMutation.isPending}
                >
                  <X className="h-4 w-4 mr-2" />
                  Dismiss
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => handleStatusChange('contacted')}
                  disabled={updateNoteMutation.isPending}
                >
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Mark as Contacted
                </Button>
                {(selectedNote.standard_responsibility === 'Owners Corporation' || selectedNote.bylaw_responsibility === 'Owners Corporation') && (
                  <Button 
                    onClick={handleCreateWorkOrder}
                    className="bg-blue-600 hover:bg-blue-700"
                    disabled={createWorkOrderMutation.isPending || updateNoteMutation.isPending}
                  >
                    <Wrench className="h-4 w-4 mr-2" />
                    Create Work Order
                  </Button>
                )}
                <Button 
                  onClick={() => handleStatusChange('resolved')}
                  className="bg-green-600 hover:bg-green-700"
                  disabled={updateNoteMutation.isPending}
                >
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Resolve
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}