import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import PageHeader from '@/components/common/PageHeader';
import EmptyState from '@/components/common/EmptyState';
import { Building2, Palette, FileText, Plus, Pencil, Upload, Check } from 'lucide-react';
import { toast } from 'sonner';

const initialPartnerForm = {
  name: '',
  email: '',
  phone: '',
  status: 'active',
};

const initialBrandingForm = {
  partner_id: '',
  logo_url: '',
  primary_color: '#3b82f6',
  secondary_color: '#6366f1',
  display_name: '',
  branding_mode: 'co_branded',
  email_sender_name: '',
  email_reply_to: '',
  favicon_url: '',
};

const initialTemplateForm = {
  partner_id: '',
  name: '',
  template_type: 'terms_conditions',
  content: '',
  placeholders: [],
  is_default: false,
  status: 'active',
};

export default function PartnerManagement() {
  const [showPartnerDialog, setShowPartnerDialog] = useState(false);
  const [showBrandingDialog, setShowBrandingDialog] = useState(false);
  const [showTemplateDialog, setShowTemplateDialog] = useState(false);
  const [editingPartner, setEditingPartner] = useState(null);
  const [selectedPartner, setSelectedPartner] = useState(null);
  const [partnerForm, setPartnerForm] = useState(initialPartnerForm);
  const [brandingForm, setBrandingForm] = useState(initialBrandingForm);
  const [templateForm, setTemplateForm] = useState(initialTemplateForm);
  const [uploadingLogo, setUploadingLogo] = useState(false);

  const queryClient = useQueryClient();

  const { data: partners = [], isLoading: partnersLoading } = useQuery({
    queryKey: ['partners'],
    queryFn: () => base44.entities.Partner.list(),
  });

  const { data: brandings = [], isLoading: brandingsLoading } = useQuery({
    queryKey: ['partnerBrandings'],
    queryFn: () => base44.entities.PartnerBranding.list(),
  });

  const { data: templates = [], isLoading: templatesLoading } = useQuery({
    queryKey: ['workOrderTemplates'],
    queryFn: () => base44.entities.WorkOrderTemplate.list(),
  });

  const createPartnerMutation = useMutation({
    mutationFn: (data) => base44.entities.Partner.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['partners'] });
      setShowPartnerDialog(false);
      setPartnerForm(initialPartnerForm);
      toast.success('Partner created successfully');
    },
  });

  const updatePartnerMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Partner.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['partners'] });
      setShowPartnerDialog(false);
      setEditingPartner(null);
      setPartnerForm(initialPartnerForm);
      toast.success('Partner updated successfully');
    },
  });

  const createBrandingMutation = useMutation({
    mutationFn: (data) => base44.entities.PartnerBranding.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['partnerBrandings'] });
      setShowBrandingDialog(false);
      setBrandingForm(initialBrandingForm);
      toast.success('Branding configured successfully');
    },
  });

  const updateBrandingMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.PartnerBranding.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['partnerBrandings'] });
      setShowBrandingDialog(false);
      toast.success('Branding updated successfully');
    },
  });

  const createTemplateMutation = useMutation({
    mutationFn: (data) => base44.entities.WorkOrderTemplate.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workOrderTemplates'] });
      setShowTemplateDialog(false);
      setTemplateForm(initialTemplateForm);
      toast.success('Template created successfully');
    },
  });

  const handleLogoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingLogo(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setBrandingForm({ ...brandingForm, logo_url: file_url });
      toast.success('Logo uploaded successfully');
    } catch (error) {
      toast.error('Failed to upload logo');
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleEditPartner = (partner) => {
    setEditingPartner(partner);
    setPartnerForm({
      name: partner.name,
      email: partner.email,
      phone: partner.phone || '',
      status: partner.status,
    });
    setShowPartnerDialog(true);
  };

  const handleConfigureBranding = (partner) => {
    const existingBranding = brandings.find(b => b.partner_id === partner.id);
    if (existingBranding) {
      setBrandingForm({
        partner_id: partner.id,
        logo_url: existingBranding.logo_url || '',
        primary_color: existingBranding.primary_color || '#3b82f6',
        secondary_color: existingBranding.secondary_color || '#6366f1',
        display_name: existingBranding.display_name || '',
        branding_mode: existingBranding.branding_mode || 'co_branded',
        email_sender_name: existingBranding.email_sender_name || '',
        email_reply_to: existingBranding.email_reply_to || '',
        favicon_url: existingBranding.favicon_url || '',
      });
    } else {
      setBrandingForm({ ...initialBrandingForm, partner_id: partner.id });
    }
    setSelectedPartner(partner);
    setShowBrandingDialog(true);
  };

  const handleSubmitPartner = (e) => {
    e.preventDefault();
    if (editingPartner) {
      updatePartnerMutation.mutate({ id: editingPartner.id, data: partnerForm });
    } else {
      createPartnerMutation.mutate(partnerForm);
    }
  };

  const handleSubmitBranding = (e) => {
    e.preventDefault();
    const existingBranding = brandings.find(b => b.partner_id === brandingForm.partner_id);
    if (existingBranding) {
      updateBrandingMutation.mutate({ id: existingBranding.id, data: brandingForm });
    } else {
      createBrandingMutation.mutate(brandingForm);
    }
  };

  const handleSubmitTemplate = (e) => {
    e.preventDefault();
    createTemplateMutation.mutate(templateForm);
  };

  const getPartnerBranding = (partnerId) => brandings.find(b => b.partner_id === partnerId);

  if (partnersLoading) {
    return (
      <div className="space-y-8">
        <PageHeader title="Partner Management" subtitle="Configure white-label partners" />
        <Skeleton className="h-96 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Partner Management" 
        subtitle="Configure white-label settings for building management firms"
        action={() => setShowPartnerDialog(true)}
        actionLabel="Add Partner"
      />

      <Tabs defaultValue="partners" className="space-y-6">
        <TabsList>
          <TabsTrigger value="partners">Partners</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
        </TabsList>

        <TabsContent value="partners">
          {partners.length === 0 ? (
            <EmptyState
              icon={Building2}
              title="No partners yet"
              description="Add building management firms to enable white-label features"
              action={() => setShowPartnerDialog(true)}
              actionLabel="Add Partner"
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {partners.map((partner) => {
                const branding = getPartnerBranding(partner.id);
                return (
                  <Card key={partner.id} className="hover:shadow-lg transition-shadow">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          {branding?.logo_url ? (
                            <img src={branding.logo_url} alt={partner.name} className="h-12 w-12 object-contain rounded" />
                          ) : (
                            <div className="h-12 w-12 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold">
                              {partner.name.charAt(0)}
                            </div>
                          )}
                          <div>
                            <CardTitle className="text-lg">{partner.name}</CardTitle>
                            <Badge variant={partner.status === 'active' ? 'default' : 'secondary'} className="mt-1">
                              {partner.status}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="text-sm">
                        <p className="text-slate-600">{partner.email}</p>
                        {partner.phone && <p className="text-slate-600">{partner.phone}</p>}
                      </div>
                      
                      {branding && (
                        <div className="flex items-center gap-2 pt-2 border-t">
                          <div className="h-6 w-6 rounded border" style={{ backgroundColor: branding.primary_color }} />
                          <div className="h-6 w-6 rounded border" style={{ backgroundColor: branding.secondary_color }} />
                          <span className="text-xs text-slate-500 ml-auto">
                            {branding.branding_mode === 'white_label' ? 'White Label' : 'Co-Branded'}
                          </span>
                        </div>
                      )}

                      <div className="flex gap-2 pt-2">
                        <Button size="sm" variant="outline" onClick={() => handleEditPartner(partner)} className="flex-1">
                          <Pencil className="h-3 w-3 mr-1" /> Edit
                        </Button>
                        <Button size="sm" onClick={() => handleConfigureBranding(partner)} className="flex-1 bg-purple-600 hover:bg-purple-700">
                          <Palette className="h-3 w-3 mr-1" /> Branding
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="templates">
          <div className="flex justify-end mb-4">
            <Button onClick={() => {
              setTemplateForm(initialTemplateForm);
              setShowTemplateDialog(true);
            }}>
              <Plus className="h-4 w-4 mr-2" /> Add Template
            </Button>
          </div>

          {templates.length === 0 ? (
            <EmptyState
              icon={FileText}
              title="No templates yet"
              description="Create work order templates for your partners"
              action={() => setShowTemplateDialog(true)}
              actionLabel="Add Template"
            />
          ) : (
            <div className="space-y-3">
              {templates.map((template) => (
                <Card key={template.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold">{template.name}</h3>
                        <p className="text-sm text-slate-500 capitalize">{template.template_type.replace(/_/g, ' ')}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        {template.is_default && <Badge>Default</Badge>}
                        <Badge variant="outline">{template.status}</Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Partner Dialog */}
      <Dialog open={showPartnerDialog} onOpenChange={setShowPartnerDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingPartner ? 'Edit Partner' : 'Add Partner'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmitPartner} className="space-y-4">
            <div>
              <Label htmlFor="name">Company Name *</Label>
              <Input
                id="name"
                value={partnerForm.name}
                onChange={(e) => setPartnerForm({ ...partnerForm, name: e.target.value })}
                required
              />
            </div>
            <div>
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                value={partnerForm.email}
                onChange={(e) => setPartnerForm({ ...partnerForm, email: e.target.value })}
                required
              />
            </div>
            <div>
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                value={partnerForm.phone}
                onChange={(e) => setPartnerForm({ ...partnerForm, phone: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="status">Status</Label>
              <Select value={partnerForm.status} onValueChange={(v) => setPartnerForm({ ...partnerForm, status: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowPartnerDialog(false)}>Cancel</Button>
              <Button type="submit" disabled={createPartnerMutation.isPending || updatePartnerMutation.isPending}>
                {editingPartner ? 'Update' : 'Create'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Branding Dialog */}
      <Dialog open={showBrandingDialog} onOpenChange={setShowBrandingDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Configure Branding - {selectedPartner?.name}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmitBranding} className="space-y-4">
            <div>
              <Label htmlFor="logo">Logo</Label>
              <div className="flex items-center gap-3">
                {brandingForm.logo_url && (
                  <img src={brandingForm.logo_url} alt="Logo" className="h-16 w-16 object-contain border rounded" />
                )}
                <div>
                  <Input
                    id="logo"
                    type="file"
                    accept="image/*"
                    onChange={handleLogoUpload}
                    disabled={uploadingLogo}
                    className="mb-1"
                  />
                  <p className="text-xs text-slate-500">Recommended: 200x200px, PNG with transparency</p>
                </div>
              </div>
            </div>
            <div>
              <Label htmlFor="display_name">Display Name</Label>
              <Input
                id="display_name"
                value={brandingForm.display_name}
                onChange={(e) => setBrandingForm({ ...brandingForm, display_name: e.target.value })}
                placeholder="e.g., ABC Property Management"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="primary_color">Primary Color</Label>
                <div className="flex gap-2">
                  <Input
                    id="primary_color"
                    type="color"
                    value={brandingForm.primary_color}
                    onChange={(e) => setBrandingForm({ ...brandingForm, primary_color: e.target.value })}
                    className="w-16 h-10"
                  />
                  <Input
                    value={brandingForm.primary_color}
                    onChange={(e) => setBrandingForm({ ...brandingForm, primary_color: e.target.value })}
                    placeholder="#3b82f6"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="secondary_color">Secondary Color</Label>
                <div className="flex gap-2">
                  <Input
                    id="secondary_color"
                    type="color"
                    value={brandingForm.secondary_color}
                    onChange={(e) => setBrandingForm({ ...brandingForm, secondary_color: e.target.value })}
                    className="w-16 h-10"
                  />
                  <Input
                    value={brandingForm.secondary_color}
                    onChange={(e) => setBrandingForm({ ...brandingForm, secondary_color: e.target.value })}
                    placeholder="#6366f1"
                  />
                </div>
              </div>
            </div>
            <div>
              <Label htmlFor="branding_mode">Branding Mode</Label>
              <Select value={brandingForm.branding_mode} onValueChange={(v) => setBrandingForm({ ...brandingForm, branding_mode: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="co_branded">Co-Branded (Partner + Vivid BMS)</SelectItem>
                  <SelectItem value="white_label">White Label (Partner Only)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="email_sender_name">Email Sender Name</Label>
              <Input
                id="email_sender_name"
                value={brandingForm.email_sender_name}
                onChange={(e) => setBrandingForm({ ...brandingForm, email_sender_name: e.target.value })}
                placeholder="ABC Property Management"
              />
            </div>
            <div>
              <Label htmlFor="email_reply_to">Reply-To Email</Label>
              <Input
                id="email_reply_to"
                type="email"
                value={brandingForm.email_reply_to}
                onChange={(e) => setBrandingForm({ ...brandingForm, email_reply_to: e.target.value })}
                placeholder="support@abcproperties.com"
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowBrandingDialog(false)}>Cancel</Button>
              <Button type="submit" disabled={createBrandingMutation.isPending || updateBrandingMutation.isPending}>
                Save Branding
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Template Dialog */}
      <Dialog open={showTemplateDialog} onOpenChange={setShowTemplateDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Template</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmitTemplate} className="space-y-4">
            <div>
              <Label htmlFor="template_partner">Partner (Optional)</Label>
              <Select value={templateForm.partner_id} onValueChange={(v) => setTemplateForm({ ...templateForm, partner_id: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Global template" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={null}>Global (All Partners)</SelectItem>
                  {partners.map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="template_name">Template Name *</Label>
              <Input
                id="template_name"
                value={templateForm.name}
                onChange={(e) => setTemplateForm({ ...templateForm, name: e.target.value })}
                required
              />
            </div>
            <div>
              <Label htmlFor="template_type">Type *</Label>
              <Select value={templateForm.template_type} onValueChange={(v) => setTemplateForm({ ...templateForm, template_type: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="terms_conditions">Terms & Conditions</SelectItem>
                  <SelectItem value="invoice_template">Invoice Template</SelectItem>
                  <SelectItem value="quote_template">Quote Template</SelectItem>
                  <SelectItem value="completion_form">Completion Form</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="template_content">Content *</Label>
              <Textarea
                id="template_content"
                value={templateForm.content}
                onChange={(e) => setTemplateForm({ ...templateForm, content: e.target.value })}
                rows={8}
                placeholder="Use placeholders: {work_order_id}, {building_name}, {contractor_name}, {date}, {amount}"
                required
              />
              <p className="text-xs text-slate-500 mt-1">
                Available placeholders: {'{work_order_id}'}, {'{building_name}'}, {'{contractor_name}'}, {'{date}'}, {'{amount}'}
              </p>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowTemplateDialog(false)}>Cancel</Button>
              <Button type="submit" disabled={createTemplateMutation.isPending}>
                Create Template
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}