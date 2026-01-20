import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Calendar, Clock, TrendingUp, CheckCircle2, Sparkles, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

export default function MaintenanceScheduleGenerator({ buildingId }) {
  const [selectedItems, setSelectedItems] = useState([]);
  const queryClient = useQueryClient();

  const { data: schedule, isLoading, refetch } = useQuery({
    queryKey: ['maintenance-schedule-suggestions', buildingId],
    queryFn: async () => {
      const { data } = await base44.functions.invoke('generateMaintenanceSchedule', { buildingId });
      return data;
    },
    enabled: !!buildingId,
    staleTime: 1000 * 60 * 60, // 1 hour
  });

  const createScheduleMutation = useMutation({
    mutationFn: async (items) => {
      const schedules = await Promise.all(items.map(item => 
        base44.entities.MaintenanceSchedule.create({
          building_id: buildingId,
          asset_id: item.asset_id,
          task_title: item.task_title,
          description: item.description,
          frequency: item.frequency,
          estimated_duration_hours: item.estimated_duration_hours,
          priority: item.priority,
          status: 'active',
          ai_generated: true,
          notes: item.notes
        })
      ));
      return schedules;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenance-schedules'] });
      toast.success(`${selectedItems.length} maintenance schedules created`);
      setSelectedItems([]);
    },
    onError: () => {
      toast.error('Failed to create schedules');
    }
  });

  const toggleItem = (item) => {
    if (selectedItems.find(i => i.asset_id === item.asset_id && i.task_title === item.task_title)) {
      setSelectedItems(selectedItems.filter(i => !(i.asset_id === item.asset_id && i.task_title === item.task_title)));
    } else {
      setSelectedItems([...selectedItems, item]);
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'critical': return 'bg-red-100 text-red-800 border-red-300';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-300';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'low': return 'bg-blue-100 text-blue-800 border-blue-300';
      default: return 'bg-slate-100 text-slate-800 border-slate-300';
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Optimised Maintenance Schedule</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-64" />
        </CardContent>
      </Card>
    );
  }

  if (!schedule || !schedule.schedule_items) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Optimised Maintenance Schedule</CardTitle>
        </CardHeader>
        <CardContent>
          <Button onClick={() => refetch()}>Generate Schedule</Button>
        </CardContent>
      </Card>
    );
  }

  const { schedule_items, summary } = schedule;

  return (
    <div className="space-y-6">
      <Card className="border-0 shadow-sm bg-gradient-to-br from-emerald-50 to-teal-50">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-emerald-600" />
                AI-Generated Maintenance Schedule
              </CardTitle>
              <CardDescription>Optimised based on building type, age, and usage patterns</CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => refetch()}>
                Regenerate
              </Button>
              <Button 
                size="sm" 
                onClick={() => createScheduleMutation.mutate(selectedItems)}
                disabled={selectedItems.length === 0}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                Create {selectedItems.length > 0 && `(${selectedItems.length})`} Schedules
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="bg-white rounded-lg p-4 border border-emerald-200">
            <div className="flex items-start gap-2">
              <Sparkles className="h-4 w-4 text-emerald-600 mt-0.5" />
              <div>
                <p className="text-xs font-medium text-emerald-900 mb-1">AI Strategy Summary</p>
                <p className="text-sm text-slate-700">{summary}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-3">
        {schedule_items.map((item, idx) => {
          const isSelected = selectedItems.find(i => i.asset_id === item.asset_id && i.task_title === item.task_title);
          
          return (
            <Card 
              key={idx} 
              className={`cursor-pointer transition-all border-2 ${
                isSelected ? 'border-emerald-500 bg-emerald-50' : 'border-slate-200 hover:border-emerald-300'
              }`}
              onClick={() => toggleItem(item)}
            >
              <CardContent className="p-4">
                <div className="flex items-start gap-4">
                  <div className={`mt-1 h-5 w-5 rounded border-2 flex items-center justify-center ${
                    isSelected ? 'bg-emerald-600 border-emerald-600' : 'border-slate-300'
                  }`}>
                    {isSelected && <CheckCircle2 className="h-3 w-3 text-white" />}
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex items-start justify-between gap-4 mb-2">
                      <div>
                        <h4 className="font-semibold text-slate-900">{item.task_title}</h4>
                        <p className="text-sm text-slate-600">{item.asset_name}</p>
                      </div>
                      <div className="flex gap-2">
                        <Badge className={getPriorityColor(item.priority)}>
                          {item.priority}
                        </Badge>
                        <Badge variant="outline" className="capitalize">
                          {item.frequency.replace(/_/g, ' ')}
                        </Badge>
                      </div>
                    </div>
                    
                    <p className="text-sm text-slate-700 mb-3">{item.description}</p>
                    
                    <div className="flex flex-wrap gap-4 text-xs text-slate-600">
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {item.estimated_duration_hours}h estimated
                      </div>
                      {item.best_month && (
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          Best: {item.best_month}
                        </div>
                      )}
                    </div>
                    
                    {item.notes && (
                      <div className="mt-2 text-xs text-slate-600 bg-slate-50 rounded p-2 border border-slate-200">
                        <AlertCircle className="h-3 w-3 inline mr-1" />
                        {item.notes}
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}