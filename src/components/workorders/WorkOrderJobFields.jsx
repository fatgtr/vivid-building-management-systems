import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const priorities = [
  { value: 'low', label: 'Low', color: 'h-2 w-2 rounded-full bg-slate-400' },
  { value: 'medium', label: 'Medium', color: 'h-2 w-2 rounded-full bg-blue-500' },
  { value: 'high', label: 'High', color: 'h-2 w-2 rounded-full bg-orange-500' },
  { value: 'urgent', label: 'Urgent', color: 'h-2 w-2 rounded-full bg-red-500' },
];
const statuses = { open: 'Open', in_progress: 'In Progress', on_hold: 'On Hold', completed: 'Completed', cancelled: 'Cancelled' };

export default function WorkOrderJobFields({ formData, setFormData }) {
  return <>
    <div>
      <Label htmlFor="priority" className="text-sm font-semibold">Priority</Label>
      <Select value={formData.priority} onValueChange={(priority) => setFormData(previous => ({ ...previous, priority }))}>
        <SelectTrigger id="priority" className="mt-1.5"><SelectValue /></SelectTrigger>
        <SelectContent>{priorities.map(priority => <SelectItem key={priority.value} value={priority.value}>
          <div className="flex items-center gap-2"><div className={priority.color} />{priority.label}</div>
        </SelectItem>)}</SelectContent>
      </Select>
    </div>
    <div>
      <Label htmlFor="status" className="text-sm font-semibold">Status</Label>
      <Select value={formData.status} onValueChange={(status) => setFormData(previous => ({ ...previous, status }))}>
        <SelectTrigger id="status" className="mt-1.5"><SelectValue /></SelectTrigger>
        <SelectContent>{Object.entries(statuses).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent>
      </Select>
    </div>
    <div>
      <Label htmlFor="due_date" className="text-sm font-semibold">Due Date</Label>
      <Input id="due_date" type="date" value={formData.due_date} className="mt-1.5"
        onChange={(event) => { const due_date = event.target.value; setFormData(previous => ({ ...previous, due_date })); }} />
    </div>
  </>;
}