import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import PageHeader from '@/components/common/PageHeader';
import LoginPreview from '@/components/branding/LoginPreview';
import HeaderPreview from '@/components/branding/HeaderPreview';
import { Palette, Upload, Eye, Save } from 'lucide-react';
import { toast } from 'sonner';

export default function PartnerBranding() {
  const [user, setUser] = useState(null);
  const [formData, setFormData] = useState({
    logo_url: '',
    primary_color: '#3b82f6',
    secondary_color: '#6366f1',
    display_name: 'PropManage',
    branding_mode: 'co_branded',
    email_sender_name: '',
    email_reply_to: '',
    favicon_url: ''
  });
  const [uploading, setUploading] = useState(false);

  const queryClient = useQueryClient();

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const { data: partners = [] } = useQuery({
    queryKey: ['partners'],
    queryFn: () => base44.entities.Partner.list(),
  });

  const { data: brandings = [] } = useQuery({
    queryKey: ['partner-brandings'],
    queryFn: () => base44.entities.PartnerBranding.list(),
  });

  const userPartner = partners.find(p => p.id === user?.partner_id);
  const existingBranding = brandings.find(b => b.partner_id === user?.partner_id);

  useEffect(() => {
    if (existingBranding) {
      setFormData({
        logo_url: existingBranding.logo_url || '',
        primary_color: existingBranding.primary_color || '#3b82f6',
        secondary_color: existingBranding.secondary_color || '#6366f1',
        display_name: existingBranding.display_name || 'PropManage',
        branding_mode: existingBranding.branding_mode || 'co_branded',
        email_sender_name: existingBranding.email_sender_name || '',
        email_reply_to: existingBranding.email_reply_to || '',
        favicon_url: existingBranding.favicon_url || ''
      });
    }
  }, [existingBranding]);

  const saveMutation = useMutation({
    mutationFn: (data) => {
      if (existingBranding) {
        return base44.entities.PartnerBranding.update(existingBranding.id, data);
      }
      return base44.entities.PartnerBranding.create({ ...data, partner_id: user.partner_id });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['partner-brandings'] });
      toast.success('Branding settings saved successfully');
    },
  });

  const handleLogoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file');
      return;
    }

    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setFormData({ ...formData, logo_url: file_url });
      toast.success('Logo uploaded successfully');
    } catch (error) {
      toast.error('Failed to upload logo');
    } finally {
      setUploading(false);
    }
  };

  const handleSave = () => {
    saveMutation.mutate(formData);
  };

  if (!user?.partner_id) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="p-8 text-center">
          <CardContent>
            <p className="text-slate-600">You need to be associated with a partner to manage branding settings.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Partner Branding" 
        subtitle={userPartner ? `Manage branding for ${userPartner.name}` : 'Manage your partner branding'}
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Settings Panel */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Palette className="h-5 w-5" />
                Branding Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Logo Upload */}
              <div>
                <Label htmlFor="logo">Partner Logo</Label>
                <div className="flex items-center gap-4 mt-2">
                  {formData.logo_url && (
                    <img 
                      src={formData.logo_url} 
                      alt="Partner Logo" 
                      className="h-12 w-12 object-contain rounded border border-slate-200"
                    />
                  )}
                  <div className="flex-1">
                    <Input
                      id="logo"
                      type="file"
                      accept="image/*"
                      onChange={handleLogoUpload}
                      disabled={uploading}
                      className="cursor-pointer"
                    />
                  </div>
                </div>
                {uploading && <p className="text-xs text-slate-500 mt-1">Uploading...</p>}
              </div>

              {/* Display Name */}
              <div>
                <Label htmlFor="display_name">Display Name</Label>
                <Input
                  id="display_name"
                  value={formData.display_name}
                  onChange={(e) => setFormData({ ...formData, display_name: e.target.value })}
                  placeholder="Your Company Name"
                />
              </div>

              {/* Colors */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="primary_color">Primary Color</Label>
                  <div className="flex items-center gap-2 mt-2">
                    <Input
                      id="primary_color"
                      type="color"
                      value={formData.primary_color}
                      onChange={(e) => setFormData({ ...formData, primary_color: e.target.value })}
                      className="h-10 w-20 cursor-pointer"
                    />
                    <Input
                      value={formData.primary_color}
                      onChange={(e) => setFormData({ ...formData, primary_color: e.target.value })}
                      placeholder="#3b82f6"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="secondary_color">Secondary Color</Label>
                  <div className="flex items-center gap-2 mt-2">
                    <Input
                      id="secondary_color"
                      type="color"
                      value={formData.secondary_color}
                      onChange={(e) => setFormData({ ...formData, secondary_color: e.target.value })}
                      className="h-10 w-20 cursor-pointer"
                    />
                    <Input
                      value={formData.secondary_color}
                      onChange={(e) => setFormData({ ...formData, secondary_color: e.target.value })}
                      placeholder="#6366f1"
                    />
                  </div>
                </div>
              </div>

              {/* Branding Mode */}
              <div>
                <Label htmlFor="branding_mode">Branding Mode</Label>
                <Select 
                  value={formData.branding_mode} 
                  onValueChange={(v) => setFormData({ ...formData, branding_mode: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="white_label">White Label (Partner branding only)</SelectItem>
                    <SelectItem value="co_branded">Co-Branded (Powered by Vivid)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Email Settings */}
              <div>
                <Label htmlFor="email_sender_name">Email Sender Name</Label>
                <Input
                  id="email_sender_name"
                  value={formData.email_sender_name}
                  onChange={(e) => setFormData({ ...formData, email_sender_name: e.target.value })}
                  placeholder="Your Company Name"
                />
              </div>

              <div>
                <Label htmlFor="email_reply_to">Email Reply-To Address</Label>
                <Input
                  id="email_reply_to"
                  type="email"
                  value={formData.email_reply_to}
                  onChange={(e) => setFormData({ ...formData, email_reply_to: e.target.value })}
                  placeholder="support@yourcompany.com"
                />
              </div>

              <Button 
                onClick={handleSave} 
                className="w-full"
                disabled={saveMutation.isPending}
              >
                <Save className="h-4 w-4 mr-2" />
                {saveMutation.isPending ? 'Saving...' : 'Save Branding Settings'}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Preview Panel */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Eye className="h-5 w-5" />
                Live Preview
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="login" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="login">Login Screen</TabsTrigger>
                  <TabsTrigger value="header">App Header</TabsTrigger>
                </TabsList>
                <TabsContent value="login" className="mt-4">
                  <LoginPreview branding={formData} />
                </TabsContent>
                <TabsContent value="header" className="mt-4">
                  <HeaderPreview branding={formData} />
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}