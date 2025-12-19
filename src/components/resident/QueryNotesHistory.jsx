import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { History } from 'lucide-react';
import { format } from 'date-fns';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function QueryNotesHistory({ residentId }) {
  const [selectedNote, setSelectedNote] = useState(null);
  const [severityFilter, setSeverityFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  const { data: allQueryNotes = [], isLoading } = useQuery({
    queryKey: ['allQueryNotes', residentId],
    queryFn: () => residentId ? base44.entities.QueryNote.filter({ unit_id: residentId }) : [],
    enabled: !!residentId,
  });

  const { data: units = [] } = useQuery({
    queryKey: ['units'],
    queryFn: () => base44.entities.Unit.list(),
  });

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

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'contacted': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'resolved': return 'bg-green-100 text-green-800 border-green-200';
      case 'dismissed': return 'bg-gray-100 text-gray-800 border-gray-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const filteredNotes = allQueryNotes.filter(note => {
    const matchesSeverity = severityFilter === 'all' || note.severity === severityFilter;
    const matchesStatus = statusFilter === 'all' || note.status === statusFilter;
    return matchesSeverity && matchesStatus;
  });

  return (
    <>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Query Notes History</h2>
          <div className="flex gap-2">
            <Select value={severityFilter} onValueChange={setSeverityFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Filter by Severity" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Severities</SelectItem>
                <SelectItem value="non_critical">Non-Critical</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
                <SelectItem value="defect">Defect</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Filter by Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="contacted">Contacted</SelectItem>
                <SelectItem value="resolved">Resolved</SelectItem>
                <SelectItem value="dismissed">Dismissed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {isLoading ? (
          <Card>
            <CardContent className="p-6 text-center text-slate-500">
              Loading query notes...
            </CardContent>
          </Card>
        ) : filteredNotes.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <History className="h-12 w-12 mx-auto text-slate-300 mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Query Notes Found</h3>
              <p className="text-slate-600">No abandoned maintenance queries have been logged for your unit.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {filteredNotes.map((note) => (
              <Card 
                key={note.id} 
                className="shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => setSelectedNote(note)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-slate-900">
                        {note.issue_type} - {note.issue_item}
                      </p>
                      <p className="text-xs text-slate-600">
                        Unit: {getUnitNumber(note.unit_id)}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Badge className={`text-xs ${getSeverityColor(note.severity)}`}>
                        {note.severity}
                      </Badge>
                      <Badge className={`text-xs ${getStatusColor(note.status)}`}>
                        {note.status}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span>Queried: {format(new Date(note.created_date), 'MMM d, yyyy h:mm a')}</span>
                    {note.contacted_date && (
                      <span>Contacted: {format(new Date(note.contacted_date), 'MMM d, yyyy')}</span>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Dialog open={!!selectedNote} onOpenChange={() => setSelectedNote(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Query Note Details</DialogTitle>
          </DialogHeader>
          {selectedNote && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 p-4 bg-slate-50 rounded-lg">
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

              {selectedNote.manager_notes && (
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                  <p className="text-sm font-semibold text-slate-900 mb-1">Manager Notes</p>
                  <p className="text-sm text-slate-700">{selectedNote.manager_notes}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}