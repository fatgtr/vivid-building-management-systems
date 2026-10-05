import React from 'react';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import DescriptionAIAssistant from '@/components/workorders/DescriptionAIAssistant';

export default function WorkOrderDescriptionField({ formData, setFormData, selectedPhotos, selectedVideos, editingOrder }) {
  return <div className="pt-2">
    <Label htmlFor="description" className="text-sm font-semibold">Description</Label>
    <div className="mt-2">
      <DescriptionAIAssistant title={formData.title} category={formData.main_category}
        selectedPhotos={selectedPhotos} selectedVideos={selectedVideos} currentDescription={formData.description}
        onDescriptionGenerated={(description) => setFormData(previous => ({ ...previous, description }))}
        onTitleGenerated={(title) => setFormData(previous => ({ ...previous, title }))}
        onPriorityGenerated={(priority) => setFormData(previous => ({ ...previous, priority }))}
        generateTitle={!editingOrder} suggestPriority={true} />
    </div>
    <Textarea id="description" value={formData.description} rows={4} placeholder="Detailed description of the issue" className="mt-2"
      onChange={(event) => { const description = event.target.value; setFormData(previous => ({ ...previous, description })); }} />
  </div>;
}