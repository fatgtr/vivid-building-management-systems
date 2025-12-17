import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import PageHeader from '@/components/common/PageHeader';
import { FileText, Plus, Edit, Trash2, Copy } from 'lucide-react';
import { toast } from 'sonner';
import { useBuildingContext } from '@/components/BuildingContext';

export default function CommunicationTemplates() {
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [templateType, setTemplateType] = useState('announcement');
  const { selectedBuildingId } = useBuildingContext();
  const queryClient = useQueryClient();

  const { data: announcementTemplates = [] } = useQuery({
    queryKey: ['communicationTemplates'],
    queryFn: () => base44.entities.CommunicationTemplate.list(),
  });

  const { data: messageTemplates = [] } = useQuery({
    queryKey: ['messageTemplates'],
    queryFn: () => base44.entities.MessageTemplate.list(),
  });

  const createAnnouncementTemplateMutation = useMutation({
    mutationFn: (data) => base44.entities.CommunicationTemplate.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['communicationTemplates'] });
      toast.success('Template created');
      setEditingTemplate(null);
    },
  });

  const updateAnnouncementTemplateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.CommunicationTemplate.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['communicationTemplates'] });
      toast.success('Template updated');
      setEditingTemplate(null);
    },
  });

  const deleteAnnouncementTemplateMutation = useMutation({
    mutationFn: (id) => base44.entities.CommunicationTemplate.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['communicationTemplates'] });
      toast.success('Template deleted');
    },
  });

  const createMessageTemplateMutation = useMutation({
    mutationFn: (data) => base44.entities.MessageTemplate.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messageTemplates'] });
      toast.success('Response template created');
      setEditingTemplate(null);
    },
  });

  const handleSaveAnnouncementTemplate = () => {
    const data = {
      ...editingTemplate,
      building_id: editingTemplate.building_id || null,
      placeholders: ['building_name', 'date', 'time', 'location', 'contact_name', 'contact_email']
    };

    if (editingTemplate.id) {
      updateAnnouncementTemplateMutation.mutate({ id: editingTemplate.id, data });
    } else {
      createAnnouncementTemplateMutation.mutate(data);
    }
  };

  const handleSaveMessageTemplate = () => {
    const data = {
      ...editingTemplate,
      building_id: editingTemplate.building_id || null,
      placeholders: ['resident_name', 'building_name', 'unit_number', 'subject']
    };
    createMessageTemplateMutation.mutate(data);
  };

  const commonPlaceholders = [
    '{building_name}', '{date}', '{time}', '{location}',
    '{contact_name}', '{contact_email}', '{resident_name}', '{unit_number}'
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <PageHeader
        title="Communication Templates"
        subtitle="Manage templates for announcements and message responses"
        action={() => setEditingTemplate({ type: templateType })}
        actionLabel="Create Template"
        actionIcon={Plus}
      />

      <Tabs value={templateType} onValueChange={setTemplateType} className="w-full">
        <TabsList>
          <TabsTrigger value="announcement">Announcement Templates</TabsTrigger>
          <TabsTrigger value="response">Response Templates</TabsTrigger>
        </TabsList>

        <TabsContent value="announcement" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {announcementTemplates.map((template) => (
              <Card key={template.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-base">{template.name}</CardTitle>
                      <div className="flex items-center gap-2 mt-2">
                        <Badge variant="outline" className="capitalize">{template.type}</Badge>
                        <Badge variant="outline" className="capitalize">{template.category}</Badge>
                        {template.building_id && <Badge>Building Specific</Badge>}
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setEditingTemplate(template)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteAnnouncementTemplateMutation.mutate(template.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm font-medium mb-1">Title:</p>
                  <p className="text-sm text-slate-600 mb-3">{template.title_template}</p>
                  <p className="text-sm font-medium mb-1">Content Preview:</p>
                  <p className="text-sm text-slate-600 line-clamp-3">{template.content_template}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="response" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {messageTemplates.map((template) => (
              <Card key={template.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-base">{template.name}</CardTitle>
                      <div className="flex items-center gap-2 mt-2">
                        <Badge variant="outline" className="capitalize">
                          {template.category.replace(/_/g, ' ')}
                        </Badge>
                        {template.building_id && <Badge>Building Specific</Badge>}
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-slate-600 line-clamp-4">{template.content}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* Template Editor Dialog */}
      <Dialog open={!!editingTemplate} onOpenChange={() => setEditingTemplate(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingTemplate?.id ? 'Edit' : 'Create'} {templateType === 'announcement' ? 'Announcement' : 'Response'} Template
            </DialogTitle>
          </DialogHeader>

          {editingTemplate && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Template Name</Label>
                <Input
                  value={editingTemplate.name || ''}
                  onChange={(e) => setEditingTemplate({ ...editingTemplate, name: e.target.value })}
                  placeholder="e.g., Lift Maintenance Notice"
                />
              </div>

              {templateType === 'announcement' && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Type</Label>
                      <Select
                        value={editingTemplate.type || 'announcement'}
                        onValueChange={(value) => setEditingTemplate({ ...editingTemplate, type: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="announcement">Announcement</SelectItem>
                          <SelectItem value="notice">Notice</SelectItem>
                          <SelectItem value="reminder">Reminder</SelectItem>
                          <SelectItem value="invitation">Invitation</SelectItem>
                          <SelectItem value="alert">Alert</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Category</Label>
                      <Select
                        value={editingTemplate.category || 'general'}
                        onValueChange={(value) => setEditingTemplate({ ...editingTemplate, category: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="general">General</SelectItem>
                          <SelectItem value="maintenance">Maintenance</SelectItem>
                          <SelectItem value="emergency">Emergency</SelectItem>
                          <SelectItem value="event">Event</SelectItem>
                          <SelectItem value="policy">Policy</SelectItem>
                          <SelectItem value="bylaw_reminder">Bylaw Reminder</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Title Template</Label>
                    <Input
                      value={editingTemplate.title_template || ''}
                      onChange={(e) => setEditingTemplate({ ...editingTemplate, title_template: e.target.value })}
                      placeholder="e.g., Lift Maintenance at {building_name}"
                    />
                  </div>
                </>
              )}

              {templateType === 'response' && (
                <div className="space-y-2">
                  <Label>Category</Label>
                  <Select
                    value={editingTemplate.category || 'general_inquiry'}
                    onValueChange={(value) => setEditingTemplate({ ...editingTemplate, category: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="maintenance">Maintenance</SelectItem>
                      <SelectItem value="noise_complaint">Noise Complaint</SelectItem>
                      <SelectItem value="parking">Parking</SelectItem>
                      <SelectItem value="pets">Pets</SelectItem>
                      <SelectItem value="amenity_booking">Amenity Booking</SelectItem>
                      <SelectItem value="bylaw_question">Bylaw Question</SelectItem>
                      <SelectItem value="general_inquiry">General Inquiry</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="space-y-2">
                <Label>Content Template</Label>
                <Textarea
                  value={editingTemplate.content_template || editingTemplate.content || ''}
                  onChange={(e) => setEditingTemplate({
                    ...editingTemplate,
                    [templateType === 'announcement' ? 'content_template' : 'content']: e.target.value
                  })}
                  rows={8}
                  placeholder="Template content with placeholders..."
                />
                <p className="text-xs text-slate-500">
                  Available placeholders: {commonPlaceholders.join(', ')}
                </p>
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setEditingTemplate(null)}>
                  Cancel
                </Button>
                <Button
                  onClick={templateType === 'announcement' ? handleSaveAnnouncementTemplate : handleSaveMessageTemplate}
                >
                  Save Template
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}