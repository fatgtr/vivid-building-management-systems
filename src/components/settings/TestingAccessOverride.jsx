import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/components/ui/use-toast";
import { usePermissions } from '@/components/permissions/PermissionsContext';
import { AlertTriangle, FlaskConical } from 'lucide-react';

export default function TestingAccessOverride() {
  const { refresh } = usePermissions();
  const [enabled, setEnabled] = useState(null); // null = loading
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    (async () => {
      try {
        const records = await base44.entities.SystemSetting.filter({ setting_key: 'test_access_override' });
        setEnabled(records.length > 0 && records[0].setting_value === 'true');
      } catch (e) {
        setEnabled(false);
      }
    })();
  }, []);

  const handleToggle = async (checked) => {
    setSaving(true);
    try {
      const records = await base44.entities.SystemSetting.filter({ setting_key: 'test_access_override' });
      if (records.length > 0) {
        await base44.entities.SystemSetting.update(records[0].id, { setting_value: String(checked) });
      } else {
        await base44.entities.SystemSetting.create({
          setting_key: 'test_access_override',
          setting_value: String(checked),
          description: 'Grants non-admin sessions full admin access while enabled'
        });
      }
      setEnabled(checked);
      refresh();
      toast({
        title: checked ? 'Testing access override enabled' : 'Testing access override disabled',
        description: checked
          ? 'Non-admin sessions now have full admin access. Turn off after testing.'
          : 'Normal role-based permissions restored.'
      });
    } catch (e) {
      toast({ title: 'Could not update setting', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="border-amber-200 bg-amber-50/40">
      <CardHeader>
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center flex-shrink-0">
            <FlaskConical className="h-5 w-5 text-amber-600" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <CardTitle>Testing &amp; Diagnostics</CardTitle>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700 border border-amber-200">
                <AlertTriangle className="h-3 w-3" />
                Elevated access
              </span>
            </div>
            <CardDescription>
              Temporarily elevates non-admin sessions to full admin access for Testing Agent runs.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between gap-4 rounded-lg border border-amber-200 bg-white p-4">
          <div className="flex-1">
            <p className="text-sm font-medium text-slate-900">Testing access override</p>
            <p className="text-xs text-slate-500 mt-1">
              Grants non-admin sessions full admin access while enabled. Turn off after testing.
            </p>
          </div>
          <div className="flex items-center gap-3">
            {enabled === null ? (
              <div className="h-6 w-11 rounded-full bg-slate-200 animate-pulse" />
            ) : (
              <Switch
                checked={enabled}
                onCheckedChange={handleToggle}
                disabled={saving}
                aria-label="Testing access override"
              />
            )}
            <span className={`text-sm font-medium ${enabled ? 'text-amber-700' : 'text-slate-500'}`}>
              {enabled ? 'On' : 'Off'}
            </span>
          </div>
        </div>
        <p className="text-xs text-slate-400 mt-3">
          This only changes in-memory permission checks for the current session — it does not alter any user's
          actual role and does not bypass server-side record security.
        </p>
      </CardContent>
    </Card>
  );
}