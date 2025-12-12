import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Bell, Mail, Smartphone, Save } from 'lucide-react';
import { toast } from 'sonner';

export default function NotificationSettings({ userEmail }) {
  const queryClient = useQueryClient();
  const [preferences, setPreferences] = useState({
    email_announcements: true,
    email_work_order_updates: true,
    in_app_announcements: true,
    in_app_work_order_updates: true,
  });

  const { data: existingPrefs } = useQuery({
    queryKey: ['notificationPreferences', userEmail],
    queryFn: async () => {
      const prefs = await base44.entities.NotificationPreference.filter({ resident_email: userEmail });
      return prefs[0];
    },
    enabled: !!userEmail,
  });

  useEffect(() => {
    if (existingPrefs) {
      setPreferences({
        email_announcements: existingPrefs.email_announcements ?? true,
        email_work_order_updates: existingPrefs.email_work_order_updates ?? true,
        in_app_announcements: existingPrefs.in_app_announcements ?? true,
        in_app_work_order_updates: existingPrefs.in_app_work_order_updates ?? true,
      });
    }
  }, [existingPrefs]);

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      if (existingPrefs) {
        return base44.entities.NotificationPreference.update(existingPrefs.id, data);
      } else {
        return base44.entities.NotificationPreference.create({
          resident_email: userEmail,
          ...data
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notificationPreferences'] });
      toast.success('Notification preferences saved');
    },
    onError: () => {
      toast.error('Failed to save preferences');
    }
  });

  const handleSave = () => {
    saveMutation.mutate(preferences);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Email Notifications
          </CardTitle>
          <CardDescription>
            Receive notifications via email
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="email-announcements" className="font-medium">
                Building Announcements
              </Label>
              <p className="text-sm text-slate-500">
                Get notified about new announcements in your building
              </p>
            </div>
            <Switch
              id="email-announcements"
              checked={preferences.email_announcements}
              onCheckedChange={(checked) => 
                setPreferences({ ...preferences, email_announcements: checked })
              }
            />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="email-work-orders" className="font-medium">
                Work Order Updates
              </Label>
              <p className="text-sm text-slate-500">
                Get notified when your maintenance requests are updated
              </p>
            </div>
            <Switch
              id="email-work-orders"
              checked={preferences.email_work_order_updates}
              onCheckedChange={(checked) => 
                setPreferences({ ...preferences, email_work_order_updates: checked })
              }
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            In-App Notifications
          </CardTitle>
          <CardDescription>
            Receive notifications in the Resident Portal
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="app-announcements" className="font-medium">
                Building Announcements
              </Label>
              <p className="text-sm text-slate-500">
                Show notifications for new announcements
              </p>
            </div>
            <Switch
              id="app-announcements"
              checked={preferences.in_app_announcements}
              onCheckedChange={(checked) => 
                setPreferences({ ...preferences, in_app_announcements: checked })
              }
            />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="app-work-orders" className="font-medium">
                Work Order Updates
              </Label>
              <p className="text-sm text-slate-500">
                Show notifications for maintenance request updates
              </p>
            </div>
            <Switch
              id="app-work-orders"
              checked={preferences.in_app_work_order_updates}
              onCheckedChange={(checked) => 
                setPreferences({ ...preferences, in_app_work_order_updates: checked })
              }
            />
          </div>
        </CardContent>
      </Card>

      <Button 
        onClick={handleSave} 
        className="w-full bg-blue-600 hover:bg-blue-700"
        disabled={saveMutation.isPending}
      >
        <Save className="h-4 w-4 mr-2" />
        {saveMutation.isPending ? 'Saving...' : 'Save Preferences'}
      </Button>
    </div>
  );
}