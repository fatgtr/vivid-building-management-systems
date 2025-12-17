import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useBuildingContext } from '@/components/BuildingContext';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ChevronLeft, ChevronRight, Clock, Calendar as CalendarIcon, UserPlus, UserMinus, Plus, Filter, Star } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday, startOfWeek, endOfWeek, isSameDay } from 'date-fns';
import StatusBadge from '@/components/common/StatusBadge';
import { toast } from 'sonner';

export default function CalendarWidget({ workOrders = [], maintenanceSchedules = [], residents = [] }) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [showEventDialog, setShowEventDialog] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);
  const [eventForm, setEventForm] = useState({
    title: '',
    description: '',
    event_date: '',
    event_type: 'general',
    building_id: ''
  });
  const [eventTypeFilter, setEventTypeFilter] = useState({
    calendar_events: true,
    work_orders: true,
    maintenance: true,
    residents: true
  });

  const queryClient = useQueryClient();
  const { selectedBuildingId } = useBuildingContext();

  const { data: buildings = [] } = useQuery({
    queryKey: ['buildings'],
    queryFn: () => base44.entities.Building.list(),
  });

  const { data: calendarEvents = [] } = useQuery({
    queryKey: ['calendarEvents'],
    queryFn: () => base44.entities.CalendarEvent.list(),
  });

  const createEventMutation = useMutation({
    mutationFn: (data) => base44.entities.CalendarEvent.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calendarEvents'] });
      toast.success('Event created successfully');
      setShowEventDialog(false);
      setEventForm({
        title: '',
        description: '',
        event_date: '',
        event_type: 'general',
        building_id: ''
      });
    },
  });
  
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
  
  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });
  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const previousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1));
  };

  const getWorkOrdersForDate = (date) => {
    return workOrders.filter(wo => {
      try {
        if (wo.created_date) {
          const createdDate = new Date(wo.created_date);
          if (isSameDay(createdDate, date)) return true;
        }
        
        if (wo.start_date) {
          const startDate = new Date(wo.start_date);
          if (isSameDay(startDate, date)) return true;
        }
        
        if (wo.due_date) {
          const dueDate = new Date(wo.due_date);
          if (isSameDay(dueDate, date)) return true;
        }
      } catch (e) {
        // Invalid date format
      }
      
      return false;
    });
  };

  const getMaintenanceForDate = (date) => {
    return maintenanceSchedules.filter(ms => {
      try {
        if (!ms.event_start) return false;
        
        const startDate = new Date(ms.event_start);
        const endDate = ms.event_end ? new Date(ms.event_end) : null;
        
        // Check if date is before start date
        if (date < startDate) return false;
        
        // Check if date is after end date (if exists and not never_expire)
        if (!ms.never_expire && endDate && date > endDate) return false;
        
        // Check if exact match with start or end date
        if (isSameDay(startDate, date)) return true;
        if (endDate && isSameDay(endDate, date)) return true;
        
        // Handle recurring events
        if (ms.recurrence === 'one_time') return false;
        
        const dayOfMonth = startDate.getDate();
        const currentDay = date.getDate();
        
        // Monthly - same day every month
        if (ms.recurrence === 'monthly') {
          return currentDay === dayOfMonth;
        }
        
        // Bi-Monthly - every 2 months
        if (ms.recurrence === 'bi_monthly') {
          const monthsDiff = (date.getFullYear() - startDate.getFullYear()) * 12 + (date.getMonth() - startDate.getMonth());
          return currentDay === dayOfMonth && monthsDiff % 2 === 0;
        }
        
        // Quarterly - every 3 months
        if (ms.recurrence === 'quarterly') {
          const monthsDiff = (date.getFullYear() - startDate.getFullYear()) * 12 + (date.getMonth() - startDate.getMonth());
          return currentDay === dayOfMonth && monthsDiff % 3 === 0;
        }
        
        // Half Yearly - every 6 months
        if (ms.recurrence === 'half_yearly') {
          const monthsDiff = (date.getFullYear() - startDate.getFullYear()) * 12 + (date.getMonth() - startDate.getMonth());
          return currentDay === dayOfMonth && monthsDiff % 6 === 0;
        }
        
        // Yearly - same date every year
        if (ms.recurrence === 'yearly') {
          return currentDay === dayOfMonth && date.getMonth() === startDate.getMonth();
        }
      } catch (e) {
        // Invalid date format
      }
      
      return false;
    });
  };

  const getResidentsForDate = (date) => {
    const moveIns = [];
    const moveOuts = [];
    
    residents.forEach(resident => {
      try {
        if (resident.move_in_date && isSameDay(new Date(resident.move_in_date), date)) {
          moveIns.push({ ...resident, eventType: 'move_in' });
        }
        if (resident.move_out_date && isSameDay(new Date(resident.move_out_date), date)) {
          moveOuts.push({ ...resident, eventType: 'move_out' });
        }
      } catch (e) {
        // Invalid date format
      }
    });
    
    return [...moveIns, ...moveOuts];
  };

  const getCalendarEventsForDate = (date) => {
    return calendarEvents.filter(event => {
      try {
        if (event.event_date && isSameDay(new Date(event.event_date), date)) {
          return true;
        }
      } catch (e) {
        // Invalid date format
      }
      return false;
    });
  };

  const handleDateClick = (date) => {
    if (!isSameMonth(date, currentDate)) return;
    
    setSelectedDate(date);
    setEventForm({
      title: '',
      description: '',
      event_date: format(date, "yyyy-MM-dd'T'HH:mm"),
      event_type: 'general',
      building_id: selectedBuildingId || ''
    });
    setShowEventDialog(true);
  };

  const handleCreateEvent = (e) => {
    e.preventDefault();
    createEventMutation.mutate(eventForm);
  };

  const eventTypeConfig = {
    maintenance: { color: 'bg-yellow-500', label: 'Maintenance' },
    inspection: { color: 'bg-purple-500', label: 'Inspection' },
    meeting: { color: 'bg-blue-500', label: 'Meeting' },
    move_in: { color: 'bg-green-500', label: 'Move In' },
    move_out: { color: 'bg-red-500', label: 'Move Out' },
    emergency: { color: 'bg-red-600', label: 'Emergency' },
    general: { color: 'bg-slate-500', label: 'General' }
  };

  return (
    <>
      <Card className="border-0 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-base font-semibold">
            {format(currentDate, 'MMMM yyyy')}
          </CardTitle>
          <div className="flex gap-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 gap-1">
                  <Filter className="h-3 w-3" />
                  Filter
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-64">
                <div className="space-y-3">
                  <p className="font-medium text-sm">Show Events</p>
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="calendar_events"
                        checked={eventTypeFilter.calendar_events}
                        onCheckedChange={(checked) => 
                          setEventTypeFilter({ ...eventTypeFilter, calendar_events: checked })
                        }
                      />
                      <label htmlFor="calendar_events" className="text-sm cursor-pointer">
                        Calendar Events
                      </label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="work_orders"
                        checked={eventTypeFilter.work_orders}
                        onCheckedChange={(checked) => 
                          setEventTypeFilter({ ...eventTypeFilter, work_orders: checked })
                        }
                      />
                      <label htmlFor="work_orders" className="text-sm cursor-pointer">
                        Work Orders
                      </label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="maintenance"
                        checked={eventTypeFilter.maintenance}
                        onCheckedChange={(checked) => 
                          setEventTypeFilter({ ...eventTypeFilter, maintenance: checked })
                        }
                      />
                      <label htmlFor="maintenance" className="text-sm cursor-pointer">
                        Maintenance Schedule
                      </label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="residents"
                        checked={eventTypeFilter.residents}
                        onCheckedChange={(checked) => 
                          setEventTypeFilter({ ...eventTypeFilter, residents: checked })
                        }
                      />
                      <label htmlFor="residents" className="text-sm cursor-pointer">
                        Resident Activity
                      </label>
                    </div>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={previousMonth}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={nextMonth}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
      <CardContent>
        <div className="grid grid-cols-7 gap-1">
          {weekDays.map(day => (
            <div key={day} className="text-center text-xs font-medium text-slate-500 py-1">
              {day}
            </div>
          ))}
          {days.map((day, idx) => {
            const dayWorkOrders = eventTypeFilter.work_orders ? getWorkOrdersForDate(day) : [];
            const dayMaintenance = eventTypeFilter.maintenance ? getMaintenanceForDate(day) : [];
            const dayResidents = eventTypeFilter.residents ? getResidentsForDate(day) : [];
            const dayCalendarEvents = eventTypeFilter.calendar_events ? getCalendarEventsForDate(day) : [];
            const hasEvents = dayWorkOrders.length > 0 || dayMaintenance.length > 0 || dayResidents.length > 0 || dayCalendarEvents.length > 0;
            
            const dayContent = (
              <div
                onClick={() => handleDateClick(day)}
                className={`
                  text-center text-sm py-2 rounded cursor-pointer transition-colors relative group
                  ${!isSameMonth(day, currentDate) ? 'text-slate-300' : 'text-slate-700'}
                  ${isToday(day) ? 'bg-blue-600 text-white font-semibold' : 'hover:bg-slate-100'}
                `}
              >
                {format(day, 'd')}
                {hasEvents && !isToday(day) && (
                  <div className="absolute bottom-0.5 left-1/2 -translate-x-1/2 flex gap-0.5">
                    {[...Array(Math.min(3, dayWorkOrders.length + dayMaintenance.length + dayResidents.length + dayCalendarEvents.length))].map((_, i) => (
                      <div key={i} className="w-1 h-1 rounded-full bg-orange-500" />
                    ))}
                  </div>
                )}
                {isSameMonth(day, currentDate) && (
                  <Plus className="h-3 w-3 absolute top-0.5 right-0.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                )}
              </div>
            );

            if (!hasEvents) {
              return <div key={idx}>{dayContent}</div>;
            }

            return (
              <Popover key={idx}>
                <PopoverTrigger asChild>
                  {dayContent}
                </PopoverTrigger>
                <PopoverContent className="w-80 p-3" align="start">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 mb-3">
                      <CalendarIcon className="h-4 w-4 text-slate-600" />
                      <span className="font-semibold text-sm">{format(day, 'MMM d, yyyy')}</span>
                    </div>
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {dayCalendarEvents.length > 0 && (
                        <>
                          <p className="text-xs font-semibold text-slate-500 uppercase">Events</p>
                          {dayCalendarEvents.map((event) => {
                            const typeConfig = eventTypeConfig[event.event_type] || eventTypeConfig.general;
                            return (
                              <div key={event.id} className="p-2 bg-slate-50 rounded border border-slate-200">
                                <div className="flex items-start justify-between gap-2 mb-1">
                                  <div className="flex items-center gap-2 flex-1">
                                    <div className={`w-2 h-2 rounded-full ${typeConfig.color}`} />
                                    <p className="text-sm font-medium text-slate-900 line-clamp-1">{event.title}</p>
                                  </div>
                                  <StatusBadge status={event.status} className="text-xs" />
                                </div>
                                {event.description && (
                                  <p className="text-xs text-slate-600 line-clamp-2 mb-2">{event.description}</p>
                                )}
                                <div className="flex items-center gap-3 text-xs text-slate-500">
                                  <span className="capitalize">{typeConfig.label}</span>
                                  {event.event_date && (
                                    <span>{format(new Date(event.event_date), 'h:mm a')}</span>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </>
                      )}

                      {dayWorkOrders.length > 0 && (
                        <>
                          <p className="text-xs font-semibold text-slate-500 uppercase">Work Orders</p>
                          {dayWorkOrders.map((wo) => (
                            <div key={wo.id} className="p-2 bg-slate-50 rounded border border-slate-200">
                              <div className="flex items-start justify-between gap-2 mb-1">
                                <p className="text-sm font-medium text-slate-900 line-clamp-1">{wo.title}</p>
                                <StatusBadge status={wo.status} className="text-xs" />
                              </div>
                              {wo.description && (
                                <p className="text-xs text-slate-600 line-clamp-2 mb-2">{wo.description}</p>
                              )}
                              <div className="flex items-center gap-3 text-xs text-slate-500">
                                {wo.priority && (
                                  <span className="capitalize">{wo.priority} priority</span>
                                )}
                                {wo.category && (
                                  <span className="capitalize">{wo.category.replace(/_/g, ' ')}</span>
                                )}
                              </div>
                              {wo.due_date && isSameDay(new Date(wo.due_date), day) && (
                                <div className="flex items-center gap-1 mt-1 text-xs text-orange-600">
                                  <Clock className="h-3 w-3" />
                                  <span>Due today</span>
                                </div>
                              )}
                            </div>
                          ))}
                        </>
                      )}

                      {dayMaintenance.length > 0 && (
                        <>
                          <p className="text-xs font-semibold text-slate-500 uppercase mt-3">Maintenance</p>
                          {dayMaintenance.map((ms) => (
                            <div key={ms.id} className="p-2 bg-blue-50 rounded border border-blue-200">
                              <div className="flex items-start justify-between gap-2 mb-1">
                                <p className="text-sm font-medium text-slate-900 line-clamp-1">{ms.subject}</p>
                                <StatusBadge status={ms.status} className="text-xs" />
                              </div>
                              {ms.description && (
                                <p className="text-xs text-slate-600 line-clamp-2 mb-2">{ms.description}</p>
                              )}
                              <div className="flex items-center gap-3 text-xs text-slate-500">
                                {ms.recurrence && (
                                  <span className="capitalize">{ms.recurrence.replace(/_/g, ' ')}</span>
                                )}
                                {ms.asset && (
                                  <span>{ms.asset}</span>
                                )}
                              </div>
                            </div>
                          ))}
                        </>
                      )}

                      {dayResidents.length > 0 && (
                        <>
                          <p className="text-xs font-semibold text-slate-500 uppercase mt-3">Resident Activity</p>
                          {dayResidents.map((resident, idx) => (
                            <div key={`${resident.id}-${idx}`} className={`p-2 rounded border ${
                              resident.eventType === 'move_in' 
                                ? 'bg-green-50 border-green-200' 
                                : 'bg-red-50 border-red-200'
                            }`}>
                              <div className="flex items-start gap-2 mb-1">
                                {resident.eventType === 'move_in' ? (
                                  <UserPlus className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                                ) : (
                                  <UserMinus className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
                                )}
                                <div className="flex-1">
                                  <p className="text-sm font-medium text-slate-900">
                                    {resident.first_name} {resident.last_name}
                                  </p>
                                  <p className="text-xs text-slate-600">
                                    {resident.eventType === 'move_in' ? 'Moving In' : 'Moving Out'}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">
                                {resident.email && (
                                  <span className="truncate">{resident.email}</span>
                                )}
                                {resident.phone && (
                                  <span>{resident.phone}</span>
                                )}
                              </div>
                              {resident.resident_type && (
                                <span className="inline-block mt-1 text-xs text-slate-600 capitalize">
                                  {resident.resident_type.replace(/_/g, ' ')}
                                </span>
                              )}
                            </div>
                          ))}
                        </>
                      )}
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
            );
          })}
        </div>
      </CardContent>
      </Card>

      {/* Create Event Dialog */}
      <Dialog open={showEventDialog} onOpenChange={setShowEventDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Calendar Event</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateEvent} className="space-y-4">
            <div className="space-y-2">
              <Label>Event Title *</Label>
              <Input
                value={eventForm.title}
                onChange={(e) => setEventForm({ ...eventForm, title: e.target.value })}
                placeholder="e.g., Annual Fire Safety Inspection"
                required
              />
            </div>

            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={eventForm.description}
                onChange={(e) => setEventForm({ ...eventForm, description: e.target.value })}
                placeholder="Event details..."
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Event Type *</Label>
                <Select 
                  value={eventForm.event_type} 
                  onValueChange={(v) => setEventForm({ ...eventForm, event_type: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="general">General</SelectItem>
                    <SelectItem value="maintenance">Maintenance</SelectItem>
                    <SelectItem value="inspection">Inspection</SelectItem>
                    <SelectItem value="meeting">Meeting</SelectItem>
                    <SelectItem value="move_in">Move In</SelectItem>
                    <SelectItem value="move_out">Move Out</SelectItem>
                    <SelectItem value="emergency">Emergency</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Building</Label>
                <Select 
                  value={eventForm.building_id || ''} 
                  onValueChange={(v) => setEventForm({ ...eventForm, building_id: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select building" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={null}>All Buildings</SelectItem>
                    {buildings.map(b => (
                      <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Date & Time *</Label>
              <Input
                type="datetime-local"
                value={eventForm.event_date}
                onChange={(e) => setEventForm({ ...eventForm, event_date: e.target.value })}
                required
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowEventDialog(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createEventMutation.isPending}>
                {createEventMutation.isPending ? 'Creating...' : 'Create Event'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}