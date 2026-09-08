import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { DollarSign, Loader2, Save } from 'lucide-react';
import AssetWarrantyTracker from './AssetWarrantyTracker';

export default function AssetCostWarrantyEditor({ asset, onSaved }) {
  const [form, setForm] = useState({
    asset_cost_ex_gst: '',
    labour_cost_ex_gst: '',
    warranty_period: '',
    warranty_terms: '',
    warranty_expiry_date: ''
  });
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (!asset) return;
    setForm({
      asset_cost_ex_gst: asset.asset_cost_ex_gst ?? '',
      labour_cost_ex_gst: asset.labour_cost_ex_gst ?? '',
      warranty_period: asset.warranty_period ?? '',
      warranty_terms: asset.warranty_terms ?? '',
      warranty_expiry_date: asset.warranty_expiry_date ?? ''
    });
  }, [asset]);

  if (!asset) return null;

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const patch = {
        asset_cost_ex_gst: form.asset_cost_ex_gst === '' ? null : Number(form.asset_cost_ex_gst),
        labour_cost_ex_gst: form.labour_cost_ex_gst === '' ? null : Number(form.labour_cost_ex_gst),
        warranty_period: form.warranty_period === '' ? null : Number(form.warranty_period),
        warranty_terms: form.warranty_terms || '',
        warranty_expiry_date: form.warranty_expiry_date || null
      };
      const updated = await base44.entities.Asset.update(asset.id, patch);
      toast({ title: 'Cost & warranty saved' });
      if (onSaved) onSaved(updated);
    } catch (e) {
      toast({ title: 'Save failed', description: e.message, variant: 'destructive' });
    }
    setSaving(false);
  };

  const totalExGst = (Number(form.asset_cost_ex_gst) || 0) + (Number(form.labour_cost_ex_gst) || 0);

  return (
    <div className="space-y-4">
      <AssetWarrantyTracker asset={asset} />

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-blue-600" />
            Cost (ex GST) & Warranty
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="asset_cost">Asset cost (ex GST) $</Label>
              <Input
                id="asset_cost"
                type="number"
                step="0.01"
                placeholder="0.00"
                value={form.asset_cost_ex_gst}
                onChange={(e) => handleChange('asset_cost_ex_gst', e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="labour_cost">Labour cost (ex GST) $</Label>
              <Input
                id="labour_cost"
                type="number"
                step="0.01"
                placeholder="0.00"
                value={form.labour_cost_ex_gst}
                onChange={(e) => handleChange('labour_cost_ex_gst', e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="warranty_period">Warranty period (months)</Label>
              <Input
                id="warranty_period"
                type="number"
                step="1"
                placeholder="e.g. 24"
                value={form.warranty_period}
                onChange={(e) => handleChange('warranty_period', e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="warranty_expiry">Warranty expiry date</Label>
              <Input
                id="warranty_expiry"
                type="date"
                value={form.warranty_expiry_date}
                onChange={(e) => handleChange('warranty_expiry_date', e.target.value)}
              />
            </div>
          </div>

          <div className="flex items-center justify-between rounded-md bg-slate-50 px-3 py-2 text-sm">
            <span className="text-slate-600">Total cost (ex GST)</span>
            <span className="font-semibold text-slate-900">${totalExGst.toFixed(2)}</span>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="warranty_terms">Warranty terms / coverage</Label>
            <Textarea
              id="warranty_terms"
              rows={3}
              placeholder="Provider, coverage details, conditions…"
              value={form.warranty_terms}
              onChange={(e) => handleChange('warranty_terms', e.target.value)}
            />
          </div>

          <Button onClick={handleSave} disabled={saving} className="gap-2">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}