import React, { useState } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { AlertTriangle, Send, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function BroadcastComposer({ buildingId, onSuccess }) {
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [priority, setPriority] = useState('normal');
  const [targetAudience, setTargetAudience] = useState('all');
  const [sendEmail, setSendEmail] = useState(false);
  const queryClient = useQueryClient();

  const { data: residents = [] } = useQuery({
    queryKey: ['residents', buildingId],
    queryFn: () => buildingId 
      ? base44.entities.Resident.filter({ building_id: buildingId })
      : base44.entities.Resident.list(),
  });

  const broadcastMutation = useMutation({
    mutationFn: async (data) => {
      const broadcast = await base44.entities.BroadcastMessage.create(data);
      
      // Create notifications for each recipient
      const filteredResidents = residents.filter(r => {
        if (targetAudience === 'all') return true;
        if (targetAudience === 'owners') return r.is_owner;
        if (targetAudience === 'tenants') return !r.is_owner;
        return true;
      });

      await Promise.all(
        filteredResidents.map(resident =>
          base44.functions.invoke('createNotification', {
            recipientEmail: resident.email,
            title: `Broadcast: ${subject}`,
            message: message,
            type: priority === 'emergency' ? 'system' : 'announcement',
            priority: priority === 'emergency' ? 'urgent' : priority,
            sendEmail: sendEmail,
            buildingId: buildingId
          })
        )
      );

      return broadcast;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['broadcastMessages'] });
      toast.success('Broadcast sent successfully');
      setSubject('');
      setMessage('');
      setPriority('normal');
      setTargetAudience('all');
      setSendEmail(false);
      if (onSuccess) onSuccess();
    },
  });

  const handleSend = async () => {
    if (!subject.trim() || !message.trim()) {
      toast.error('Subject and message are required');
      return;
    }

    const filteredResidents = residents.filter(r => {
      if (targetAudience === 'all') return true;
      if (targetAudience === 'owners') return r.is_owner;
      if (targetAudience === 'tenants') return !r.is_owner;
      return true;
    });

    await broadcastMutation.mutateAsync({
      building_id: buildingId,
      sender_email: (await base44.auth.me()).email,
      sender_name: (await base44.auth.me()).full_name,
      subject,
      message,
      priority,
      target_audience: targetAudience,
      send_email: sendEmail,
      recipients_count: filteredResidents.length,
      sent_date: new Date().toISOString()
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Send className="h-5 w-5" />
          Broadcast Message
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label>Subject</Label>
          <Input
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Message subject"
          />
        </div>

        <div>
          <Label>Message</Label>
          <Textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Your message to residents..."
            rows={5}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Priority</Label>
            <Select value={priority} onValueChange={setPriority}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="normal">Normal</SelectItem>
                <SelectItem value="urgent">Urgent</SelectItem>
                <SelectItem value="emergency">Emergency</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Target Audience</Label>
            <Select value={targetAudience} onValueChange={setTargetAudience}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Residents</SelectItem>
                <SelectItem value="owners">Owners Only</SelectItem>
                <SelectItem value="tenants">Tenants Only</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
          <div>
            <Label>Also send via Email</Label>
            <p className="text-xs text-gray-500">Recipients will receive email notification</p>
          </div>
          <Switch checked={sendEmail} onCheckedChange={setSendEmail} />
        </div>

        {priority === 'emergency' && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-red-900">Emergency Broadcast</p>
              <p className="text-xs text-red-700">This will send urgent notifications to all recipients</p>
            </div>
          </div>
        )}

        <div className="pt-4 border-t">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-gray-600">
              Recipients: <span className="font-semibold">{residents.filter(r => {
                if (targetAudience === 'all') return true;
                if (targetAudience === 'owners') return r.is_owner;
                if (targetAudience === 'tenants') return !r.is_owner;
                return true;
              }).length}</span>
            </p>
          </div>

          <Button
            onClick={handleSend}
            disabled={broadcastMutation.isPending || !subject.trim() || !message.trim()}
            className="w-full bg-blue-600 hover:bg-blue-700"
          >
            {broadcastMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Send Broadcast
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}