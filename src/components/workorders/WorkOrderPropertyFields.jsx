import React from 'react';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function WorkOrderPropertyFields({ formData, setFormData, buildings, units }) {
  return <>
    <div>
      <Label htmlFor="building_id" className="text-sm font-semibold">Building *</Label>
      <Select value={formData.building_id} onValueChange={(building_id) => setFormData(previous => ({ ...previous, building_id, unit_id: '', asset_id: '', is_common_area: false }))}>
        <SelectTrigger id="building_id" className="mt-1.5"><SelectValue placeholder="Select building" /></SelectTrigger>
        <SelectContent>{buildings.map(building => <SelectItem key={building.id} value={building.id}>{building.name}</SelectItem>)}</SelectContent>
      </Select>
    </div>
    <div>
      <div className="flex items-center space-x-2 mb-2">
        <Checkbox id="is_common_area" checked={formData.is_common_area} disabled={!formData.building_id}
          onCheckedChange={(is_common_area) => setFormData(previous => ({ ...previous, is_common_area, unit_id: '' }))} />
        <Label htmlFor="is_common_area" className="cursor-pointer text-sm font-medium">Common Area</Label>
      </div>
      {!formData.is_common_area && <>
        <Label htmlFor="unit_id" className="text-sm font-semibold">Unit</Label>
        <Select value={formData.unit_id} disabled={!formData.building_id}
          onValueChange={(unit_id) => setFormData(previous => ({ ...previous, unit_id }))}>
          <SelectTrigger id="unit_id" className="mt-1.5"><SelectValue placeholder="Select unit (optional)" /></SelectTrigger>
          <SelectContent>{units.map(unit => <SelectItem key={unit.id} value={unit.id}>Unit {unit.unit_number}</SelectItem>)}</SelectContent>
        </Select>
      </>}
    </div>
  </>;
}