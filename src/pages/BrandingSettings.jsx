import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { usePermissions } from '@/components/permissions/PermissionsContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import PageHeader from '@/components/common/PageHeader';
import { Image as ImageIcon, Upload, Loader2, Save } from 'lucide-react';

const KEYS = {
  display_name: 'branding_display_name',
  logo_url: 'branding_logo_url',
  primary_color: 'branding_primary_color',
  secondary_color: 'branding_secondary_color',
};

const DEFAULTS = {
  display_name: '',
  logo_url: '',
  primary_color: '#3b82f6',
  secondary_color: '#6366f1',
};

export default function BrandingSettings() {
  const { isAdmin } = usePermissions();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [values, setValues] = useState(DEFAULTS);

  useEffect(() => {
    (async () => {
      try {
        const records = await base44.entities.SystemSetting.list();
        const byKey = Object.fromEntries(records
          .filter(r => Object.values(KEYS).includes(r.setting_key))
          .map(r => [r.setting_key, r]));
        setValues({
          display_name: byKey[KEYS.display_name]?.setting_value || DEFAULTS.display_name,
          logo_url: byKey[KEYS.logo_url]?.setting_value || DEFAULTS.logo_url,
          primary_color: byKey[KEYS.primary_color]?.setting_value || DEFAULTS.primary_color,
          secondary_color: byKey[KEYS.secondary_color]?.setting_value || DEFAULTS.secondary_color,
        });
      } catch (e) {
        toast({ title: 'Could not load branding settings', variant: 'destructive' });
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleUpload = async (file) => {
    if (!file) return;
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setValues(v => ({ ...v, logo_url: file_url }));
      toast({ title: 'Logo uploaded' });
    } catch (e) {
      toast({ title: 'Upload failed', variant: 'destructive' });
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const existing = await base44.entities.SystemSetting.list();
      const byKey = Object.fromEntries(
        existing.filter(r => Object.values(KEYS).includes(r.setting_key)).map(r => [r.setting_key, r])
      );
      await Promise.all(Object.entries(KEYS).map(([field, key]) => {
        const value = String(values[field]);
        const record = byKey[key];
        if (record) {
          return base44.entities.SystemSetting.update(record.id, { setting_value: value });
        }
        return base44.entities.SystemSetting.create({
          setting_key: key,
          setting_value: value,
          description: 'App branding setting',
        });
      }));
      toast({ title: 'Branding saved', description: 'Your changes are now live.' });
    } catch (e) {
      toast({ title: 'Could not save branding', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  if (!isAdmin()) {
    return (
      <div className="max-w-4xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>Access Denied</CardTitle>
            <CardDescription>You don't have permission to access branding settings.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <PageHeader
        title="Logo & Branding"
        subtitle="Customize your application display name, logo, and brand colors"
      />

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <ImageIcon className="h-5 w-5 text-blue-600" />
            <CardTitle>Branding</CardTitle>
          </div>
          <CardDescription>These settings apply across the entire application.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
            </div>
          ) : (
            <>
              <div className="space-y-3">
                <Label htmlFor="display_name">Application display name</Label>
                <Input
                  id="display_name"
                  value={values.display_name}
                  onChange={e => setValues(v => ({ ...v, display_name: e.target.value }))}
                  placeholder="e.g. Vivid BMS"
                />
              </div>

              <div className="space-y-3">
                <Label>Dashboard logo</Label>
                <div className="flex items-center gap-4">
                  <div className="h-24 w-24 rounded-lg border-2 border-dashed border-slate-200 flex items-center justify-center overflow-hidden bg-slate-50 flex-shrink-0">
                    {values.logo_url ? (
                      <img src={values.logo_url} alt="Logo preview" className="h-full w-full object-contain p-1" />
                    ) : (
                      <ImageIcon className="h-8 w-8 text-slate-300" />
                    )}
                  </div>
                  <div className="flex flex-col gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={uploading}
                      onClick={() => document.getElementById('logo-upload').click()}
                    >
                      {uploading ? (
                        <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Uploading...</>
                      ) : (
                        <><Upload className="h-4 w-4 mr-2" /> Upload image</>
                      )}
                    </Button>
                    {values.logo_url && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setValues(v => ({ ...v, logo_url: '' }))}
                      >
                        Remove
                      </Button>
                    )}
                    <Input
                      id="logo-upload"
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={e => handleUpload(e.target.files?.[0])}
                    />
                    <p className="text-xs text-slate-500">PNG or JPG, 240×240px recommended.</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <Label htmlFor="primary_color">Primary color</Label>
                  <div className="flex items-center gap-3">
                    <input
                      id="primary_color"
                      type="color"
                      value={values.primary_color}
                      onChange={e => setValues(v => ({ ...v, primary_color: e.target.value }))}
                      className="h-9 w-12 rounded border border-slate-200 cursor-pointer"
                    />
                    <Input
                      value={values.primary_color}
                      onChange={e => setValues(v => ({ ...v, primary_color: e.target.value }))}
                      className="flex-1"
                    />
                  </div>
                </div>
                <div className="space-y-3">
                  <Label htmlFor="secondary_color">Secondary color</Label>
                  <div className="flex items-center gap-3">
                    <input
                      id="secondary_color"
                      type="color"
                      value={values.secondary_color}
                      onChange={e => setValues(v => ({ ...v, secondary_color: e.target.value }))}
                      className="h-9 w-12 rounded border border-slate-200 cursor-pointer"
                    />
                    <Input
                      value={values.secondary_color}
                      onChange={e => setValues(v => ({ ...v, secondary_color: e.target.value }))}
                      className="flex-1"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <Button onClick={handleSave} disabled={saving}>
                  {saving ? (
                    <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Saving...</>
                  ) : (
                    <><Save className="h-4 w-4 mr-2" /> Save branding</>
                  )}
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}