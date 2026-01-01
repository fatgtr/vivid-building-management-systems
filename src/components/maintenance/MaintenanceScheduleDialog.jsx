import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Calendar, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const recurrenceOptions = [
  { value: 'none', label: 'One-time' },
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'half_yearly', label: 'Half-Yearly' },
  { value: 'yearly', label: 'Yearly' }
];

const contractorTypes = [
  { value: 'plumbing', label: 'Plumbing' },
  { value: 'electrical', label: 'Electrical' },
  { value: 'hvac', label: 'HVAC' },
  { value: 'appliance', label: 'Appliance' },
  { value: 'structural', label: 'Structural' },
  { value: 'pest_control', label: 'Pest Control' },
  { value: 'cleaning', label: 'Cleaning' },
  { value: 'landscaping', label: 'Landscaping' },
  { value: 'security', label: 'Security' },
  { value: 'general', label: 'General' }
];

export default function MaintenanceScheduleDialog({ open, onClose, schedule, buildingId }) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState(schedule || {
    building_id: buildingId,
    subject: '',
    description: '',
    scheduled_date: '',
    recurrence: 'none',
    recurrence_end_date: '',
    assigned_contractor_id: '',
    assigned_contractor_type: '',
    notification_interval_days: [7, 3],
    status: 'active',
    notes: ''
  });

  const { data: contractors = [] } = useQuery({
    queryKey: ['contractors'],
    queryFn: () => base44.entities.Contractor.list()
  });

  const { data: assets = [] } = useQuery({
    queryKey: ['assets', buildingId],
    queryFn: () => buildingId ? base44.entities.Asset.filter({ building_id: buildingId }) : []
  });

  const saveMutation = useMutation({
    mutationFn: (data) => {
      const payload = {
        ...data,
        next_due_date: data.next_due_date || data.scheduled_date
      };
      return schedule 
        ? base44.entities.MaintenanceSchedule.update(schedule.id, payload)
        : base44.entities.MaintenanceSchedule.create(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenanceSchedules'] });
      toast.success(schedule ? 'Schedule updated' : 'Schedule created');
      onClose();
    },
    onError: (error) => {
      toast.error('Failed to save: ' + error.message);
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    saveMutation.mutate(formData);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{schedule ? 'Edit' : 'Create'} Maintenance Schedule</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Subject *</Label>
            <Input
              value={formData.subject}
              onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
              required
              placeholder="e.g., Quarterly HVAC Inspection"
            />
          </div>

          <div>
            <Label>Description</Label>
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              placeholder="Detailed description of maintenance work..."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Scheduled Date *</Label>
              <Input
                type="date"
                value={formData.scheduled_date}
                onChange={(e) => setFormData({ ...formData, scheduled_date: e.target.value })}
                required
              />
            </div>

            <div>
              <Label>Recurrence</Label>
              <Select
                value={formData.recurrence}
                onValueChange={(value) => setFormData({ ...formData, recurrence: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {recurrenceOptions.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {formData.recurrence !== 'none' && (
            <div>
              <Label>Recurrence End Date (Optional)</Label>
              <Input
                type="date"
                value={formData.recurrence_end_date}
                onChange={(e) => setFormData({ ...formData, recurrence_end_date: e.target.value })}
              />
            </div>
          )}

          <div>
            <Label>Asset (Optional)</Label>
            <Select
              value={formData.asset_id}
              onValueChange={(value) => setFormData({ ...formData, asset_id: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select asset" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={null}>No specific asset</SelectItem>
                {assets.map(asset => (
                  <SelectItem key={asset.id} value={asset.id}>{asset.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-3">
            <Label>Contractor Assignment</Label>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs text-slate-500">Specific Contractor</Label>
                <Select
                  value={formData.assigned_contractor_id}
                  onValueChange={(value) => setFormData({ 
                    ...formData, 
                    assigned_contractor_id: value,
                    assigned_contractor_type: '' 
                  })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select contractor" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={null}>None</SelectItem>
                    {contractors.map(c => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.company_name}
                        {c.compliance_score && (
                          <Badge variant="outline" className="ml-2">
                            {c.compliance_score}%
                          </Badge>
                        )}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs text-slate-500">Or Contractor Type</Label>
                <Select
                  value={formData.assigned_contractor_type}
                  onValueChange={(value) => setFormData({ 
                    ...formData, 
                    assigned_contractor_type: value,
                    assigned_contractor_id: '' 
                  })}
                  disabled={!!formData.assigned_contractor_id}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={null}>None</SelectItem>
                    {contractorTypes.map(type => (
                      <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <p className="text-xs text-slate-500">
              Choose a specific contractor OR a contractor type. The system will assign a compliant contractor of that type.
            </p>
          </div>

          <div>
            <Label>Notes</Label>
            <Textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={2}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={saveMutation.isPending}>
              {saveMutation.isPending ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Saving...</>
              ) : (
                schedule ? 'Update' : 'Create'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}