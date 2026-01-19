import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useBuildingContext } from '@/components/BuildingContext';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertCircle, Phone, Plus, Send } from 'lucide-react';
import { toast } from 'sonner';
import PageHeader from '@/components/common/PageHeader';

export default function EmergencyContacts() {
  const { selectedBuildingId } = useBuildingContext();
  const [showDialog, setShowDialog] = useState(false);
  const [showNotifyDialog, setShowNotifyDialog] = useState(false);
  const [notificationMessage, setNotificationMessage] = useState('');
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    building_id: selectedBuildingId || '',
    contact_type: 'emergency_services',
    name: '',
    phone: '',
    email: '',
    available_24_7: true
  });

  const { data: contacts = [] } = useQuery({
    queryKey: ['emergencyContacts', selectedBuildingId],
    queryFn: async () => {
      const all = await base44.entities.EmergencyContact.list();
      return selectedBuildingId ? all.filter(c => c.building_id === selectedBuildingId) : all;
    }
  });

  const { data: residents = [] } = useQuery({
    queryKey: ['residents'],
    queryFn: () => base44.entities.Resident.list()
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.EmergencyContact.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['emergencyContacts'] });
      setShowDialog(false);
      toast.success('Contact added');
    }
  });

  const handleBroadcast = async () => {
    const buildingResidents = residents.filter(r => r.building_id === selectedBuildingId && r.email);
    
    try {
      await Promise.all(
        buildingResidents.map(resident =>
          base44.integrations.Core.SendEmail({
            to: resident.email,
            subject: '🚨 EMERGENCY NOTIFICATION',
            body: notificationMessage
          })
        )
      );
      toast.success(`Emergency notification sent to ${buildingResidents.length} residents`);
      setShowNotifyDialog(false);
      setNotificationMessage('');
    } catch (error) {
      toast.error('Failed to send notifications');
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Emergency Contacts"
        subtitle="Critical contacts and mass notification system"
        action={() => setShowDialog(true)}
        actionLabel="Add Contact"
      />

      <Card className="border-2 border-red-200 bg-red-50">
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-red-600 rounded-lg">
              <AlertCircle className="h-8 w-8 text-white" />
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-lg mb-2">Emergency Mass Notification</h3>
              <p className="text-sm text-slate-700 mb-4">
                Send urgent notifications to all residents instantly
              </p>
              <Button onClick={() => setShowNotifyDialog(true)} className="bg-red-600 hover:bg-red-700">
                <Send className="h-4 w-4 mr-2" />
                Send Emergency Alert
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {contacts.map((contact) => (
          <Card key={contact.id} className="border-2 border-slate-200 hover:border-blue-300 hover:shadow-lg transition-all">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                  <Phone className="h-6 w-6 text-blue-600" />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-lg mb-1">{contact.name}</h3>
                  <Badge className="mb-3 capitalize">{contact.contact_type?.replace(/_/g, ' ')}</Badge>
                  
                  <div className="space-y-2">
                    <a href={`tel:${contact.phone}`} className="flex items-center gap-2 text-blue-600 hover:underline">
                      <Phone className="h-4 w-4" />
                      <span className="font-semibold">{contact.phone}</span>
                    </a>
                    {contact.phone_2 && (
                      <a href={`tel:${contact.phone_2}`} className="flex items-center gap-2 text-blue-600 hover:underline text-sm">
                        <Phone className="h-3 w-3" />
                        <span>{contact.phone_2}</span>
                      </a>
                    )}
                    {contact.available_24_7 && (
                      <Badge className="bg-green-600">24/7 Available</Badge>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Emergency Contact</DialogTitle>
          </DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); createMutation.mutate(formData); }} className="space-y-4">
            <div>
              <Label>Contact Type *</Label>
              <Select value={formData.contact_type} onValueChange={(v) => setFormData({ ...formData, contact_type: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="emergency_services">Emergency Services</SelectItem>
                  <SelectItem value="building_management">Building Management</SelectItem>
                  <SelectItem value="security">Security</SelectItem>
                  <SelectItem value="fire">Fire Department</SelectItem>
                  <SelectItem value="police">Police</SelectItem>
                  <SelectItem value="utility">Utility Company</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Name *</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>
            <div>
              <Label>Phone *</Label>
              <Input
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                required
              />
            </div>
            <div>
              <Label>Email</Label>
              <Input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? 'Adding...' : 'Add Contact'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={showNotifyDialog} onOpenChange={setShowNotifyDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-red-600">Send Emergency Alert</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-900 font-semibold">
                ⚠️ This will send an email to ALL residents in the building
              </p>
            </div>
            <div>
              <Label>Emergency Message *</Label>
              <Textarea
                value={notificationMessage}
                onChange={(e) => setNotificationMessage(e.target.value)}
                rows={6}
                placeholder="Describe the emergency situation and what residents should do..."
                required
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setShowNotifyDialog(false)}>Cancel</Button>
              <Button
                onClick={handleBroadcast}
                className="bg-red-600 hover:bg-red-700"
                disabled={!notificationMessage.trim()}
              >
                <Send className="h-4 w-4 mr-2" />
                Send Alert Now
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}