import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { usePermissions } from '@/components/permissions/PermissionsContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/components/ui/use-toast";
import PageHeader from '@/components/common/PageHeader';
import { Loader2, Plus, Save, Trash2, Wrench } from 'lucide-react';

const KEYS = {
  categories: 'wo_custom_categories',
  default_priority: 'wo_default_priority',
  default_status: 'wo_default_status',
  workflow: 'wo_workflow_transitions',
};

const BUILTIN_CATEGORIES = [
  'core_building_structure', 'mechanical_services', 'electrical_services',
  'fire_life_safety', 'vertical_transportation', 'hydraulic_plumbing',
  'security_access_control', 'communications_it', 'building_management_systems',
  'external_grounds', 'common_area_fixtures_fittings', 'waste_management',
  'parking_traffic', 'compliance_safety', 'commercial_specific',
  'residential_specific', 'documentation_registers'
];

const PRIORITIES = ['low', 'medium', 'high', 'urgent'];
const STATUSES = [
  'open', 'in_progress', 'on_hold', 'completed', 'cancelled',
  'tenant_reported_awaiting_agent', 'owner_reported_bm_facilitated',
  'owner_reported_self_manage', 'owner_choice_pending'
];

// Default allowed forward transitions (a sensible status progression)
const DEFAULT_WORKFLOW = {
  open: ['in_progress', 'on_hold', 'cancelled'],
  in_progress: ['on_hold', 'completed', 'cancelled'],
  on_hold: ['in_progress', 'cancelled'],
  completed: [],
  cancelled: [],
  tenant_reported_awaiting_agent: ['open', 'owner_choice_pending'],
  owner_reported_bm_facilitated: ['open'],
  owner_reported_self_manage: ['open'],
  owner_choice_pending: ['owner_reported_bm_facilitated', 'owner_reported_self_manage', 'open'],
};

const fmt = (s) => s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

