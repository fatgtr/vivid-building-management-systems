import React from 'react';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

export default function WorkOrderAccessFields({ formData, setFormData }) {
  return <>
    <div className="pt-2 border-t border-slate-100">
      <Label className="text-sm font-semibold mb-3 block">Entry Access</Label>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className="text-sm font-medium">Permission to Enter Unit</Label>
          <div className="flex gap-4">
            {[true, false].map(value => <label key={String(value)} className="flex items-center gap-2 cursor-pointer">
              <input type="radio" checked={formData.permission_to_enter === value} className="accent-blue-600"
                onChange={() => setFormData(previous => ({ ...previous, permission_to_enter: value }))} />
              <span className="text-sm">{value ? 'Yes' : 'No'}</span>
            </label>)}
          </div>
        </div>
        <div>
          <Label htmlFor="entry_instructions" className="text-sm font-semibold">Entry Instructions</Label>
          <Textarea id="entry_instructions" value={formData.entry_instructions || ''} rows={2}
            placeholder="e.g., Key under mat, call before entry..." className="mt-1.5"
            onChange={(event) => { const entry_instructions = event.target.value; setFormData(previous => ({ ...previous, entry_instructions })); }} />
        </div>
      </div>
    </div>
    <div>
      <Label htmlFor="notes" className="text-sm font-semibold">Additional Notes</Label>
      <Textarea id="notes" value={formData.notes} rows={2} placeholder="Any additional information" className="mt-1.5"
        onChange={(event) => { const notes = event.target.value; setFormData(previous => ({ ...previous, notes })); }} />
    </div>
  </>;
}