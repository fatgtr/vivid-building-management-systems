import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday, startOfWeek, endOfWeek, isSameDay, parseISO } from 'date-fns';

export default function CalendarWidget({ workOrders = [] }) {
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
      const startDate = wo.start_date || wo.created_date;
      const dueDate = wo.due_date;
      
      if (startDate && isSameDay(parseISO(startDate), date)) return true;
      if (dueDate && isSameDay(parseISO(dueDate), date)) return true;
      
      return false;
    });
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
            const hasWorkOrders = dayWorkOrders.length > 0;
            
            return (
              <div
                key={idx}
                className={`
                  text-center text-sm py-2 rounded cursor-pointer transition-colors relative
                  ${!isSameMonth(day, currentDate) ? 'text-slate-300' : 'text-slate-700'}
                  ${isToday(day) ? 'bg-blue-600 text-white font-semibold' : 'hover:bg-slate-100'}
                `}
              >
                {format(day, 'd')}
                {hasWorkOrders && !isToday(day) && (
                  <div className="absolute bottom-0.5 left-1/2 -translate-x-1/2 flex gap-0.5">
                    {dayWorkOrders.slice(0, 3).map((_, i) => (
                      <div key={i} className="w-1 h-1 rounded-full bg-orange-500" />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}