export default function WorkOrderSettings() {
  const { isAdmin } = usePermissions();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [categories, setCategories] = useState([]); // [{ value, label, custom }]
  const [newCategory, setNewCategory] = useState('');
  const [defaultPriority, setDefaultPriority] = useState('medium');
  const [defaultStatus, setDefaultStatus] = useState('open');
  const [workflow, setWorkflow] = useState(DEFAULT_WORKFLOW);

  // Load all settings once
  useEffect(() => {
    (async () => {
      try {
        const records = await base44.entities.SystemSetting.list();
        const map = Object.fromEntries(records.map(r => [r.setting_key, r.setting_value]));

        // Categories
        let cats = BUILTIN_CATEGORIES.map(c => ({ value: c, label: fmt(c), custom: false, disabled: false }));
        if (map[KEYS.categories]) {
          try {
            const custom = JSON.parse(map[KEYS.categories]);
            cats = [
              ...BUILTIN_CATEGORIES.map(c => ({
                value: c, label: fmt(c), custom: false,
                disabled: custom.disabled?.includes(c) || false
              })),
              ...(custom.items || []).map(c => ({ value: c.value, label: c.label, custom: true, disabled: false }))
            ];
          } catch {}
        }
        setCategories(cats);

        // Defaults
        setDefaultPriority(map[KEYS.default_priority] || 'medium');
        setDefaultStatus(map[KEYS.default_status] || 'open');

        // Workflow
        if (map[KEYS.workflow]) {
          try { setWorkflow(JSON.parse(map[KEYS.workflow])); } catch {}
        }
      } catch (e) {
        toast({ title: 'Could not load work order settings', variant: 'destructive' });
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const addCategory = () => {
    const value = newCategory.trim().toLowerCase().replace(/\s+/g, '_');
    if (!value) return;
    if (categories.some(c => c.value === value)) {
      toast({ title: 'Category already exists', variant: 'destructive' });
      return;
    }
    setCategories([...categories, { value, label: fmt(value), custom: true, disabled: false }]);
    setNewCategory('');
  };

  const removeCategory = (value) => {
    setCategories(categories.filter(c => c.value !== value));
  };

  const toggleCategory = (value, disabled) => {
    setCategories(categories.map(c => c.value === value ? { ...c, disabled } : c));
  };

  const toggleTransition = (from, to, checked) => {
    setWorkflow(prev => {
      const allowed = new Set(prev[from] || []);
      if (checked) allowed.add(to); else allowed.delete(to);
      return { ...prev, [from]: Array.from(allowed) };
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const all = await base44.entities.SystemSetting.list();
      const map = Object.fromEntries(all.map(r => [r.setting_key, r]));

      const upsert = async (key, value, description) => {
        const rec = map[key];
        if (rec) {
          return base44.entities.SystemSetting.update(rec.id, { setting_value: value });
        }
        return base44.entities.SystemSetting.create({ setting_key: key, setting_value: value, description });
      };

      const customPayload = JSON.stringify({
        items: categories.filter(c => c.custom),
        disabled: categories.filter(c => !c.custom && c.disabled).map(c => c.value)
      });

      await Promise.all([
        upsert(KEYS.categories, customPayload, 'Custom work order categories'),
        upsert(KEYS.default_priority, defaultPriority, 'Default work order priority'),
        upsert(KEYS.default_status, defaultStatus, 'Default work order status'),
        upsert(KEYS.workflow, JSON.stringify(workflow), 'Work order status transitions'),
      ]);

      toast({ title: 'Work order settings saved' });
    } catch (e) {
      toast({ title: 'Could not save settings', variant: 'destructive' });
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
            <CardDescription>You don't have permission to access work order settings.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <PageHeader
        title="Work Order Settings"
        subtitle="Configure categories, defaults, and workflow"
      />

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
        </div>
      ) : (
        <>
          {/* Categories */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Wrench className="h-5 w-5 text-blue-600" />
                <CardTitle>Work Order Categories</CardTitle>
              </div>
              <CardDescription>Add custom categories, rename them, or disable built-in ones.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  value={newCategory}
                  onChange={e => setNewCategory(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addCategory())}
                  placeholder="New category name"
                />
                <Button type="button" onClick={addCategory} variant="outline">
                  <Plus className="h-4 w-4 mr-1" /> Add
                </Button>
              </div>
              <div className="space-y-2 max-h-72 overflow-y-auto">
                {categories.map((c) => (
                  <div key={c.value} className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2">
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium text-slate-900">{c.label}</span>
                      {c.custom ? (
                        <span className="text-xs px-1.5 py-0.5 rounded bg-blue-100 text-blue-700">Custom</span>
                      ) : (
                        <span className="text-xs px-1.5 py-0.5 rounded bg-slate-100 text-slate-500">Built-in</span>
                      )}
                      {c.disabled && (
                        <span className="text-xs px-1.5 py-0.5 rounded bg-amber-100 text-amber-700">Disabled</span>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      {!c.custom && (
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-slate-500">Enabled</span>
                          <Switch
                            checked={!c.disabled}
                            onCheckedChange={(v) => toggleCategory(c.value, !v)}
                          />
                        </div>
                      )}
                      {c.custom && (
                        <Button size="icon" variant="ghost" onClick={() => removeCategory(c.value)}>
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Defaults */}
          <Card>
            <CardHeader>
              <CardTitle>Default Values</CardTitle>
              <CardDescription>Applied to newly created work orders.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Default priority</Label>
                  <Select value={defaultPriority} onValueChange={setDefaultPriority}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {PRIORITIES.map(p => <SelectItem key={p} value={p}>{fmt(p)}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Default status</Label>
                  <Select value={defaultStatus} onValueChange={setDefaultStatus}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {STATUSES.map(s => <SelectItem key={s} value={s}>{fmt(s)}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Workflow */}
          <Card>
            <CardHeader>
              <CardTitle>Workflow Transitions</CardTitle>
              <CardDescription>Define which status changes are allowed. Check a cell to allow moving from row status to column status.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="min-w-full border-collapse text-sm">
                  <thead>
                    <tr>
                      <th className="text-left font-medium text-slate-600 p-2 sticky left-0 bg-white">From \ To</th>
                      {STATUSES.map(s => (
                        <th key={s} className="p-2 text-center font-medium text-slate-600" title={fmt(s)}>
                          <div className="w-16 text-xs">{fmt(s)}</div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {STATUSES.map(from => (
                      <tr key={from} className="border-t border-slate-100">
                        <td className="p-2 font-medium text-slate-900 sticky left-0 bg-white whitespace-nowrap">{fmt(from)}</td>
                        {STATUSES.map(to => (
                          <td key={to} className="p-2 text-center">
                            <input
                              type="checkbox"
                              disabled={from === to}
                              checked={workflow[from]?.includes(to) || false}
                              onChange={e => toggleTransition(from, to, e.target.checked)}
                              className="h-4 w-4 rounded border-slate-300"
                            />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button onClick={handleSave} disabled={saving}>
              {saving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Saving...</> : <><Save className="h-4 w-4 mr-2" /> Save settings</>}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}