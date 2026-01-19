import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { FileText, Plus, MoreVertical, Edit2, Trash2, Copy, Eye } from 'lucide-react';
import { toast } from 'sonner';

export default function DocumentTemplateManager({ buildingId }) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [deleteTemplate, setDeleteTemplate] = useState(null);
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    template_type: 'custom',
    content: '',
    data_sources: [],
    output_format: 'pdf',
    status: 'active',
    building_id: buildingId || null
  });

  const { data: templates = [], isLoading } = useQuery({
    queryKey: ['documentTemplates', buildingId],
    queryFn: async () => {
      const all = await base44.entities.DocumentTemplate.list();
      // Show building-specific and global templates
      return all.filter(t => !t.building_id || t.building_id === buildingId);
    }
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.DocumentTemplate.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documentTemplates'] });
      setDialogOpen(false);
      resetForm();
      toast.success('Template created successfully');
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.DocumentTemplate.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documentTemplates'] });
      setDialogOpen(false);
      resetForm();
      toast.success('Template updated successfully');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.DocumentTemplate.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documentTemplates'] });
      setDeleteTemplate(null);
      toast.success('Template deleted');
    }
  });

  const duplicateMutation = useMutation({
    mutationFn: async (template) => {
      const copy = {
        ...template,
        name: `${template.name} (Copy)`,
        is_default: false
      };
      delete copy.id;
      delete copy.created_date;
      delete copy.updated_date;
      delete copy.created_by;
      return base44.entities.DocumentTemplate.create(copy);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documentTemplates'] });
      toast.success('Template duplicated');
    }
  });

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      template_type: 'custom',
      content: '',
      data_sources: [],
      output_format: 'pdf',
      status: 'active',
      building_id: buildingId || null
    });
    setEditingTemplate(null);
  };

  const handleEdit = (template) => {
    setEditingTemplate(template);
    setFormData(template);
    setDialogOpen(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (editingTemplate) {
      updateMutation.mutate({ id: editingTemplate.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleDataSourceToggle = (source) => {
    setFormData(prev => ({
      ...prev,
      data_sources: prev.data_sources.includes(source)
        ? prev.data_sources.filter(s => s !== source)
        : [...prev.data_sources, source]
    }));
  };

  const dataSourceOptions = [
    'building', 'resident', 'unit', 'work_order', 'inspection', 
    'contractor', 'asset', 'lease_agreement', 'compliance_record'
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Document Templates</h2>
          <p className="text-slate-600">Manage and customize document templates</p>
        </div>
        <Button onClick={() => { resetForm(); setDialogOpen(true); }} className="bg-blue-600 hover:bg-blue-700">
          <Plus className="h-4 w-4 mr-2" />
          New Template
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {templates.map((template) => (
          <Card key={template.id} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-blue-600" />
                  <div>
                    <CardTitle className="text-lg">{template.name}</CardTitle>
                    {template.description && (
                      <CardDescription className="mt-1">{template.description}</CardDescription>
                    )}
                  </div>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => { setEditingTemplate(template); setPreviewOpen(true); }}>
                      <Eye className="mr-2 h-4 w-4" />
                      Preview
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleEdit(template)}>
                      <Edit2 className="mr-2 h-4 w-4" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => duplicateMutation.mutate(template)}>
                      <Copy className="mr-2 h-4 w-4" />
                      Duplicate
                    </DropdownMenuItem>
                    {!template.is_default && (
                      <DropdownMenuItem onClick={() => setDeleteTemplate(template)} className="text-red-600">
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex gap-2 flex-wrap">
                  <Badge>{template.template_type.replace(/_/g, ' ')}</Badge>
                  <Badge variant="outline">{template.output_format.toUpperCase()}</Badge>
                  {template.is_default && <Badge variant="secondary">Default</Badge>}
                </div>
                {template.data_sources?.length > 0 && (
                  <div className="text-sm text-slate-600">
                    Uses: {template.data_sources.join(', ')}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingTemplate ? 'Edit Template' : 'Create Template'}</DialogTitle>
            <DialogDescription>
              Create a document template with placeholders like {`{{building.name}}`} or {`{{resident.first_name}}`}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Template Name</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Standard Lease Agreement"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Template Type</Label>
                <Select value={formData.template_type} onValueChange={(v) => setFormData({ ...formData, template_type: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="lease_agreement">Lease Agreement</SelectItem>
                    <SelectItem value="inspection_report">Inspection Report</SelectItem>
                    <SelectItem value="resident_notice">Resident Notice</SelectItem>
                    <SelectItem value="maintenance_notice">Maintenance Notice</SelectItem>
                    <SelectItem value="breach_notice">Breach Notice</SelectItem>
                    <SelectItem value="entry_notice">Entry Notice</SelectItem>
                    <SelectItem value="rent_increase_notice">Rent Increase Notice</SelectItem>
                    <SelectItem value="lease_renewal">Lease Renewal</SelectItem>
                    <SelectItem value="move_in_checklist">Move In Checklist</SelectItem>
                    <SelectItem value="move_out_checklist">Move Out Checklist</SelectItem>
                    <SelectItem value="incident_report">Incident Report</SelectItem>
                    <SelectItem value="compliance_report">Compliance Report</SelectItem>
                    <SelectItem value="custom">Custom</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Description</Label>
              <Input
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Brief description of this template"
              />
            </div>

            <div className="space-y-2">
              <Label>Data Sources</Label>
              <div className="flex flex-wrap gap-2">
                {dataSourceOptions.map((source) => (
                  <Badge
                    key={source}
                    variant={formData.data_sources.includes(source) ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => handleDataSourceToggle(source)}
                  >
                    {source.replace(/_/g, ' ')}
                  </Badge>
                ))}
              </div>
              <p className="text-xs text-slate-500">Click to select which data entities this template uses</p>
            </div>

            <div className="space-y-2">
              <Label>Template Content</Label>
              <Textarea
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                placeholder="Enter your template content with placeholders like {{building.name}}, {{resident.first_name}}, {{current_date}}, etc."
                rows={15}
                className="font-mono text-sm"
                required
              />
              <p className="text-xs text-slate-500">
                Use placeholders: {`{{building.field}}, {{resident.field}}, {{unit.field}}, {{custom.variable}}, {{current_date}}`}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Output Format</Label>
                <Select value={formData.output_format} onValueChange={(v) => setFormData({ ...formData, output_format: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pdf">PDF</SelectItem>
                    <SelectItem value="html">HTML</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={formData.status} onValueChange={(v) => setFormData({ ...formData, status: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="archived">Archived</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                {editingTemplate ? 'Update' : 'Create'} Template
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Template Preview: {editingTemplate?.name}</DialogTitle>
          </DialogHeader>
          <div className="bg-slate-50 p-6 rounded-lg whitespace-pre-wrap font-mono text-sm">
            {editingTemplate?.content}
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTemplate} onOpenChange={() => setDeleteTemplate(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Template</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deleteTemplate?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteMutation.mutate(deleteTemplate.id)} className="bg-red-600 hover:bg-red-700">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}