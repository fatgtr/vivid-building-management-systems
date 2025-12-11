import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ChevronLeft, ChevronRight, Clock, Calendar as CalendarIcon, UserPlus, UserMinus } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday, startOfWeek, endOfWeek, isSameDay } from 'date-fns';
import StatusBadge from '@/components/common/StatusBadge';

export default function CalendarWidget({ workOrders = [], maintenanceSchedules = [], residents = [] }) {
  const [currentDate, setCurrentDate] = useState(new Date());
  
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

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-base font-semibold">
          {format(currentDate, 'MMMM yyyy')}
        </CardTitle>
        <div className="flex gap-1">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={previousMonth}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={nextMonth}>
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
            const dayWorkOrders = getWorkOrdersForDate(day);
            const dayMaintenance = getMaintenanceForDate(day);
            const dayResidents = getResidentsForDate(day);
            const hasEvents = dayWorkOrders.length > 0 || dayMaintenance.length > 0 || dayResidents.length > 0;
            
            const dayContent = (
              <div
                className={`
                  text-center text-sm py-2 rounded cursor-pointer transition-colors relative
                  ${!isSameMonth(day, currentDate) ? 'text-slate-300' : 'text-slate-700'}
                  ${isToday(day) ? 'bg-blue-600 text-white font-semibold' : 'hover:bg-slate-100'}
                `}
              >
                {format(day, 'd')}
                {hasEvents && !isToday(day) && (
                  <div className="absolute bottom-0.5 left-1/2 -translate-x-1/2 flex gap-0.5">
                    {[...Array(Math.min(3, dayWorkOrders.length + dayMaintenance.length + dayResidents.length))].map((_, i) => (
                      <div key={i} className="w-1 h-1 rounded-full bg-orange-500" />
                    ))}
                  </div>
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
  );
}