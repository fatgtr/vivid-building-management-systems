import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import PageHeader from '@/components/common/PageHeader';
import EmptyState from '@/components/common/EmptyState';
import { Building2, Plus, Pencil, Upload, ArrowLeft, Palette, FileText, Settings } from 'lucide-react';
import { toast } from 'sonner';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';

export default function PartnerManagement() {
  const [viewMode, setViewMode] = useState('list'); // 'list' or 'edit'
  const [selectedPartner, setSelectedPartner] = useState(null);
  const [partnerForm, setPartnerForm] = useState({
    name: '',
    email: '',
    phone: '',
    status: 'active',
  });
  const [brandingForm, setBrandingForm] = useState({
    dashboard_logo_url: '',
    work_order_logo_url: '',
    management_report_logo_url: '',
    building_image_url: '',
    favicon_url: '',
    primary_color: '#3b82f6',
    secondary_color: '#6366f1',
    display_name: '',
    branding_mode: 'co_branded',
    email_sender_name: '',
    email_reply_to: '',
    work_order_terms: '',
    show_work_order_terms: true,
    company_name: '',
    building_name: '',
    company_address: '',
    company_state: '',
    company_suburb: '',
    company_postcode: '',
    strata_plan: '',
  });
  const [uploading, setUploading] = useState({});

  const queryClient = useQueryClient();

  const { data: partners = [], isLoading: partnersLoading } = useQuery({
    queryKey: ['partners'],
    queryFn: () => base44.entities.Partner.list(),
  });

  const { data: brandings = [] } = useQuery({
    queryKey: ['partnerBrandings'],
    queryFn: () => base44.entities.PartnerBranding.list(),
  });

  const createPartnerMutation = useMutation({
    mutationFn: async (data) => {
      const partner = await base44.entities.Partner.create(data.partner);
      await base44.entities.PartnerBranding.create({ ...data.branding, partner_id: partner.id });
      return partner;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['partners'] });
      queryClient.invalidateQueries({ queryKey: ['partnerBrandings'] });
      setViewMode('list');
      resetForms();
      toast.success('Partner created successfully');
    },
  });

  const updatePartnerMutation = useMutation({
    mutationFn: async (data) => {
      await base44.entities.Partner.update(data.partnerId, data.partner);
      const existingBranding = brandings.find(b => b.partner_id === data.partnerId);
      if (existingBranding) {
        await base44.entities.PartnerBranding.update(existingBranding.id, data.branding);
      } else {
        await base44.entities.PartnerBranding.create({ ...data.branding, partner_id: data.partnerId });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['partners'] });
      queryClient.invalidateQueries({ queryKey: ['partnerBrandings'] });
      setViewMode('list');
      resetForms();
      toast.success('Partner updated successfully');
    },
  });

  const handleFileUpload = async (e, field) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading({ ...uploading, [field]: true });
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setBrandingForm({ ...brandingForm, [field]: file_url });
      toast.success('File uploaded successfully');
    } catch (error) {
      toast.error('Failed to upload file');
    } finally {
      setUploading({ ...uploading, [field]: false });
    }
  };

  const handleAddNew = () => {
    resetForms();
    setSelectedPartner(null);
    setViewMode('edit');
  };

  const handleEditPartner = (partner) => {
    setSelectedPartner(partner);
    setPartnerForm({
      name: partner.name,
      email: partner.email,
      phone: partner.phone || '',
      status: partner.status,
    });
    
    const existingBranding = brandings.find(b => b.partner_id === partner.id);
    if (existingBranding) {
      setBrandingForm({
        dashboard_logo_url: existingBranding.dashboard_logo_url || '',
        work_order_logo_url: existingBranding.work_order_logo_url || '',
        management_report_logo_url: existingBranding.management_report_logo_url || '',
        building_image_url: existingBranding.building_image_url || '',
        favicon_url: existingBranding.favicon_url || '',
        primary_color: existingBranding.primary_color || '#3b82f6',
        secondary_color: existingBranding.secondary_color || '#6366f1',
        display_name: existingBranding.display_name || '',
        branding_mode: existingBranding.branding_mode || 'co_branded',
        email_sender_name: existingBranding.email_sender_name || '',
        email_reply_to: existingBranding.email_reply_to || '',
        work_order_terms: existingBranding.work_order_terms || '',
        show_work_order_terms: existingBranding.show_work_order_terms ?? true,
        company_name: existingBranding.company_name || '',
        building_name: existingBranding.building_name || '',
        company_address: existingBranding.company_address || '',
        company_state: existingBranding.company_state || '',
        company_suburb: existingBranding.company_suburb || '',
        company_postcode: existingBranding.company_postcode || '',
        strata_plan: existingBranding.strata_plan || '',
      });
    }
    
    setViewMode('edit');
  };

  const handleSave = () => {
    if (selectedPartner) {
      updatePartnerMutation.mutate({
        partnerId: selectedPartner.id,
        partner: partnerForm,
        branding: brandingForm,
      });
    } else {
      createPartnerMutation.mutate({
        partner: partnerForm,
        branding: brandingForm,
      });
    }
  };

  const resetForms = () => {
    setPartnerForm({ name: '', email: '', phone: '', status: 'active' });
    setBrandingForm({
      dashboard_logo_url: '',
      work_order_logo_url: '',
      management_report_logo_url: '',
      building_image_url: '',
      favicon_url: '',
      primary_color: '#3b82f6',
      secondary_color: '#6366f1',
      display_name: '',
      branding_mode: 'co_branded',
      email_sender_name: '',
      email_reply_to: '',
      work_order_terms: '',
      show_work_order_terms: true,
      company_name: '',
      building_name: '',
      company_address: '',
      company_state: '',
      company_suburb: '',
      company_postcode: '',
      strata_plan: '',
    });
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

  if (viewMode === 'edit') {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => setViewMode('list')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold text-slate-900">
              {selectedPartner ? 'Edit Partner' : 'Add New Partner'}
            </h1>
            <p className="text-slate-500">Configure all partner settings in one place</p>
          </div>
        </div>

        <Tabs defaultValue="general" className="space-y-6">
          <TabsList className="bg-slate-100">
            <TabsTrigger value="general" className="gap-2">
              <Building2 className="h-4 w-4" />
              General Details
            </TabsTrigger>
            <TabsTrigger value="branding" className="gap-2">
              <Palette className="h-4 w-4" />
              Branding & Logos
            </TabsTrigger>
            <TabsTrigger value="workorder" className="gap-2">
              <FileText className="h-4 w-4" />
              Work Order Settings
            </TabsTrigger>
          </TabsList>

          <TabsContent value="general">
            <Card>
              <CardHeader>
                <CardTitle>Partner Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
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
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="branding" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Logos</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <Label>Dashboard Logo</Label>
                    <p className="text-xs text-slate-500 mb-2">Recommended: 240px x 240px</p>
                    {brandingForm.dashboard_logo_url && (
                      <img src={brandingForm.dashboard_logo_url} alt="Dashboard Logo" className="h-24 w-24 object-contain border rounded mb-2" />
                    )}
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleFileUpload(e, 'dashboard_logo_url')}
                      disabled={uploading.dashboard_logo_url}
                    />
                  </div>

                  <div>
                    <Label>Building Image</Label>
                    <p className="text-xs text-slate-500 mb-2">Recommended: 250px x 125px</p>
                    {brandingForm.building_image_url && (
                      <img src={brandingForm.building_image_url} alt="Building" className="h-24 w-auto object-contain border rounded mb-2" />
                    )}
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleFileUpload(e, 'building_image_url')}
                      disabled={uploading.building_image_url}
                    />
                  </div>

                  <div>
                    <Label>Work Order Logo</Label>
                    <p className="text-xs text-slate-500 mb-2">Recommended: 240px x 125px</p>
                    {brandingForm.work_order_logo_url && (
                      <img src={brandingForm.work_order_logo_url} alt="Work Order Logo" className="h-24 w-auto object-contain border rounded mb-2" />
                    )}
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleFileUpload(e, 'work_order_logo_url')}
                      disabled={uploading.work_order_logo_url}
                    />
                  </div>

                  <div>
                    <Label>Management Report Logo</Label>
                    <p className="text-xs text-slate-500 mb-2">Recommended: 240px x 125px</p>
                    {brandingForm.management_report_logo_url && (
                      <img src={brandingForm.management_report_logo_url} alt="Report Logo" className="h-24 w-auto object-contain border rounded mb-2" />
                    )}
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleFileUpload(e, 'management_report_logo_url')}
                      disabled={uploading.management_report_logo_url}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Brand Colors & Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
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
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="workorder" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Terms & Conditions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-2">
                  <Switch
                    id="show_terms"
                    checked={brandingForm.show_work_order_terms}
                    onCheckedChange={(v) => setBrandingForm({ ...brandingForm, show_work_order_terms: v })}
                  />
                  <Label htmlFor="show_terms">Show Work Order Terms & Conditions</Label>
                </div>
                
                <div>
                  <Label>Terms & Conditions Content</Label>
                  <ReactQuill
                    value={brandingForm.work_order_terms}
                    onChange={(value) => setBrandingForm({ ...brandingForm, work_order_terms: value })}
                    className="bg-white"
                    theme="snow"
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Entity Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-slate-600 mb-4">
                  These details will be displayed on work orders sent to vendors.
                </p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="company_name">Company Name</Label>
                    <Input
                      id="company_name"
                      value={brandingForm.company_name}
                      onChange={(e) => setBrandingForm({ ...brandingForm, company_name: e.target.value })}
                    />
                  </div>

                  <div>
                    <Label htmlFor="building_name">Building Name</Label>
                    <Input
                      id="building_name"
                      value={brandingForm.building_name}
                      onChange={(e) => setBrandingForm({ ...brandingForm, building_name: e.target.value })}
                    />
                  </div>

                  <div>
                    <Label htmlFor="strata_plan">SP</Label>
                    <Input
                      id="strata_plan"
                      value={brandingForm.strata_plan}
                      onChange={(e) => setBrandingForm({ ...brandingForm, strata_plan: e.target.value })}
                    />
                  </div>

                  <div>
                    <Label htmlFor="company_address">Address</Label>
                    <Input
                      id="company_address"
                      value={brandingForm.company_address}
                      onChange={(e) => setBrandingForm({ ...brandingForm, company_address: e.target.value })}
                    />
                  </div>

                  <div>
                    <Label htmlFor="company_state">State</Label>
                    <Input
                      id="company_state"
                      value={brandingForm.company_state}
                      onChange={(e) => setBrandingForm({ ...brandingForm, company_state: e.target.value })}
                    />
                  </div>

                  <div>
                    <Label htmlFor="company_suburb">Suburb</Label>
                    <Input
                      id="company_suburb"
                      value={brandingForm.company_suburb}
                      onChange={(e) => setBrandingForm({ ...brandingForm, company_suburb: e.target.value })}
                    />
                  </div>

                  <div>
                    <Label htmlFor="company_postcode">Postcode</Label>
                    <Input
                      id="company_postcode"
                      value={brandingForm.company_postcode}
                      onChange={(e) => setBrandingForm({ ...brandingForm, company_postcode: e.target.value })}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end gap-3 sticky bottom-0 bg-white border-t pt-4">
          <Button variant="outline" onClick={() => setViewMode('list')}>Cancel</Button>
          <Button onClick={handleSave} disabled={createPartnerMutation.isPending || updatePartnerMutation.isPending}>
            {selectedPartner ? 'Update Partner' : 'Create Partner'}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Partner Management" 
        subtitle="Configure white-label settings for building management firms"
        action={handleAddNew}
        actionLabel="Add Partner"
      />

      {partners.length === 0 ? (
        <EmptyState
          icon={Building2}
          title="No partners yet"
          description="Add building management firms to enable white-label features"
          action={handleAddNew}
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
                      {branding?.dashboard_logo_url ? (
                        <img src={branding.dashboard_logo_url} alt={partner.name} className="h-12 w-12 object-contain rounded" />
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

                  <Button size="sm" onClick={() => handleEditPartner(partner)} className="w-full mt-2">
                    <Pencil className="h-3 w-3 mr-1" /> Edit Partner
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}