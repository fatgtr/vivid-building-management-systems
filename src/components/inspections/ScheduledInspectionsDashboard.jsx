import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  Calendar, 
  Building2, 
  Play, 
  Eye, 
  CheckCircle2, 
  Clock,
  Filter,
  Search,
  Loader2
} from 'lucide-react';
import { toast } from 'sonner';
import { format, parseISO, isAfter, isBefore, addDays } from 'date-fns';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export default function ScheduledInspectionsDashboard({ buildingId }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState('all');
  const [buildingFilter, setBuildingFilter] = useState(buildingId || 'all');
  const [rescheduleDialog, setRescheduleDialog] = useState(null);
  const [newDate, setNewDate] = useState('');
  const queryClient = useQueryClient();

  const { data: inspections = [], isLoading } = useQuery({
    queryKey: ['inspections', buildingFilter],
    queryFn: () => {
      if (buildingFilter && buildingFilter !== 'all') {
        return base44.entities.Inspection.filter({ building_id: buildingFilter });
      }
      return base44.entities.Inspection.list();
    },
  });

  const { data: buildings = [] } = useQuery({
    queryKey: ['buildings'],
    queryFn: () => base44.entities.Building.list(),
  });

  const updateInspectionMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Inspection.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inspections'] });
      toast.success('Inspection updated');
    },
    onError: () => {
      toast.error('Failed to update inspection');
    },
  });

  const markAsCompleted = (inspection) => {
    updateInspectionMutation.mutate({
      id: inspection.id,
      data: { 
        status: 'completed',
        actual_date: new Date().toISOString().split('T')[0]
      }
    });
  };

  const handleReschedule = () => {
    if (!newDate || !rescheduleDialog) return;

    updateInspectionMutation.mutate({
      id: rescheduleDialog.id,
      data: { 
        scheduled_date: newDate,
        status: 'scheduled'
      }
    });
    setRescheduleDialog(null);
    setNewDate('');
  };

  const startInspection = (inspection) => {
    window.location.href = `/inspections?id=${inspection.id}&conduct=true`;
  };

  const viewInspection = (inspection) => {
    window.location.href = `/inspections?id=${inspection.id}`;
  };

  // Filter inspections
  const filteredInspections = inspections.filter(inspection => {
    const matchesSearch = !searchQuery || 
      inspection.title?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesBuilding = buildingFilter === 'all' || 
      inspection.building_id === buildingFilter;

    let matchesDate = true;
    if (dateFilter !== 'all' && inspection.scheduled_date) {
      const scheduledDate = parseISO(inspection.scheduled_date);
      const today = new Date();
      
      switch(dateFilter) {
        case 'today':
          matchesDate = format(scheduledDate, 'yyyy-MM-dd') === format(today, 'yyyy-MM-dd');
          break;
        case 'week':
          matchesDate = isAfter(scheduledDate, today) && isBefore(scheduledDate, addDays(today, 7));
          break;
        case 'month':
          matchesDate = isAfter(scheduledDate, today) && isBefore(scheduledDate, addDays(today, 30));
          break;
        case 'overdue':
          matchesDate = isBefore(scheduledDate, today) && inspection.status !== 'completed';
          break;
      }
    }

    return matchesSearch && matchesBuilding && matchesDate;
  });

  // Sort by scheduled date (upcoming first)
  const sortedInspections = [...filteredInspections].sort((a, b) => {
    if (!a.scheduled_date) return 1;
    if (!b.scheduled_date) return -1;
    return new Date(a.scheduled_date) - new Date(b.scheduled_date);
  });

  const getStatusColor = (status) => {
    switch(status) {
      case 'scheduled': return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'in_progress': return 'bg-yellow-50 text-yellow-700 border-yellow-200';
      case 'completed': return 'bg-green-50 text-green-700 border-green-200';
      case 'cancelled': return 'bg-slate-50 text-slate-600 border-slate-200';
      default: return 'bg-slate-50 text-slate-600 border-slate-200';
    }
  };

  const isOverdue = (inspection) => {
    if (!inspection.scheduled_date || inspection.status === 'completed') return false;
    return isBefore(parseISO(inspection.scheduled_date), new Date());
  };

  const getBuildingName = (buildingId) => {
    return buildings.find(b => b.id === buildingId)?.name || 'Unknown Building';
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Loader2 className="h-8 w-8 mx-auto animate-spin text-blue-600" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-blue-600" />
            Scheduled Inspections
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search inspections..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={dateFilter} onValueChange={setDateFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Date filter" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Dates</SelectItem>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="week">Next 7 Days</SelectItem>
                <SelectItem value="month">Next 30 Days</SelectItem>
                <SelectItem value="overdue">Overdue</SelectItem>
              </SelectContent>
            </Select>
            {!buildingId && (
              <Select value={buildingFilter} onValueChange={setBuildingFilter}>
                <SelectTrigger className="w-full sm:w-[200px]">
                  <Building2 className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="All Buildings" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Buildings</SelectItem>
                  {buildings.map(building => (
                    <SelectItem key={building.id} value={building.id}>
                      {building.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Summary Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-xs text-blue-600 font-medium">Scheduled</p>
              <p className="text-2xl font-bold text-blue-700">
                {inspections.filter(i => i.status === 'scheduled').length}
              </p>
            </div>
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <p className="text-xs text-yellow-600 font-medium">In Progress</p>
              <p className="text-2xl font-bold text-yellow-700">
                {inspections.filter(i => i.status === 'in_progress').length}
              </p>
            </div>
            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
              <p className="text-xs text-green-600 font-medium">Completed</p>
              <p className="text-2xl font-bold text-green-700">
                {inspections.filter(i => i.status === 'completed').length}
              </p>
            </div>
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-xs text-red-600 font-medium">Overdue</p>
              <p className="text-2xl font-bold text-red-700">
                {inspections.filter(i => isOverdue(i)).length}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Inspections List */}
      <div className="grid gap-4">
        {sortedInspections.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-12 text-center">
              <Calendar className="h-12 w-12 mx-auto mb-4 text-slate-300" />
              <p className="text-slate-500">No inspections found</p>
            </CardContent>
          </Card>
        ) : (
          sortedInspections.map(inspection => (
            <Card 
              key={inspection.id} 
              className={cn(
                "hover:shadow-md transition-shadow",
                isOverdue(inspection) && "border-red-300 bg-red-50/30"
              )}
            >
              <CardContent className="p-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-semibold truncate">{inspection.title}</h3>
                      <Badge variant="outline" className={getStatusColor(inspection.status)}>
                        {inspection.status}
                      </Badge>
                      {isOverdue(inspection) && (
                        <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                          Overdue
                        </Badge>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-600">
                      <div className="flex items-center gap-1">
                        <Building2 className="h-4 w-4" />
                        <span>{getBuildingName(inspection.building_id)}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        <span>
                          {inspection.scheduled_date 
                            ? format(parseISO(inspection.scheduled_date), 'MMM dd, yyyy')
                            : 'No date set'}
                        </span>
                      </div>
                      {inspection.inspector_name && (
                        <span className="text-slate-500">By: {inspection.inspector_name}</span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    {inspection.status === 'scheduled' && (
                      <>
                        <Button
                          onClick={() => startInspection(inspection)}
                          className="gap-2 bg-blue-600 hover:bg-blue-700"
                        >
                          <Play className="h-4 w-4" />
                          Start
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => {
                            setRescheduleDialog(inspection);
                            setNewDate(inspection.scheduled_date || '');
                          }}
                          className="gap-2"
                        >
                          <Clock className="h-4 w-4" />
                          Reschedule
                        </Button>
                      </>
                    )}
                    {inspection.status === 'in_progress' && (
                      <>
                        <Button
                          onClick={() => startInspection(inspection)}
                          variant="outline"
                          className="gap-2"
                        >
                          <Play className="h-4 w-4" />
                          Continue
                        </Button>
                        <Button
                          onClick={() => markAsCompleted(inspection)}
                          className="gap-2 bg-green-600 hover:bg-green-700"
                        >
                          <CheckCircle2 className="h-4 w-4" />
                          Complete
                        </Button>
                      </>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => viewInspection(inspection)}
                      title="View Details"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Reschedule Dialog */}
      <Dialog open={!!rescheduleDialog} onOpenChange={() => setRescheduleDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reschedule Inspection</DialogTitle>
            <DialogDescription>
              Change the scheduled date for: {rescheduleDialog?.title}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>New Date</Label>
              <Input
                type="date"
                value={newDate}
                onChange={(e) => setNewDate(e.target.value)}
                min={format(new Date(), 'yyyy-MM-dd')}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRescheduleDialog(null)}>
              Cancel
            </Button>
            <Button 
              onClick={handleReschedule} 
              disabled={!newDate || updateInspectionMutation.isPending}
            >
              {updateInspectionMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                'Reschedule'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}