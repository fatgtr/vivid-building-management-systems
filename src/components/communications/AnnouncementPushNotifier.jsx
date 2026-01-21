import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Bell, Mail, MessageSquare, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function AnnouncementPushNotifier({ announcement }) {
  const [sendEmail, setSendEmail] = useState(true);
  const [sendSMS, setSendSMS] = useState(false);
  const [sendPush, setSendPush] = useState(true);
  const queryClient = useQueryClient();

  const notifyMutation = useMutation({
    mutationFn: async () => {
      return await base44.functions.invoke('sendAnnouncementNotifications', {
        announcementId: announcement.id,
        channels: {
          email: sendEmail,
          sms: sendSMS,
          push: sendPush
        }
      });
    },
    onSuccess: (response) => {
      toast.success(`Notifications sent to ${response.data.notificationCount} residents`);
      queryClient.invalidateQueries({ queryKey: ['announcements'] });
    },
    onError: (error) => {
      toast.error('Failed to send notifications');
      console.error(error);
    }
  });

  return (
    <div className="space-y-4 p-4 bg-slate-50 rounded-lg">
      <div className="flex items-center justify-between">
        <h4 className="font-semibold text-slate-900">Send Notifications</h4>
        <Button
          onClick={() => notifyMutation.mutate()}
          disabled={notifyMutation.isPending || (!sendEmail && !sendSMS && !sendPush)}
          className="bg-blue-600 hover:bg-blue-700"
        >
          {notifyMutation.isPending ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Sending...
            </>
          ) : (
            <>
              <Bell className="h-4 w-4 mr-2" />
              Send Notifications
            </>
          )}
        </Button>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Mail className="h-4 w-4 text-slate-600" />
            <Label htmlFor="email-notify">Email Notifications</Label>
          </div>
          <Switch
            id="email-notify"
            checked={sendEmail}
            onCheckedChange={setSendEmail}
          />
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-slate-600" />
            <Label htmlFor="sms-notify">SMS Notifications</Label>
          </div>
          <Switch
            id="sms-notify"
            checked={sendSMS}
            onCheckedChange={setSendSMS}
          />
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell className="h-4 w-4 text-slate-600" />
            <Label htmlFor="push-notify">Push Notifications</Label>
          </div>
          <Switch
            id="push-notify"
            checked={sendPush}
            onCheckedChange={setSendPush}
          />
        </div>
      </div>

      <p className="text-xs text-slate-500">
        Target: {announcement.target_audience === 'all_residents' ? 'All Residents' : announcement.target_audience}
      </p>
    </div>
  );
}