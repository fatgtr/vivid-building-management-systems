import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FileText, Download, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function DocumentGeneratorDialog({ 
  open, 
  onOpenChange, 
  buildingId, 
  residentId, 
  unitId,
  workOrderId,
  inspectionId,
  templateType 
}) {
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [customVariables, setCustomVariables] = useState({});
  const [generating, setGenerating] = useState(false);

  const { data: templates = [] } = useQuery({
    queryKey: ['documentTemplates', buildingId, templateType],
    queryFn: async () => {
      const all = await base44.entities.DocumentTemplate.list();
      return all.filter(t => 
        t.status === 'active' && 
        (!templateType || t.template_type === templateType) &&
        (!t.building_id || t.building_id === buildingId)
      );
    }
  });

  const { data: residents = [] } = useQuery({
    queryKey: ['residents', buildingId],
    queryFn: async () => {
      if (!buildingId) return [];
      return await base44.entities.Resident.filter({ building_id: buildingId });
    },
    enabled: !!buildingId
  });

  const { data: units = [] } = useQuery({
    queryKey: ['units', buildingId],
    queryFn: async () => {
      if (!buildingId) return [];
      return await base44.entities.Unit.filter({ building_id: buildingId });
    },
    enabled: !!buildingId
  });

  const [formData, setFormData] = useState({
    building_id: buildingId || '',
    resident_id: residentId || '',
    unit_id: unitId || '',
    work_order_id: workOrderId || '',
    inspection_id: inspectionId || ''
  });

  const selectedTemplateData = templates.find(t => t.id === selectedTemplate);

  const handleGenerate = async () => {
    if (!selectedTemplate) {
      toast.error('Please select a template');
      return;
    }

    setGenerating(true);
    try {
      const response = await base44.functions.invoke('generateDocument', {
        template_id: selectedTemplate,
        ...formData,
        custom_variables: customVariables
      });

      if (selectedTemplateData?.output_format === 'pdf') {
        // Response.data is the PDF blob
        const blob = new Blob([response.data], { type: 'application/pdf' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${selectedTemplateData.name.replace(/\s+/g, '_')}_${Date.now()}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        a.remove();
        toast.success('Document generated and downloaded');
      } else {
        // HTML/text format - could open in new window or copy to clipboard
        const content = response.data.content;
        const blob = new Blob([content], { type: 'text/html' });
        const url = window.URL.createObjectURL(blob);
        window.open(url, '_blank');
        toast.success('Document generated');
      }

      onOpenChange(false);
    } catch (error) {
      console.error('Error generating document:', error);
      toast.error(error.message || 'Failed to generate document');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-blue-600" />
            Generate Document
          </DialogTitle>
          <DialogDescription>
            Select a template and provide the required information to generate a document
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Template</Label>
            <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
              <SelectTrigger>
                <SelectValue placeholder="Select a template" />
              </SelectTrigger>
              <SelectContent>
                {templates.map((template) => (
                  <SelectItem key={template.id} value={template.id}>
                    {template.name} ({template.template_type.replace(/_/g, ' ')})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedTemplateData && (
            <>
              {selectedTemplateData.data_sources.includes('building') && (
                <div className="space-y-2">
                  <Label>Building</Label>
                  <Input
                    value={formData.building_id}
                    onChange={(e) => setFormData({ ...formData, building_id: e.target.value })}
                    placeholder="Building ID"
                  />
                </div>
              )}

              {selectedTemplateData.data_sources.includes('resident') && (
                <div className="space-y-2">
                  <Label>Resident</Label>
                  <Select value={formData.resident_id} onValueChange={(v) => setFormData({ ...formData, resident_id: v })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select resident" />
                    </SelectTrigger>
                    <SelectContent>
                      {residents.map((resident) => (
                        <SelectItem key={resident.id} value={resident.id}>
                          {resident.first_name} {resident.last_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {selectedTemplateData.data_sources.includes('unit') && (
                <div className="space-y-2">
                  <Label>Unit</Label>
                  <Select value={formData.unit_id} onValueChange={(v) => setFormData({ ...formData, unit_id: v })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select unit" />
                    </SelectTrigger>
                    <SelectContent>
                      {units.map((unit) => (
                        <SelectItem key={unit.id} value={unit.id}>
                          Lot {unit.lot_number || unit.unit_number}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {selectedTemplateData.variables?.map((variable) => (
                <div key={variable.name} className="space-y-2">
                  <Label>
                    {variable.label}
                    {variable.required && <span className="text-red-500 ml-1">*</span>}
                  </Label>
                  {variable.type === 'select' ? (
                    <Select 
                      value={customVariables[variable.name] || ''} 
                      onValueChange={(v) => setCustomVariables({ ...customVariables, [variable.name]: v })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={`Select ${variable.label}`} />
                      </SelectTrigger>
                      <SelectContent>
                        {variable.options?.map((opt) => (
                          <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Input
                      type={variable.type}
                      value={customVariables[variable.name] || ''}
                      onChange={(e) => setCustomVariables({ ...customVariables, [variable.name]: e.target.value })}
                      placeholder={variable.label}
                      required={variable.required}
                    />
                  )}
                </div>
              ))}
            </>
          )}

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleGenerate} 
              disabled={!selectedTemplate || generating}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {generating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4 mr-2" />
                  Generate Document
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}