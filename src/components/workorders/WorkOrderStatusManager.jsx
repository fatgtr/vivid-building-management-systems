import React from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Clock, AlertCircle, XCircle, Pause } from 'lucide-react';
import { toast } from 'sonner';

export default function WorkOrderStatusManager({ workOrder }) {
  const queryClient = useQueryClient();

  const updateStatusMutation = useMutation({
    mutationFn: async (newStatus) => {
      const updateData = { ...workOrder, status: newStatus };
      if (newStatus === 'completed' && !workOrder.completed_date) {
        updateData.completed_date = new Date().toISOString().split('T')[0];
      }
      return base44.entities.WorkOrder.update(workOrder.id, updateData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workOrders'] });
      toast.success('Status updated successfully');
    }
  });

  const statuses = [
    { value: 'open', label: 'Open', icon: AlertCircle, color: 'bg-orange-100 text-orange-700' },
    { value: 'in_progress', label: 'In Progress', icon: Clock, color: 'bg-blue-100 text-blue-700' },
    { value: 'on_hold', label: 'On Hold', icon: Pause, color: 'bg-yellow-100 text-yellow-700' },
    { value: 'completed', label: 'Completed', icon: CheckCircle2, color: 'bg-green-100 text-green-700' },
    { value: 'cancelled', label: 'Cancelled', icon: XCircle, color: 'bg-red-100 text-red-700' }
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">Update Status</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-2">
          {statuses.map(status => {
            const Icon = status.icon;
            const isCurrent = workOrder.status === status.value;
            return (
              <Button
                key={status.value}
                variant={isCurrent ? "default" : "outline"}
                onClick={() => updateStatusMutation.mutate(status.value)}
                disabled={isCurrent || updateStatusMutation.isPending}
                className={isCurrent ? status.color : ''}
              >
                <Icon className="h-4 w-4 mr-2" />
                {status.label}
              </Button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}