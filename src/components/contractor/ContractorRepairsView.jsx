import React, { useState } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import StatusBadge from '@/components/common/StatusBadge';
import { Building2, MapPin, Calendar, ChevronDown, ChevronUp, Save, Wrench, Clock, CheckCircle2, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

const STATUS_OPTIONS = [
  { value: 'open', label: 'Open' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'on_hold', label: 'On Hold' },
  { value: 'completed', label: 'Completed' },
];

export default function ContractorRepairsView({ workOrders }) {
  const queryClient = useQueryClient();
  const [expandedId, setExpandedId] = useState(null);

  const { data: buildings = [] } = useQuery({
    queryKey: ['buildings'],
    queryFn: () => base44.entities.Building.list(),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.WorkOrder.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contractor-work-orders'] });
      toast.success('Repair status updated');
    },
    onError: () => {
      toast.error('Failed to update status');
    },
  });

  if (!workOrders || workOrders.length === 0) {
    return (
      <Card className="p-8 text-center">
        <CardContent>
          <Wrench className="h-12 w-12 text-slate-400 mx-auto mb-4" />
          <p className="text-slate-600">No assigned repairs</p>
          <p className="text-sm text-slate-500 mt-1">Repairs assigned to you will appear here for quick status updates.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between px-1">
        <p className="text-sm text-slate-500">
          {workOrders.length} assigned repair{workOrders.length !== 1 ? 's' : ''} — update status inline below.
        </p>
      </div>
      {workOrders.map((wo) => {
        const building = buildings.find(b => b.id === wo.building_id);
        const isExpanded = expandedId === wo.id;
        return (
          <RepairRow
            key={wo.id}
            workOrder={wo}
            building={building}
            isExpanded={isExpanded}
            onToggle={() => setExpandedId(isExpanded ? null : wo.id)}
            updateMutation={updateMutation}
          />
        );
      })}
    </div>
  );
}

function RepairRow({ workOrder, building, isExpanded, onToggle, updateMutation }) {
  const [status, setStatus] = useState(workOrder.status);
  const [actualCost, setActualCost] = useState(workOrder.actual_cost || '');
  const [resolutionNotes, setResolutionNotes] = useState(workOrder.resolution_notes || '');

  const isDirty =
    status !== workOrder.status ||
    (actualCost !== (workOrder.actual_cost || '') && actualCost !== '') ||
    resolutionNotes !== (workOrder.resolution_notes || '');

  const handleSave = () => {
    const data = {
      status,
      actual_cost: actualCost ? Number(actualCost) : workOrder.actual_cost,
      resolution_notes: resolutionNotes,
      ...(status === 'completed' && workOrder.status !== 'completed'
        ? { completed_date: new Date().toISOString() }
        : {}),
    };
    updateMutation.mutate({ id: workOrder.id, data });
  };

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-4">
        {/* Summary row */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <h3 className="font-semibold text-slate-900 truncate">{workOrder.title}</h3>
              <StatusBadge status={workOrder.status} />
              {workOrder.priority === 'urgent' && (
                <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs font-medium rounded-full">Urgent</span>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
              {building && (
                <span className="flex items-center gap-1">
                  <Building2 className="h-3.5 w-3.5" />
                  {building.name}
                </span>
              )}
              {workOrder.job_area && (
                <span className="flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5" />
                  {workOrder.job_area}
                </span>
              )}
              {workOrder.due_date && (
                <span className="flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5" />
                  Due {format(new Date(workOrder.due_date), 'MMM d, yyyy')}
                </span>
              )}
            </div>
            {isExpanded && workOrder.description && (
              <p className="text-sm text-slate-600 mt-3 bg-slate-50 p-3 rounded-lg">{workOrder.description}</p>
            )}
          </div>
          <Button variant="ghost" size="icon" onClick={onToggle} className="flex-shrink-0">
            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
        </div>

        {/* Inline status update (always visible) */}
        <div className="mt-4 pt-4 border-t border-slate-100">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
            <div className="space-y-1.5">
              <Label className="text-xs text-slate-500">Repair Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-slate-500">Actual Cost ($)</Label>
              <Input
                type="number"
                value={actualCost}
                onChange={(e) => setActualCost(e.target.value)}
                placeholder="0.00"
              />
            </div>
            <Button
              onClick={handleSave}
              disabled={!isDirty || updateMutation.isPending}
              className="w-full md:w-auto"
            >
              {updateMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Save Update
            </Button>
          </div>

          {isExpanded && (
            <div className="mt-3 space-y-1.5">
              <Label className="text-xs text-slate-500">Resolution Notes</Label>
              <Textarea
                value={resolutionNotes}
                onChange={(e) => setResolutionNotes(e.target.value)}
                placeholder="Describe what was done, parts used, or follow-up required..."
                rows={3}
              />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}