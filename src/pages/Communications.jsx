import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useBuildingContext } from '@/components/BuildingContext';
import { usePermissions } from '@/components/permissions/PermissionsContext';

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import EmptyState from '@/components/common/EmptyState';
import StatusBadge from '@/components/common/StatusBadge';

import ChatInterface from '@/components/communications/ChatInterface';
import ChatList from '@/components/communications/ChatList';
import BroadcastComposer from '@/components/communications/BroadcastComposer';
import EventRSVPCard from '@/components/communications/EventRSVPCard';
import DirectMessaging from '@/components/communications/DirectMessaging';
import AnnouncementPushNotifier from '@/components/communications/AnnouncementPushNotifier';


import { 
  Bell, Search, Building2, MoreVertical, Pencil, Trash2, Send, Calendar, Users, 
  AlertTriangle, Info, Megaphone, Mail, Inbox, CheckCircle2, Clock, User, Tag, 
  Sparkles, FileText, Edit, Plus, MessageSquare, Radio
} from 'lucide-react';
import ReactQuill from 'react-quill';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { format } from 'date-fns';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const announcementTypes = [
  { value: 'general', label: 'General', icon: Info, color: 'bg-slate-100 text-slate-700' },
  { value: 'maintenance', label: 'Maintenance', icon: Bell, color: 'bg-yellow-100 text-yellow-700' },
  { value: 'emergency', label: 'Emergency', icon: AlertTriangle, color: 'bg-red-100 text-red-700' },
  { value: 'event', label: 'Event', icon: Calendar, color: 'bg-purple-100 text-purple-700' },
  { value: 'policy', label: 'Policy', icon: Megaphone, color: 'bg-blue-100 text-blue-700' },
];

const initialAnnouncementFormState = {
  building_id: '', title: '', content: '', type: 'general', priority: 'normal',
  publish_date: '', expiry_date: '', target_audience: 'all', status: 'draft',
  is_event: false, event_date: '', event_location: '', rsvp_enabled: false,
  rsvp_deadline: '', max_attendees: null,
};

