import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Bell, Mail, Save, Wrench, MessageSquare, AlertTriangle, Megaphone } from 'lucide-react';
import { toast } from 'sonner';

export default function NotificationPreferencesManager({ userEmail }) {
  const queryClient = useQueryClient();
  const [preferences, setPreferences] = useState({
    email_work_orders: true,
    email_messages: true,
    email_compliance: true,
    email_announcements: true,
    in_app_work_orders: true,
    in_app_messages: true,
    in_app_compliance: true,
    in_app_announcements: true,
  });

  const { data: existingPrefs } = useQuery({
    queryKey: ['notificationPreferences', userEmail],
    queryFn: async () => {
      const prefs = await base44.entities.NotificationPreference.filter({ user_email: userEmail });
      return prefs[0];
    },
    enabled: !!userEmail,
  });

  useEffect(() => {
    if (existingPrefs) {
      setPreferences({
        email_work_orders: existingPrefs.email_work_orders ?? true,
        email_messages: existingPrefs.email_messages ?? true,
        email_compliance: existingPrefs.email_compliance ?? true,
        email_announcements: existingPrefs.email_announcements ?? true,
        in_app_work_orders: existingPrefs.in_app_work_orders ?? true,
        in_app_messages: existingPrefs.in_app_messages ?? true,
        in_app_compliance: existingPrefs.in_app_compliance ?? true,
        in_app_announcements: existingPrefs.in_app_announcements ?? true,
      });
    }
  }, [existingPrefs]);

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      if (existingPrefs) {
        return base44.entities.NotificationPreference.update(existingPrefs.id, data);
      } else {
        return base44.entities.NotificationPreference.create({
          user_email: userEmail,
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

  const notificationTypes = [
    {
      icon: Wrench,
      title: "Work Orders",
      description: "Updates on maintenance requests and work order status changes",
      emailKey: 'email_work_orders',
      inAppKey: 'in_app_work_orders'
    },
    {
      icon: MessageSquare,
      title: "Messages",
      description: "New messages and resident inquiries",
      emailKey: 'email_messages',
      inAppKey: 'in_app_messages'
    },
    {
      icon: AlertTriangle,
      title: "Compliance Deadlines",
      description: "Important compliance and regulatory deadlines",
      emailKey: 'email_compliance',
      inAppKey: 'in_app_compliance'
    },
    {
      icon: Megaphone,
      title: "Announcements",
      description: "Building announcements and important updates",
      emailKey: 'email_announcements',
      inAppKey: 'in_app_announcements'
    }
  ];

  return (
    <div className="space-y-6">
      {notificationTypes.map((type, idx) => (
        <Card key={idx}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <type.icon className="h-5 w-5 text-blue-600" />
              {type.title}
            </CardTitle>
            <CardDescription>{type.description}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-3">
                <Mail className="h-5 w-5 text-gray-400" />
                <div>
                  <Label className="font-medium">Email Notifications</Label>
                  <p className="text-xs text-gray-500">Receive via email</p>
                </div>
              </div>
              <Switch
                checked={preferences[type.emailKey]}
                onCheckedChange={(checked) => 
                  setPreferences({ ...preferences, [type.emailKey]: checked })
                }
              />
            </div>
            
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-3">
                <Bell className="h-5 w-5 text-gray-400" />
                <div>
                  <Label className="font-medium">In-App Notifications</Label>
                  <p className="text-xs text-gray-500">Show in notification center</p>
                </div>
              </div>
              <Switch
                checked={preferences[type.inAppKey]}
                onCheckedChange={(checked) => 
                  setPreferences({ ...preferences, [type.inAppKey]: checked })
                }
              />
            </div>
          </CardContent>
        </Card>
      ))}

      <Button 
        onClick={handleSave} 
        className="w-full bg-blue-600 hover:bg-blue-700 text-lg py-6"
        disabled={saveMutation.isPending}
      >
        <Save className="h-5 w-5 mr-2" />
        {saveMutation.isPending ? 'Saving...' : 'Save Preferences'}
      </Button>
    </div>
  );
}