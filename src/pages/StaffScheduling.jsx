import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useBuildingContext } from '@/components/BuildingContext';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Calendar, Plus, Clock, User } from 'lucide-react';
import { format, startOfWeek, endOfWeek, eachDayOfInterval, addWeeks, subWeeks } from 'date-fns';
import { toast } from 'sonner';
import PageHeader from '@/components/common/PageHeader';

export default function StaffScheduling() {
  const { selectedBuildingId } = useBuildingContext();
  const [showDialog, setShowDialog] = useState(false);
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    building_id: selectedBuildingId || '',
    staff_name: '',
    role: 'concierge',
    shift_date: '',
    shift_start: '09:00',
    shift_end: '17:00',
    break_minutes: 30
  });

  const { data: schedules = [] } = useQuery({
    queryKey: ['staffSchedules', selectedBuildingId],
    queryFn: async () => {
      const all = await base44.entities.StaffSchedule.list();
      return selectedBuildingId ? all.filter(s => s.building_id === selectedBuildingId) : all;
    }
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.StaffSchedule.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staffSchedules'] });
      setShowDialog(false);
      toast.success('Shift scheduled');
    }
  });

  const weekStart = startOfWeek(currentWeek, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(currentWeek, { weekStartsOn: 1 });
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });

  const getShiftsForDay = (date) => {
    return schedules.filter(s => {
      const shiftDate = new Date(s.shift_date);
      return shiftDate.toDateString() === date.toDateString();
    });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Staff Scheduling"
        subtitle="Manage staff shifts and roster"
        action={() => setShowDialog(true)}
        actionLabel="Add Shift"
      />

      <div className="flex items-center justify-between">
        <Button variant="outline" onClick={() => setCurrentWeek(subWeeks(currentWeek, 1))}>
          Previous Week
        </Button>
        <h3 className="font-semibold">
          {format(weekStart, 'MMM d')} - {format(weekEnd, 'MMM d, yyyy')}
        </h3>
        <Button variant="outline" onClick={() => setCurrentWeek(addWeeks(currentWeek, 1))}>
          Next Week
        </Button>
      </div>

      <div className="grid grid-cols-7 gap-2">
        {weekDays.map((day) => {
          const shifts = getShiftsForDay(day);
          return (
            <Card key={day.toString()} className="min-h-[200px]">
              <CardContent className="p-3">
                <div className="text-center mb-3">
                  <p className="text-xs font-medium text-slate-500">{format(day, 'EEE')}</p>
                  <p className="text-lg font-bold">{format(day, 'd')}</p>
                </div>
                <div className="space-y-2">
                  {shifts.map((shift) => (
                    <div key={shift.id} className="p-2 bg-blue-50 border border-blue-200 rounded text-xs">
                      <p className="font-semibold text-slate-900">{shift.staff_name}</p>
                      <p className="text-slate-600">{shift.shift_start} - {shift.shift_end}</p>
                      <Badge className="mt-1 text-[10px] h-5 capitalize">{shift.role}</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Staff Shift</DialogTitle>
          </DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); createMutation.mutate(formData); }} className="space-y-4">
            <div>
              <Label>Staff Member *</Label>
              <Input
                value={formData.staff_name}
                onChange={(e) => setFormData({ ...formData, staff_name: e.target.value })}
                required
              />
            </div>
            <div>
              <Label>Role *</Label>
              <Select value={formData.role} onValueChange={(v) => setFormData({ ...formData, role: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="concierge">Concierge</SelectItem>
                  <SelectItem value="security">Security</SelectItem>
                  <SelectItem value="maintenance">Maintenance</SelectItem>
                  <SelectItem value="cleaner">Cleaner</SelectItem>
                  <SelectItem value="manager">Manager</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Date *</Label>
              <Input
                type="date"
                value={formData.shift_date}
                onChange={(e) => setFormData({ ...formData, shift_date: e.target.value })}
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Start Time *</Label>
                <Input
                  type="time"
                  value={formData.shift_start}
                  onChange={(e) => setFormData({ ...formData, shift_start: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label>End Time *</Label>
                <Input
                  type="time"
                  value={formData.shift_end}
                  onChange={(e) => setFormData({ ...formData, shift_end: e.target.value })}
                  required
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? 'Adding...' : 'Add Shift'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}