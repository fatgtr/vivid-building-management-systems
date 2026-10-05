import React from 'react';
import { Wrench } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import WorkOrderPropertyFields from '@/components/workorders/WorkOrderPropertyFields';
import WorkOrderCategoryFields from '@/components/workorders/WorkOrderCategoryFields';
import WorkOrderAssetField from '@/components/workorders/WorkOrderAssetField';
import WorkOrderJobFields from '@/components/workorders/WorkOrderJobFields';
import WorkOrderDescriptionField from '@/components/workorders/WorkOrderDescriptionField';
import WorkOrderAccessFields from '@/components/workorders/WorkOrderAccessFields';

export default function WorkOrderDetailsCard({ formData, setFormData, buildings, units, selectedPhotos, selectedVideos, editingOrder }) {
  const fields = { formData, setFormData };
  return <Card className="border-2 border-blue-100 shadow-sm">
    <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b">
      <CardTitle className="text-lg flex items-center gap-2"><Wrench className="h-5 w-5 text-blue-600" />Work Order Details</CardTitle>
    </CardHeader>
    <CardContent className="pt-6 space-y-4">
      <div className="md:col-span-2">
        <Label htmlFor="title" className="text-sm font-semibold">Title *</Label>
        <Input id="title" value={formData.title} placeholder="Brief description of the issue" required className="mt-1.5"
          onChange={(event) => { const title = event.target.value; setFormData(previous => ({ ...previous, title })); }} />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <WorkOrderPropertyFields {...fields} buildings={buildings} units={units} />
        <WorkOrderCategoryFields {...fields} />
        <WorkOrderAssetField {...fields} />
        <WorkOrderJobFields {...fields} />
      </div>
      <WorkOrderDescriptionField {...fields} selectedPhotos={selectedPhotos} selectedVideos={selectedVideos} editingOrder={editingOrder} />
      <WorkOrderAccessFields {...fields} />
    </CardContent>
  </Card>;
}