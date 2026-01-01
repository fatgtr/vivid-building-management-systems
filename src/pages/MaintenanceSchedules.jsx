import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import PageHeader from '@/components/common/PageHeader';
import MaintenanceScheduleDialog from '@/components/maintenance/MaintenanceScheduleDialog';
import { useBuildingContext } from '@/components/BuildingContext';
import { Calendar, Clock, Repeat, Building2, MoreVertical, Edit, Trash2, Play, Pause } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
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

export default function MaintenanceSchedules() {
  const { selectedBuildingId, managedBuildings } = useBuildingContext();
  const [showDialog, setShowDialog] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState(null);
  const [deleteSchedule, setDeleteSchedule] = useState(null);
  const queryClient = useQueryClient();

  const { data: schedules = [], isLoading } = useQuery({
    queryKey: ['maintenanceSchedules', selectedBuildingId],
    queryFn: () => selectedBuildingId 
      ? base44.entities.MaintenanceSchedule.filter({ building_id: selectedBuildingId })
      : base44.entities.MaintenanceSchedule.list()
  });

  const { data: contractors = [] } = useQuery({
    queryKey: ['contractors'],
    queryFn: () => base44.entities.Contractor.list()
  });

  const { data: buildings = [] } = useQuery({
    queryKey: ['buildings'],
    queryFn: () => base44.entities.Building.list()
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.MaintenanceSchedule.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenanceSchedules'] });
      toast.success('Schedule deleted');
      setDeleteSchedule(null);
    }
  });

  const toggleStatusMutation = useMutation({
    mutationFn: ({ id, status }) => base44.entities.MaintenanceSchedule.update(id, { 
      status: status === 'active' ? 'inactive' : 'active' 
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenanceSchedules'] });
      toast.success('Status updated');
    }
  });

  const handleEdit = (schedule) => {
    setEditingSchedule(schedule);
    setShowDialog(true);
  };

  const handleClose = () => {
    setShowDialog(false);
    setEditingSchedule(null);
  };

  const getContractorName = (schedule) => {
    if (schedule.assigned_contractor_id) {
      const contractor = contractors.find(c => c.id === schedule.assigned_contractor_id);
      return contractor?.company_name || 'Unknown';
    }
    if (schedule.assigned_contractor_type) {
      return `Any ${schedule.assigned_contractor_type.replace(/_/g, ' ')}`;
    }
    return 'Not assigned';
  };

  const getBuildingName = (buildingId) => {
    const building = buildings.find(b => b.id === buildingId);
    return building?.name || 'Unknown Building';
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Maintenance Schedules"
        subtitle={`${schedules.filter(s => s.status === 'active').length} active schedules`}
        action={() => setShowDialog(true)}
        actionLabel="Create Schedule"
        actionIcon={Calendar}
      />

      {isLoading ? (
        <Card><CardContent className="p-12 text-center">Loading...</CardContent></Card>
      ) : schedules.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Calendar className="h-12 w-12 text-slate-400 mx-auto mb-4" />
            <p className="text-slate-600 mb-4">No maintenance schedules yet</p>
            <Button onClick={() => setShowDialog(true)}>
              <Calendar className="h-4 w-4 mr-2" />
              Create First Schedule
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {schedules.map((schedule) => (
            <Card key={schedule.id} className="hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg mb-2">{schedule.subject}</h3>
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant={schedule.status === 'active' ? 'default' : 'secondary'}>
                        {schedule.status}
                      </Badge>
                      {schedule.recurrence !== 'none' && (
                        <Badge variant="outline" className="flex items-center gap-1">
                          <Repeat className="h-3 w-3" />
                          {schedule.recurrence}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleEdit(schedule)}>
                        <Edit className="h-4 w-4 mr-2" /> Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => toggleStatusMutation.mutate({ 
                        id: schedule.id, 
                        status: schedule.status 
                      })}>
                        {schedule.status === 'active' ? (
                          <><Pause className="h-4 w-4 mr-2" /> Pause</>
                        ) : (
                          <><Play className="h-4 w-4 mr-2" /> Activate</>
                        )}
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => setDeleteSchedule(schedule)}
                        className="text-red-600"
                      >
                        <Trash2 className="h-4 w-4 mr-2" /> Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2 text-slate-600">
                    <Building2 className="h-4 w-4" />
                    {getBuildingName(schedule.building_id)}
                  </div>
                  <div className="flex items-center gap-2 text-slate-600">
                    <Calendar className="h-4 w-4" />
                    Next due: {format(new Date(schedule.next_due_date || schedule.scheduled_date), 'PPP')}
                  </div>
                  <div className="flex items-center gap-2 text-slate-600">
                    <Clock className="h-4 w-4" />
                    {getContractorName(schedule)}
                  </div>
                  {schedule.task_ids?.length > 0 && (
                    <div className="pt-2 mt-2 border-t">
                      <p className="text-xs text-slate-500">
                        {schedule.task_ids.length} task{schedule.task_ids.length !== 1 ? 's' : ''} generated
                      </p>
                    </div>
                  )}
                </div>

                {schedule.description && (
                  <p className="text-sm text-slate-500 mt-3 line-clamp-2">
                    {schedule.description}
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {showDialog && (
        <MaintenanceScheduleDialog
          open={showDialog}
          onClose={handleClose}
          schedule={editingSchedule}
          buildingId={selectedBuildingId}
        />
      )}

      <AlertDialog open={!!deleteSchedule} onOpenChange={() => setDeleteSchedule(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Schedule</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deleteSchedule?.subject}"? This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteMutation.mutate(deleteSchedule.id)}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}