export default function Communications() {
  const queryClient = useQueryClient();
  const { selectedBuildingId } = useBuildingContext();
  const { can } = usePermissions();
  
  const [user, setUser] = useState(null);
  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const [activeMainTab, setActiveMainTab] = useState('chat');
  const [selectedChat, setSelectedChat] = useState(null);





  // Announcements
  const [showAnnouncementDialog, setShowAnnouncementDialog] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState(null);
  const [announcementFormData, setAnnouncementFormData] = useState(initialAnnouncementFormState);
  const [announcementSearchQuery, setAnnouncementSearchQuery] = useState('');
  const [announcementFilterBuilding, setAnnouncementFilterBuilding] = useState('all');
  const [announcementFilterStatus, setAnnouncementFilterStatus] = useState('all');
  const [deleteAnnouncement, setDeleteAnnouncement] = useState(null);

  // Messages
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [messageFilterCategory, setMessageFilterCategory] = useState('all');
  const [messageFilterStatus, setMessageFilterStatus] = useState('all');
  const [messageSearchQuery, setMessageSearchQuery] = useState('');
  const [responseText, setResponseText] = useState('');

  // Templates
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [templateType, setTemplateType] = useState('announcement');

  // Compose Email
  const [showEmailDialog, setShowEmailDialog] = useState(false);
  const [emailForm, setEmailForm] = useState({
    subject: '', body: '',
    recipients: { all_residents: false, owners: false, tenants: false, managers: false, strata_managers: false, committee: false }
  });
  const [isSendingEmail, setIsSendingEmail] = useState(false);

  // Data fetching
  const { data: chats = [] } = useQuery({
    queryKey: ['chats', selectedBuildingId, user?.email],
    queryFn: () => selectedBuildingId ? base44.entities.Chat.filter({ building_id: selectedBuildingId }) : base44.entities.Chat.list(),
    enabled: !!user && !!selectedBuildingId,
  });



  const { data: announcements = [] } = useQuery({
    queryKey: ['announcements'],
    queryFn: () => base44.entities.Announcement.list('-created_date'),
  });

  const { data: buildings = [] } = useQuery({
    queryKey: ['buildings'],
    queryFn: () => base44.entities.Building.list(),
  });

  const { data: residents = [] } = useQuery({
    queryKey: ['residents'],
    queryFn: () => base44.entities.Resident.list(),
  });

  const { data: messages = [] } = useQuery({
    queryKey: ['messages', selectedBuildingId],
    queryFn: () => selectedBuildingId ? base44.entities.Message.filter({ building_id: selectedBuildingId }) : base44.entities.Message.list('-created_date'),
  });

  const { data: communicationTemplates = [] } = useQuery({
    queryKey: ['communicationTemplates'],
    queryFn: () => base44.entities.CommunicationTemplate.list(),
  });

  const { data: messageTemplates = [] } = useQuery({
    queryKey: ['messageTemplates'],
    queryFn: () => base44.entities.MessageTemplate.list(),
  });

  // Mutations
  const createAnnouncementMutation = useMutation({
    mutationFn: (data) => base44.entities.Announcement.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['announcements'] }); handleCloseAnnouncementDialog(); toast.success('Announcement created!'); },
  });

  const updateAnnouncementMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Announcement.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['announcements'] }); handleCloseAnnouncementDialog(); toast.success('Announcement updated!'); },
  });

  const deleteAnnouncementMutation = useMutation({
    mutationFn: (id) => base44.entities.Announcement.delete(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['announcements'] }); setDeleteAnnouncement(null); toast.success('Announcement deleted!'); },
  });

  const processMessageMutation = useMutation({
    mutationFn: (messageId) => base44.functions.invoke('processResidentMessage', { message_id: messageId }),
    onSuccess: (data, messageId) => {
      queryClient.invalidateQueries({ queryKey: ['messages'] });
      const message = messages.find(m => m.id === messageId);
      if (message) {
        setSelectedMessage({ ...message, ...data.analysis, suggested_response: data.suggested_response });
        setResponseText(data.suggested_response || '');
      }
      toast.success('Message analyzed');
    },
  });

  const updateMessageMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Message.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['messages'] }); toast.success('Message updated'); },
  });

  const sendResponseMutation = useMutation({
    mutationFn: async ({ messageId, response }) => {
      const message = messages.find(m => m.id === messageId);
      await base44.integrations.Core.SendEmail({ to: message.sender_email, subject: `Re: ${message.subject}`, body: response });
      return base44.entities.Message.update(messageId, { response, response_date: new Date().toISOString(), status: 'resolved' });
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['messages'] }); toast.success('Response sent'); setSelectedMessage(null); setResponseText(''); },
  });

  const createCommunicationTemplateMutation = useMutation({
    mutationFn: (data) => base44.entities.CommunicationTemplate.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['communicationTemplates'] }); toast.success('Template created'); setEditingTemplate(null); },
  });

  const updateCommunicationTemplateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.CommunicationTemplate.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['communicationTemplates'] }); toast.success('Template updated'); setEditingTemplate(null); },
  });

  const deleteCommunicationTemplateMutation = useMutation({
    mutationFn: (id) => base44.entities.CommunicationTemplate.delete(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['communicationTemplates'] }); toast.success('Template deleted'); },
  });

  const createMessageTemplateMutation = useMutation({
    mutationFn: (data) => base44.entities.MessageTemplate.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['messageTemplates'] }); toast.success('Template created'); setEditingTemplate(null); },
  });

  const updateMessageTemplateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.MessageTemplate.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['messageTemplates'] }); toast.success('Template updated'); setEditingTemplate(null); },
  });

  const deleteMessageTemplateMutation = useMutation({
    mutationFn: (id) => base44.entities.MessageTemplate.delete(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['messageTemplates'] }); toast.success('Template deleted'); },
  });

  // Handlers
  const userChats = chats.filter(chat => chat.participants.includes(user?.email));



  const handleCloseAnnouncementDialog = () => {
    setShowAnnouncementDialog(false);
    setEditingAnnouncement(null);
    setAnnouncementFormData(initialAnnouncementFormState);
  };

  const handleEditAnnouncement = (announcement) => {
    setEditingAnnouncement(announcement);
    setAnnouncementFormData({
      building_id: announcement.building_id || '', title: announcement.title || '', content: announcement.content || '',
      type: announcement.type || 'general', priority: announcement.priority || 'normal',
      publish_date: announcement.publish_date || '', expiry_date: announcement.expiry_date || '',
      target_audience: announcement.target_audience || 'all', status: announcement.status || 'draft',
      is_event: announcement.is_event || false, event_date: announcement.event_date || '',
      event_location: announcement.event_location || '', rsvp_enabled: announcement.rsvp_enabled || false,
      rsvp_deadline: announcement.rsvp_deadline || '', max_attendees: announcement.max_attendees || null,
    });
    setShowAnnouncementDialog(true);
  };

  const handleSubmitAnnouncement = (e) => {
    e.preventDefault();
    const submitData = { ...announcementFormData };
    if (submitData.publish_date) {
      const publishDateTime = new Date(submitData.publish_date);
      const now = new Date();
      if (publishDateTime > now && submitData.status === 'draft') submitData.status = 'scheduled';
      else if (publishDateTime <= now && submitData.status === 'scheduled') submitData.status = 'published';
    }
    if (editingAnnouncement) updateAnnouncementMutation.mutate({ id: editingAnnouncement.id, data: submitData });
    else createAnnouncementMutation.mutate(submitData);
  };

  const handlePublishAnnouncement = (announcement) => {
    updateAnnouncementMutation.mutate({ id: announcement.id, data: { ...announcement, status: 'published', publish_date: new Date().toISOString() } });
  };

  const handleRSVP = async (announcement, rsvpData) => {
    const existingRSVPs = announcement.rsvp_responses || [];
    const updatedRSVPs = existingRSVPs.filter(r => r.resident_email !== user.email);
    
    updatedRSVPs.push({
      resident_email: user.email,
      resident_name: user.full_name,
      response: rsvpData.response,
      guests_count: rsvpData.guests_count || 0,
      responded_date: new Date().toISOString()
    });

    updateAnnouncementMutation.mutate({
      id: announcement.id,
      data: { ...announcement, rsvp_responses: updatedRSVPs }
    });
  };

  const handleMessageClick = (message) => {
    setSelectedMessage(message);
    setResponseText(message.suggested_response || message.response || '');
    if (message.status === 'unread') updateMessageMutation.mutate({ id: message.id, data: { status: 'read' } });
  };

  const handleSendMessageResponse = () => {
    if (selectedMessage && responseText.trim()) sendResponseMutation.mutate({ messageId: selectedMessage.id, response: responseText });
  };

  const handleSaveCommunicationTemplate = () => {
    const data = { ...editingTemplate, building_id: editingTemplate.building_id || null, placeholders: ['building_name', 'date', 'time', 'location', 'contact_name', 'contact_email'] };
    if (editingTemplate.id) updateCommunicationTemplateMutation.mutate({ id: editingTemplate.id, data });
    else createCommunicationTemplateMutation.mutate(data);
  };

  const handleSaveMessageTemplate = () => {
    const data = { ...editingTemplate, building_id: editingTemplate.building_id || null, placeholders: ['resident_name', 'building_name', 'unit_number', 'subject'] };
    if (editingTemplate.id) updateMessageTemplateMutation.mutate({ id: editingTemplate.id, data });
    else createMessageTemplateMutation.mutate(data);
  };

  const handleSendEmail = async () => {
    if (!emailForm.subject || !emailForm.body) { toast.error('Please fill in subject and body'); return; }
    const recipientEmails = new Set();
    const selectedBuilding = selectedBuildingId ? buildings.find(b => b.id === selectedBuildingId) : null;
    const buildingResidents = selectedBuildingId ? residents.filter(r => r.building_id === selectedBuildingId) : residents;
    
    if (emailForm.recipients.all_residents) buildingResidents.forEach(r => r.email && recipientEmails.add(r.email));
    if (emailForm.recipients.owners) {
      buildingResidents.filter(r => r.resident_type === 'owner').forEach(r => r.email && recipientEmails.add(r.email));
      buildingResidents.forEach(r => { if (r.investor_email) recipientEmails.add(r.investor_email); });
    }
    if (emailForm.recipients.tenants) buildingResidents.filter(r => r.resident_type === 'tenant').forEach(r => r.email && recipientEmails.add(r.email));
    if (emailForm.recipients.managers) {
      if (selectedBuilding?.manager_email) recipientEmails.add(selectedBuilding.manager_email);
      buildingResidents.forEach(r => { if (r.managing_agent_email) recipientEmails.add(r.managing_agent_email); });
    }
    if (emailForm.recipients.strata_managers && selectedBuilding?.strata_managing_agent_email) recipientEmails.add(selectedBuilding.strata_managing_agent_email);
    if (emailForm.recipients.committee) buildingResidents.filter(r => r.investor_strata_committee_member).forEach(r => { if (r.investor_email) recipientEmails.add(r.investor_email); });
    
    if (recipientEmails.size === 0) { toast.error('Please select at least one recipient group'); return; }

    setIsSendingEmail(true);
    let successCount = 0, failCount = 0;
    for (const email of recipientEmails) {
      try {
        await base44.integrations.Core.SendEmail({ to: email, subject: emailForm.subject, body: emailForm.body });
        successCount++;
      } catch (error) { failCount++; }
    }
    if (successCount > 0) {
      toast.success(`Email sent to ${successCount} recipient(s)${failCount > 0 ? ` (${failCount} failed)` : ''}`);
      setShowEmailDialog(false);
      setEmailForm({ subject: '', body: '', recipients: { all_residents: false, owners: false, tenants: false, managers: false, strata_managers: false, committee: false } });
    } else toast.error('Failed to send emails');
    setIsSendingEmail(false);
  };

  const getBuildingName = (buildingId) => buildings.find(b => b.id === buildingId)?.name || 'All Buildings';
  const getTypeConfig = (type) => announcementTypes.find(t => t.value === type) || announcementTypes[0];

  const filteredAnnouncements = announcements.filter(a => {
    const matchesSearch = a.title?.toLowerCase().includes(announcementSearchQuery.toLowerCase());
    const matchesBuilding = announcementFilterBuilding === 'all' || a.building_id === announcementFilterBuilding;
    const matchesStatus = announcementFilterStatus === 'all' || a.status === announcementFilterStatus;
    return matchesSearch && matchesBuilding && matchesStatus;
  });

  const filteredMessages = messages.filter(msg => {
    const statusMatch = messageFilterStatus === 'all' || msg.status === messageFilterStatus;
    const categoryMatch = messageFilterCategory === 'all' || msg.category === messageFilterCategory;
    const searchMatch = !messageSearchQuery || msg.subject?.toLowerCase().includes(messageSearchQuery.toLowerCase()) || 
      msg.content?.toLowerCase().includes(messageSearchQuery.toLowerCase()) || msg.sender_name?.toLowerCase().includes(messageSearchQuery.toLowerCase());
    return statusMatch && categoryMatch && searchMatch;
  });

  const getStatusBadge = (status) => {
    const styles = { unread: 'bg-blue-100 text-blue-700', read: 'bg-slate-100 text-slate-700', in_progress: 'bg-yellow-100 text-yellow-700', resolved: 'bg-green-100 text-green-700', archived: 'bg-slate-100 text-slate-500' };
    return <Badge className={styles[status]}>{status}</Badge>;
  };

  const getPriorityBadge = (priority) => {
    const styles = { low: 'bg-slate-100 text-slate-600', medium: 'bg-blue-100 text-blue-700', high: 'bg-orange-100 text-orange-700', urgent: 'bg-red-100 text-red-700' };
    return <Badge className={styles[priority]}>{priority}</Badge>;
  };

  const statsByMessageStatus = {
    unread: messages.filter(m => m.status === 'unread').length,
    in_progress: messages.filter(m => m.status === 'in_progress').length,
    resolved: messages.filter(m => m.status === 'resolved').length,
  };

  if (!user) return <div className="p-8 text-center">Loading...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Communications Center</h1>
          <p className="text-gray-600 mt-1">Manage all your building communications in one place</p>
        </div>
        <Button onClick={() => setShowEmailDialog(true)} variant="outline" className="gap-2">
          <Mail className="h-4 w-4" /> Compose Email
        </Button>
      </div>

      <Tabs value={activeMainTab} onValueChange={setActiveMainTab} className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="chat"><MessageSquare className="h-4 w-4 mr-2" />Chat</TabsTrigger>
          <TabsTrigger value="broadcast"><Radio className="h-4 w-4 mr-2" />Broadcast</TabsTrigger>
          <TabsTrigger value="management"><Megaphone className="h-4 w-4 mr-2" />Announcements</TabsTrigger>
          <TabsTrigger value="messages"><Mail className="h-4 w-4 mr-2" />Messages</TabsTrigger>
          <TabsTrigger value="templates"><FileText className="h-4 w-4 mr-2" />Templates</TabsTrigger>
        </TabsList>

        <TabsContent value="chat" className="mt-6">
          <DirectMessaging buildingId={selectedBuildingId} />
        </TabsContent>

        <TabsContent value="broadcast" className="mt-6">
          <div className="max-w-2xl mx-auto">
            <BroadcastComposer buildingId={selectedBuildingId} />
          </div>
        </TabsContent>



        <TabsContent value="management" className="space-y-6 mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <Card>
                <CardHeader className="flex-row items-center justify-between pb-3">
                  <CardTitle className="text-lg flex items-center gap-2"><Megaphone className="h-5 w-5 text-purple-600" /> Announcements</CardTitle>
                  <Button onClick={() => setShowAnnouncementDialog(true)} size="sm" className="bg-blue-600 hover:bg-blue-700">
                    <Plus className="h-4 w-4 mr-2" />New
                  </Button>
                </CardHeader>
                <CardContent className="space-y-4 pt-0">
              <div className="flex flex-wrap gap-4">
                <div className="relative flex-1 min-w-[200px] max-w-sm">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input placeholder="Search announcements..." value={announcementSearchQuery} onChange={(e) => setAnnouncementSearchQuery(e.target.value)} className="pl-9" />
                </div>
                <Select value={announcementFilterBuilding} onValueChange={setAnnouncementFilterBuilding}>
                  <SelectTrigger className="w-[200px]"><Building2 className="h-4 w-4 mr-2 text-slate-400" /><SelectValue placeholder="All Buildings" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Buildings</SelectItem>
                    {buildings.map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={announcementFilterStatus} onValueChange={setAnnouncementFilterStatus}>
                  <SelectTrigger className="w-[160px]"><SelectValue placeholder="All Status" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="scheduled">Scheduled</SelectItem>
                    <SelectItem value="published">Published</SelectItem>
                    <SelectItem value="archived">Archived</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {filteredAnnouncements.length === 0 ? (
                <EmptyState icon={Bell} title="No announcements" description="Create announcements to keep residents informed" action={() => setShowAnnouncementDialog(true)} actionLabel="New Announcement" />
              ) : (
                <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2">
                  {filteredAnnouncements.map((announcement) => {
                    const typeConfig = getTypeConfig(announcement.type);
                    const TypeIcon = typeConfig.icon;
                    return (
                      <Card key={announcement.id} className="border-0 shadow-sm hover:shadow-md transition-shadow">
                        <CardContent className="p-6">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex items-start gap-4 flex-1">
                              <div className={`p-3 rounded-xl ${typeConfig.color}`}><TypeIcon className="h-5 w-5" /></div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <h3 className="font-semibold text-lg text-slate-900">{announcement.title}</h3>
                                  <StatusBadge status={announcement.status} />
                                  {announcement.priority === 'urgent' && <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs font-medium rounded-full">Urgent</span>}
                                </div>
                                <div className="flex flex-wrap items-center gap-3 text-sm text-slate-500 mb-3">
                                  <span className="flex items-center gap-1"><Building2 className="h-3.5 w-3.5" />{getBuildingName(announcement.building_id)}</span>
                                  <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5" />{announcement.target_audience === 'all' ? 'All Residents' : announcement.target_audience}</span>
                                  <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" />{announcement.created_date && format(new Date(announcement.created_date), 'MMM d, yyyy')}</span>
                                </div>
                                <div className="text-slate-600 text-sm line-clamp-2 prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: announcement.content }} />
                                {announcement.is_event && (
                                 <div className="mt-3">
                                   <EventRSVPCard 
                                     announcement={announcement} 
                                     userEmail={user.email}
                                     onRSVP={(rsvpData) => handleRSVP(announcement, rsvpData)}
                                   />
                                 </div>
                                )}
                                </div>
                                </div>
                                <div className="flex items-center gap-2">
                              {announcement.status === 'draft' && <Button size="sm" className="bg-blue-600 hover:bg-blue-700" onClick={() => handlePublishAnnouncement(announcement)}><Send className="h-3.5 w-3.5 mr-1" /> Publish</Button>}
                              {announcement.status === 'scheduled' && announcement.publish_date && <span className="text-xs text-slate-500">Scheduled: {format(new Date(announcement.publish_date), 'MMM d, yyyy h:mm a')}</span>}
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><MoreVertical className="h-4 w-4" /></Button></DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => handleEditAnnouncement(announcement)}><Pencil className="mr-2 h-4 w-4" /> Edit</DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => setDeleteAnnouncement(announcement)} className="text-red-600"><Trash2 className="mr-2 h-4 w-4" /> Delete</DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
                </CardContent>
              </Card>
            </div>

            <div className="lg:col-span-1 space-y-6">
              <Card>
                <CardHeader className="flex-row items-center justify-between pb-3">
                  <CardTitle className="text-lg flex items-center gap-2"><Mail className="h-5 w-5 text-orange-600" /> Messages</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 pt-0">
              <div className="grid gap-2">
                <Card className="bg-blue-50"><CardContent className="p-4"><div className="flex items-center justify-between"><div><p className="text-xs text-blue-600 font-medium">Unread</p><p className="text-xl font-bold text-blue-900">{statsByMessageStatus.unread}</p></div><Inbox className="h-6 w-6 text-blue-600" /></div></CardContent></Card>
                <Card className="bg-yellow-50"><CardContent className="p-4"><div className="flex items-center justify-between"><div><p className="text-xs text-yellow-600 font-medium">In Progress</p><p className="text-xl font-bold text-yellow-900">{statsByMessageStatus.in_progress}</p></div><Clock className="h-6 w-6 text-yellow-600" /></div></CardContent></Card>
                <Card className="bg-green-50"><CardContent className="p-4"><div className="flex items-center justify-between"><div><p className="text-xs text-green-600 font-medium">Resolved</p><p className="text-xl font-bold text-green-900">{statsByMessageStatus.resolved}</p></div><CheckCircle2 className="h-6 w-6 text-green-600" /></div></CardContent></Card>
              </div>
              <Button variant="outline" className="w-full" onClick={() => setActiveMainTab('messages')}>View All Messages</Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex-row items-center justify-between pb-3">
                  <CardTitle className="text-lg flex items-center gap-2"><FileText className="h-5 w-5 text-green-600" /> Templates</CardTitle>
                  <Button onClick={() => setEditingTemplate({ type: 'announcement' })} size="sm" className="bg-blue-600 hover:bg-blue-700">
                    <Plus className="h-4 w-4 mr-2" />New
                  </Button>
                </CardHeader>
                <CardContent className="space-y-4 pt-0">
              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {communicationTemplates.length === 0 && messageTemplates.length === 0 ? (
                  <p className="text-sm text-slate-500 text-center py-4">No templates yet</p>
                ) : (
                  <>
                    {communicationTemplates.slice(0, 3).map((template) => (
                      <Card key={template.id} className="border-l-4 border-blue-500">
                        <CardContent className="p-3">
                          <div className="flex items-center justify-between mb-1">
                            <p className="font-medium text-sm truncate">{template.name}</p>
                            <Badge variant="secondary" className="text-xs">Announcement</Badge>
                          </div>
                          <p className="text-xs text-slate-600 line-clamp-2">{template.title_template || template.content_template}</p>
                        </CardContent>
                      </Card>
                    ))}
                    {messageTemplates.slice(0, 3).map((template) => (
                      <Card key={template.id} className="border-l-4 border-green-500">
                        <CardContent className="p-3">
                          <div className="flex items-center justify-between mb-1">
                            <p className="font-medium text-sm truncate">{template.name}</p>
                            <Badge variant="secondary" className="text-xs">Response</Badge>
                          </div>
                          <p className="text-xs text-slate-600 line-clamp-2">{template.content}</p>
                        </CardContent>
                      </Card>
                    ))}
                  </>
                )}
              </div>
              <Button variant="outline" className="w-full" onClick={() => setActiveMainTab('templates')}>Manage All Templates</Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="messages" className="mt-6">
          <div className="grid gap-4 md:grid-cols-3 mb-6">
            <Card><CardContent className="pt-6"><div className="flex items-center justify-between"><div><p className="text-sm text-slate-500">Unread</p><p className="text-2xl font-bold">{statsByMessageStatus.unread}</p></div><Inbox className="h-8 w-8 text-blue-600" /></div></CardContent></Card>
            <Card><CardContent className="pt-6"><div className="flex items-center justify-between"><div><p className="text-sm text-slate-500">In Progress</p><p className="text-2xl font-bold">{statsByMessageStatus.in_progress}</p></div><Clock className="h-8 w-8 text-yellow-600" /></div></CardContent></Card>
            <Card><CardContent className="pt-6"><div className="flex items-center justify-between"><div><p className="text-sm text-slate-500">Resolved</p><p className="text-2xl font-bold">{statsByMessageStatus.resolved}</p></div><CheckCircle2 className="h-8 w-8 text-green-600" /></div></CardContent></Card>
          </div>

          <Card className="mb-6"><CardContent className="pt-6"><div className="flex flex-col sm:flex-row gap-4">
            <Input placeholder="Search messages..." value={messageSearchQuery} onChange={(e) => setMessageSearchQuery(e.target.value)} className="sm:max-w-xs" />
            <Select value={messageFilterStatus} onValueChange={setMessageFilterStatus}>
              <SelectTrigger className="sm:w-40"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="unread">Unread</SelectItem>
                <SelectItem value="read">Read</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="resolved">Resolved</SelectItem>
              </SelectContent>
            </Select>
            <Select value={messageFilterCategory} onValueChange={setMessageFilterCategory}>
              <SelectTrigger className="sm:w-48"><SelectValue placeholder="Category" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="maintenance">Maintenance</SelectItem>
                <SelectItem value="noise_complaint">Noise Complaint</SelectItem>
                <SelectItem value="parking">Parking</SelectItem>
                <SelectItem value="pets">Pets</SelectItem>
                <SelectItem value="bylaw_question">Bylaw Question</SelectItem>
                <SelectItem value="general_inquiry">General Inquiry</SelectItem>
              </SelectContent>
            </Select>
          </div></CardContent></Card>

          <div className="grid gap-4">
            {filteredMessages.map((msg) => (
              <Card key={msg.id} className={cn("cursor-pointer hover:shadow-md transition-shadow", msg.status === 'unread' && "border-l-4 border-l-blue-600")} onClick={() => handleMessageClick(msg)}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold truncate">{msg.subject}</h3>
                        {msg.priority && getPriorityBadge(msg.priority)}
                        {getStatusBadge(msg.status)}
                      </div>
                      <div className="flex items-center gap-3 text-sm text-slate-600 mb-2">
                        <span className="flex items-center gap-1"><User className="h-3 w-3" />{msg.sender_name}</span>
                        {msg.sender_unit && <span className="flex items-center gap-1"><Building2 className="h-3 w-3" />Unit {msg.sender_unit}</span>}
                        <span className="text-xs text-slate-400">{format(new Date(msg.created_date), 'MMM d, h:mm a')}</span>
                      </div>
                      {msg.ai_summary && <p className="text-sm text-slate-600 line-clamp-2">{msg.ai_summary}</p>}
                      {msg.tags && msg.tags.length > 0 && (
                        <div className="flex items-center gap-1 mt-2 flex-wrap">
                          {msg.tags.map((tag, idx) => <Badge key={idx} variant="outline" className="text-xs"><Tag className="h-2 w-2 mr-1" />{tag}</Badge>)}
                        </div>
                      )}
                    </div>
                    {msg.category && <Badge variant="outline" className="capitalize">{msg.category.replace(/_/g, ' ')}</Badge>}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="templates" className="mt-6">
          <div className="flex items-center justify-between mb-6">
            <p className="text-sm text-slate-600">Manage communication and response templates</p>
            <Button onClick={() => setEditingTemplate({ type: templateType })} className="bg-blue-600 hover:bg-blue-700">
              <Plus className="h-4 w-4 mr-2" />Create Template
            </Button>
          </div>

          <Tabs value={templateType} onValueChange={setTemplateType} className="w-full">
            <TabsList>
              <TabsTrigger value="announcement">Announcement Templates</TabsTrigger>
              <TabsTrigger value="response">Response Templates</TabsTrigger>
            </TabsList>

            <TabsContent value="announcement" className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                {communicationTemplates.map((template) => (
                  <Card key={template.id}>
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-base">{template.name}</CardTitle>
                          <div className="flex items-center gap-2 mt-2">
                            <Badge variant="outline" className="capitalize">{template.type}</Badge>
                            <Badge variant="outline" className="capitalize">{template.category}</Badge>
                            {template.building_id && <Badge>Building Specific</Badge>}
                          </div>
                        </div>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" onClick={() => setEditingTemplate(template)}><Edit className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="icon" onClick={() => deleteCommunicationTemplateMutation.mutate(template.id)}><Trash2 className="h-4 w-4" /></Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm font-medium mb-1">Title:</p>
                      <p className="text-sm text-slate-600 mb-3">{template.title_template}</p>
                      <p className="text-sm font-medium mb-1">Content Preview:</p>
                      <p className="text-sm text-slate-600 line-clamp-3">{template.content_template}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="response" className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                {messageTemplates.map((template) => (
                  <Card key={template.id}>
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-base">{template.name}</CardTitle>
                          <div className="flex items-center gap-2 mt-2">
                            <Badge variant="outline" className="capitalize">{template.category.replace(/_/g, ' ')}</Badge>
                            {template.building_id && <Badge>Building Specific</Badge>}
                          </div>
                        </div>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" onClick={() => setEditingTemplate(template)}><Edit className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="icon" onClick={() => deleteMessageTemplateMutation.mutate(template.id)}><Trash2 className="h-4 w-4" /></Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-slate-600 line-clamp-4">{template.content}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>
          </Tabs>
        </TabsContent>
      </Tabs>

      {/* Message Detail Dialog */}
      <Dialog open={!!selectedMessage} onOpenChange={() => setSelectedMessage(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>{selectedMessage?.subject}</span>
              <div className="flex items-center gap-2">
                {selectedMessage?.priority && getPriorityBadge(selectedMessage.priority)}
                {selectedMessage?.status && getStatusBadge(selectedMessage.status)}
              </div>
            </DialogTitle>
          </DialogHeader>
          {selectedMessage && (
            <div className="space-y-6">
              <Card><CardContent className="pt-6"><div className="flex items-center justify-between"><div><p className="font-medium">{selectedMessage.sender_name}</p><p className="text-sm text-slate-500">{selectedMessage.sender_email}</p>{selectedMessage.sender_unit && <p className="text-sm text-slate-500">Unit {selectedMessage.sender_unit}</p>}</div><div className="text-right text-sm text-slate-500">{format(new Date(selectedMessage.created_date), 'PPp')}</div></div></CardContent></Card>
              {!selectedMessage.ai_summary && <Button onClick={() => processMessageMutation.mutate(selectedMessage.id)} disabled={processMessageMutation.isPending} className="w-full"><Sparkles className="h-4 w-4 mr-2" />{processMessageMutation.isPending ? 'Processing...' : 'Analyze with AI'}</Button>}
              {selectedMessage.ai_summary && (
                <Card className="bg-blue-50 border-blue-200"><CardContent className="pt-6"><div className="flex items-start gap-2"><Sparkles className="h-4 w-4 text-blue-600 mt-0.5" /><div className="flex-1"><p className="text-sm font-medium text-blue-900 mb-1">AI Summary</p><p className="text-sm text-blue-800">{selectedMessage.ai_summary}</p>{selectedMessage.assigned_role && <p className="text-xs text-blue-700 mt-2">Suggested Assignment: <span className="font-medium capitalize">{selectedMessage.assigned_role.replace(/_/g, ' ')}</span></p>}</div></div></CardContent></Card>
              )}
              <Card><CardHeader><CardTitle className="text-base">Message</CardTitle></CardHeader><CardContent><p className="text-sm whitespace-pre-wrap">{selectedMessage.content}</p></CardContent></Card>
              <Card>
                <CardHeader><CardTitle className="text-base flex items-center justify-between"><span>Response</span>{selectedMessage.suggested_response && <Badge variant="outline" className="font-normal"><Sparkles className="h-3 w-3 mr-1" />AI Suggested</Badge>}</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <Textarea value={responseText} onChange={(e) => setResponseText(e.target.value)} placeholder="Type your response..." rows={6} disabled={selectedMessage.status === 'resolved'} />
                  {selectedMessage.status !== 'resolved' && (
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" onClick={() => updateMessageMutation.mutate({ id: selectedMessage.id, data: { status: 'in_progress' } })}>Mark In Progress</Button>
                      <Button onClick={handleSendMessageResponse} disabled={!responseText.trim() || sendResponseMutation.isPending}><Send className="h-4 w-4 mr-2" />{sendResponseMutation.isPending ? 'Sending...' : 'Send Response'}</Button>
                    </div>
                  )}
                  {selectedMessage.response && selectedMessage.response_date && <div className="text-sm text-slate-500">Response sent on {format(new Date(selectedMessage.response_date), 'PPp')}</div>}
                </CardContent>
              </Card>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Template Editor Dialog */}
      <Dialog open={!!editingTemplate} onOpenChange={() => setEditingTemplate(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editingTemplate?.id ? 'Edit' : 'Create'} {templateType === 'announcement' ? 'Announcement' : 'Response'} Template</DialogTitle></DialogHeader>
          {editingTemplate && (
            <div className="space-y-4">
              <div className="space-y-2"><Label>Template Name</Label><Input value={editingTemplate.name || ''} onChange={(e) => setEditingTemplate({ ...editingTemplate, name: e.target.value })} placeholder="e.g., Lift Maintenance Notice" /></div>
              {templateType === 'announcement' && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2"><Label>Type</Label><Select value={editingTemplate.type || 'announcement'} onValueChange={(value) => setEditingTemplate({ ...editingTemplate, type: value })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="announcement">Announcement</SelectItem><SelectItem value="notice">Notice</SelectItem><SelectItem value="reminder">Reminder</SelectItem><SelectItem value="invitation">Invitation</SelectItem><SelectItem value="alert">Alert</SelectItem></SelectContent></Select></div>
                    <div className="space-y-2"><Label>Category</Label><Select value={editingTemplate.category || 'general'} onValueChange={(value) => setEditingTemplate({ ...editingTemplate, category: value })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="general">General</SelectItem><SelectItem value="maintenance">Maintenance</SelectItem><SelectItem value="emergency">Emergency</SelectItem><SelectItem value="event">Event</SelectItem><SelectItem value="policy">Policy</SelectItem><SelectItem value="bylaw_reminder">Bylaw Reminder</SelectItem></SelectContent></Select></div>
                  </div>
                  <div className="space-y-2"><Label>Title Template</Label><Input value={editingTemplate.title_template || ''} onChange={(e) => setEditingTemplate({ ...editingTemplate, title_template: e.target.value })} placeholder="e.g., Lift Maintenance at {building_name}" /></div>
                </>
              )}
              {templateType === 'response' && (
                <div className="space-y-2"><Label>Category</Label><Select value={editingTemplate.category || 'general_inquiry'} onValueChange={(value) => setEditingTemplate({ ...editingTemplate, category: value })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="maintenance">Maintenance</SelectItem><SelectItem value="noise_complaint">Noise Complaint</SelectItem><SelectItem value="parking">Parking</SelectItem><SelectItem value="pets">Pets</SelectItem><SelectItem value="amenity_booking">Amenity Booking</SelectItem><SelectItem value="bylaw_question">Bylaw Question</SelectItem><SelectItem value="general_inquiry">General Inquiry</SelectItem></SelectContent></Select></div>
              )}
              <div className="space-y-2"><Label>Content Template</Label><Textarea value={editingTemplate.content_template || editingTemplate.content || ''} onChange={(e) => setEditingTemplate({ ...editingTemplate, [templateType === 'announcement' ? 'content_template' : 'content']: e.target.value })} rows={8} placeholder="Template content with placeholders..." /><p className="text-xs text-slate-500">Available placeholders: {'{building_name}, {date}, {time}, {resident_name}, {unit_number}'}</p></div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setEditingTemplate(null)}>Cancel</Button>
                <Button onClick={templateType === 'announcement' ? handleSaveCommunicationTemplate : handleSaveMessageTemplate}>Save Template</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Announcement Dialog */}
      <Dialog open={showAnnouncementDialog} onOpenChange={setShowAnnouncementDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editingAnnouncement ? 'Edit Announcement' : 'New Announcement'}</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmitAnnouncement} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2"><Label htmlFor="title">Title *</Label><Input id="title" value={announcementFormData.title} onChange={(e) => setAnnouncementFormData({ ...announcementFormData, title: e.target.value })} placeholder="Announcement title" required /></div>
              <div><Label>Building</Label><Select value={announcementFormData.building_id || ''} onValueChange={(v) => setAnnouncementFormData({ ...announcementFormData, building_id: v })}><SelectTrigger><SelectValue placeholder="All Buildings" /></SelectTrigger><SelectContent><SelectItem value={null}>All Buildings</SelectItem>{buildings.map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}</SelectContent></Select></div>
              <div><Label>Type</Label><Select value={announcementFormData.type} onValueChange={(v) => setAnnouncementFormData({ ...announcementFormData, type: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{announcementTypes.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent></Select></div>
              <div><Label>Priority</Label><Select value={announcementFormData.priority} onValueChange={(v) => setAnnouncementFormData({ ...announcementFormData, priority: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="normal">Normal</SelectItem><SelectItem value="important">Important</SelectItem><SelectItem value="urgent">Urgent</SelectItem></SelectContent></Select></div>
              <div><Label>Target Audience</Label><Select value={announcementFormData.target_audience} onValueChange={(v) => setAnnouncementFormData({ ...announcementFormData, target_audience: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All</SelectItem><SelectItem value="owners">Owners Only</SelectItem><SelectItem value="tenants">Tenants Only</SelectItem><SelectItem value="staff">Staff Only</SelectItem></SelectContent></Select></div>
              <div><Label>Publish Date & Time</Label><Input type="datetime-local" value={announcementFormData.publish_date} onChange={(e) => setAnnouncementFormData({ ...announcementFormData, publish_date: e.target.value })} /><p className="text-xs text-slate-500 mt-1">Leave empty to publish immediately</p></div>
              <div><Label>Expiry Date</Label><Input type="date" value={announcementFormData.expiry_date} onChange={(e) => setAnnouncementFormData({ ...announcementFormData, expiry_date: e.target.value })} /></div>
              <div><Label>Status</Label><Select value={announcementFormData.status} onValueChange={(v) => setAnnouncementFormData({ ...announcementFormData, status: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="draft">Draft</SelectItem><SelectItem value="scheduled">Scheduled</SelectItem><SelectItem value="published">Published</SelectItem><SelectItem value="archived">Archived</SelectItem></SelectContent></Select></div>
              <div className="md:col-span-2"><Label>Content *</Label><ReactQuill key={editingAnnouncement?.id || 'new'} theme="snow" value={announcementFormData.content} onChange={(v) => setAnnouncementFormData({ ...announcementFormData, content: v })} className="bg-white rounded-lg" style={{ minHeight: '200px' }} /></div>
              
              {/* Event/RSVP Section */}
              <div className="md:col-span-2 pt-4 border-t">
                <div className="flex items-center space-x-2 mb-4">
                  <Checkbox 
                    id="is_event" 
                    checked={announcementFormData.is_event}
                    onCheckedChange={(checked) => setAnnouncementFormData({ ...announcementFormData, is_event: checked })}
                  />
                  <label htmlFor="is_event" className="text-sm font-medium cursor-pointer">
                    This is an event (enable RSVP)
                  </label>
                </div>
                
                {announcementFormData.is_event && (
                  <div className="grid grid-cols-2 gap-4 pl-6">
                    <div>
                      <Label>Event Date & Time</Label>
                      <Input 
                        type="datetime-local" 
                        value={announcementFormData.event_date}
                        onChange={(e) => setAnnouncementFormData({ ...announcementFormData, event_date: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label>Event Location</Label>
                      <Input 
                        value={announcementFormData.event_location}
                        onChange={(e) => setAnnouncementFormData({ ...announcementFormData, event_location: e.target.value })}
                        placeholder="e.g., Rooftop Terrace"
                      />
                    </div>
                    <div className="col-span-2">
                      <div className="flex items-center space-x-2 mb-3">
                        <Checkbox 
                          id="rsvp_enabled" 
                          checked={announcementFormData.rsvp_enabled}
                          onCheckedChange={(checked) => setAnnouncementFormData({ ...announcementFormData, rsvp_enabled: checked })}
                        />
                        <label htmlFor="rsvp_enabled" className="text-sm font-medium cursor-pointer">
                          Enable RSVP responses
                        </label>
                      </div>
                      
                      {announcementFormData.rsvp_enabled && (
                        <div className="grid grid-cols-2 gap-4 pl-6">
                          <div>
                            <Label>RSVP Deadline</Label>
                            <Input 
                              type="date" 
                              value={announcementFormData.rsvp_deadline}
                              onChange={(e) => setAnnouncementFormData({ ...announcementFormData, rsvp_deadline: e.target.value })}
                            />
                          </div>
                          <div>
                            <Label>Max Attendees (optional)</Label>
                            <Input 
                              type="number" 
                              min="1"
                              value={announcementFormData.max_attendees || ''}
                              onChange={(e) => setAnnouncementFormData({ ...announcementFormData, max_attendees: e.target.value ? parseInt(e.target.value) : null })}
                              placeholder="Unlimited"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleCloseAnnouncementDialog}>Cancel</Button>
              <Button type="submit" className="bg-blue-600 hover:bg-blue-700" disabled={createAnnouncementMutation.isPending || updateAnnouncementMutation.isPending}>{createAnnouncementMutation.isPending || updateAnnouncementMutation.isPending ? 'Saving...' : (editingAnnouncement ? 'Update' : 'Create')}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteAnnouncement} onOpenChange={() => setDeleteAnnouncement(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Delete Announcement</AlertDialogTitle><AlertDialogDescription>Are you sure you want to delete "{deleteAnnouncement?.title}"?</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => deleteAnnouncementMutation.mutate(deleteAnnouncement.id)} className="bg-red-600 hover:bg-red-700">Delete</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Compose Email Dialog */}
      <Dialog open={showEmailDialog} onOpenChange={setShowEmailDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Compose Email</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2"><Label>Subject</Label><Input value={emailForm.subject} onChange={(e) => setEmailForm({ ...emailForm, subject: e.target.value })} placeholder="Email subject..." /></div>
            <div className="space-y-2"><Label>Message</Label><Textarea value={emailForm.body} onChange={(e) => setEmailForm({ ...emailForm, body: e.target.value })} placeholder="Email message..." rows={8} /></div>
            <div className="space-y-3">
              <Label>Recipients</Label>
              <div className="space-y-2 border rounded-lg p-4 bg-slate-50">
                {[
                  ['all_residents', 'All Residents (Owners & Tenants)'],
                  ['owners', 'Owners Only'],
                  ['tenants', 'Tenants Only'],
                  ['managers', 'Building & Property Managers'],
                  ['strata_managers', 'Strata Managers'],
                  ['committee', 'Committee Members']
                ].map(([key, label]) => (
                  <div key={key} className="flex items-center space-x-2">
                    <Checkbox id={key} checked={emailForm.recipients[key]} onCheckedChange={(checked) => setEmailForm({ ...emailForm, recipients: { ...emailForm.recipients, [key]: checked } })} />
                    <label htmlFor={key} className="text-sm font-medium cursor-pointer">{label}</label>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEmailDialog(false)} disabled={isSendingEmail}>Cancel</Button>
            <Button onClick={handleSendEmail} disabled={isSendingEmail || !emailForm.subject || !emailForm.body}>{isSendingEmail ? 'Sending...' : <><Send className="h-4 w-4 mr-2" />Send Email</>}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}