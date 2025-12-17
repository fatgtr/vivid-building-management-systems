import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import PageHeader from '@/components/common/PageHeader';
import EmptyState from '@/components/common/EmptyState';
import StatusBadge from '@/components/common/StatusBadge';
import { Bell, Search, Building2, MoreVertical, Pencil, Trash2, Send, Calendar, Users, AlertTriangle, Info, Megaphone, Mail, Inbox, CheckCircle2, Clock, User, Tag, Sparkles, FileText, Edit, Plus, Copy } from 'lucide-react';
import ReactQuill from 'react-quill';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { format } from 'date-fns';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useBuildingContext } from '@/components/BuildingContext';
import { usePermissions } from '@/components/permissions/PermissionsContext';

const announcementTypes = [
  { value: 'general', label: 'General', icon: Info, color: 'bg-slate-100 text-slate-700' },
  { value: 'maintenance', label: 'Maintenance', icon: Bell, color: 'bg-yellow-100 text-yellow-700' },
  { value: 'emergency', label: 'Emergency', icon: AlertTriangle, color: 'bg-red-100 text-red-700' },
  { value: 'event', label: 'Event', icon: Calendar, color: 'bg-purple-100 text-purple-700' },
  { value: 'policy', label: 'Policy', icon: Megaphone, color: 'bg-blue-100 text-blue-700' },
];

const initialFormState = {
  building_id: '',
  title: '',
  content: '',
  type: 'general',
  priority: 'normal',
  publish_date: '',
  expiry_date: '',
  target_audience: 'all',
  status: 'draft',
};

export default function Announcements() {
  const [activeTab, setActiveTab] = useState('announcements');
  const [showDialog, setShowDialog] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState(null);
  const [formData, setFormData] = useState(initialFormState);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterBuilding, setFilterBuilding] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [deleteAnnouncement, setDeleteAnnouncement] = useState(null);

  // Messages state
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [filterCategory, setFilterCategory] = useState('all');
  const [responseText, setResponseText] = useState('');

  // Templates state
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [templateType, setTemplateType] = useState('announcement');

  const queryClient = useQueryClient();
  const { selectedBuildingId } = useBuildingContext();
  const { can } = usePermissions();

  const { data: announcements = [], isLoading } = useQuery({
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

  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => base44.entities.User.list(),
  });

  const { data: messages = [] } = useQuery({
    queryKey: ['messages', selectedBuildingId],
    queryFn: () => {
      if (selectedBuildingId) {
        return base44.entities.Message.filter({ building_id: selectedBuildingId });
      }
      return base44.entities.Message.list('-created_date');
    },
  });

  const { data: communicationTemplates = [] } = useQuery({
    queryKey: ['communicationTemplates'],
    queryFn: () => base44.entities.CommunicationTemplate.list(),
  });

  const { data: messageTemplates = [] } = useQuery({
    queryKey: ['messageTemplates'],
    queryFn: () => base44.entities.MessageTemplate.list(),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Announcement.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['announcements'] });
      handleCloseDialog();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Announcement.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['announcements'] });
      handleCloseDialog();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Announcement.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['announcements'] });
      setDeleteAnnouncement(null);
    },
  });

  // Message mutations
  const processMessageMutation = useMutation({
    mutationFn: (messageId) => base44.functions.invoke('processResidentMessage', { message_id: messageId }),
    onSuccess: (data, messageId) => {
      queryClient.invalidateQueries({ queryKey: ['messages'] });
      const message = messages.find(m => m.id === messageId);
      if (message) {
        setSelectedMessage({ ...message, ...data.analysis, suggested_response: data.suggested_response });
        setResponseText(data.suggested_response || '');
      }
      toast.success('Message analyzed successfully');
    },
  });

  const updateMessageMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Message.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages'] });
      toast.success('Message updated');
    },
  });

  const sendResponseMutation = useMutation({
    mutationFn: async ({ messageId, response }) => {
      const message = messages.find(m => m.id === messageId);
      await base44.integrations.Core.SendEmail({
        to: message.sender_email,
        subject: `Re: ${message.subject}`,
        body: response
      });
      return base44.entities.Message.update(messageId, {
        response,
        response_date: new Date().toISOString(),
        status: 'resolved'
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages'] });
      toast.success('Response sent successfully');
      setSelectedMessage(null);
      setResponseText('');
    },
  });

  // Template mutations
  const createCommunicationTemplateMutation = useMutation({
    mutationFn: (data) => base44.entities.CommunicationTemplate.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['communicationTemplates'] });
      toast.success('Template created');
      setEditingTemplate(null);
    },
  });

  const updateCommunicationTemplateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.CommunicationTemplate.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['communicationTemplates'] });
      toast.success('Template updated');
      setEditingTemplate(null);
    },
  });

  const deleteCommunicationTemplateMutation = useMutation({
    mutationFn: (id) => base44.entities.CommunicationTemplate.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['communicationTemplates'] });
      toast.success('Template deleted');
    },
  });

  const createMessageTemplateMutation = useMutation({
    mutationFn: (data) => base44.entities.MessageTemplate.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messageTemplates'] });
      toast.success('Response template created');
      setEditingTemplate(null);
    },
  });

  const handleCloseDialog = () => {
    setShowDialog(false);
    setEditingAnnouncement(null);
    setFormData(initialFormState);
  };

  const handleEdit = (announcement) => {
    setEditingAnnouncement(announcement);
    setFormData({
      building_id: announcement.building_id || '',
      title: announcement.title || '',
      content: announcement.content || '',
      type: announcement.type || 'general',
      priority: announcement.priority || 'normal',
      publish_date: announcement.publish_date || '',
      expiry_date: announcement.expiry_date || '',
      target_audience: announcement.target_audience || 'all',
      status: announcement.status || 'draft',
    });
    setShowDialog(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const submitData = { ...formData };
    
    // Determine status based on publish_date
    if (submitData.publish_date) {
      const publishDateTime = new Date(submitData.publish_date);
      const now = new Date();
      
      if (publishDateTime > now && submitData.status === 'draft') {
        submitData.status = 'scheduled';
      } else if (publishDateTime <= now && submitData.status === 'scheduled') {
        submitData.status = 'published';
      }
    }
    
    if (editingAnnouncement) {
      updateMutation.mutate({ id: editingAnnouncement.id, data: submitData });
    } else {
      createMutation.mutate(submitData);
    }
  };

  const handlePublish = (announcement) => {
    updateMutation.mutate({
      id: announcement.id,
      data: { ...announcement, status: 'published', publish_date: new Date().toISOString() },
    });
  };

  // Message handlers
  const handleMessageClick = (message) => {
    setSelectedMessage(message);
    setResponseText(message.suggested_response || message.response || '');
    
    if (message.status === 'unread') {
      updateMessageMutation.mutate({
        id: message.id,
        data: { status: 'read' }
      });
    }
  };

  const handleProcessMessage = () => {
    if (selectedMessage) {
      processMessageMutation.mutate(selectedMessage.id);
    }
  };

  const handleSendResponse = () => {
    if (selectedMessage && responseText.trim()) {
      sendResponseMutation.mutate({
        messageId: selectedMessage.id,
        response: responseText
      });
    }
  };

  // Template handlers
  const handleSaveCommunicationTemplate = () => {
    const data = {
      ...editingTemplate,
      building_id: editingTemplate.building_id || null,
      placeholders: ['building_name', 'date', 'time', 'location', 'contact_name', 'contact_email']
    };

    if (editingTemplate.id) {
      updateCommunicationTemplateMutation.mutate({ id: editingTemplate.id, data });
    } else {
      createCommunicationTemplateMutation.mutate(data);
    }
  };

  const handleSaveMessageTemplate = () => {
    const data = {
      ...editingTemplate,
      building_id: editingTemplate.building_id || null,
      placeholders: ['resident_name', 'building_name', 'unit_number', 'subject']
    };
    createMessageTemplateMutation.mutate(data);
  };

  const getBuildingName = (buildingId) => buildings.find(b => b.id === buildingId)?.name || 'All Buildings';
  const getTypeConfig = (type) => announcementTypes.find(t => t.value === type) || announcementTypes[0];

  const filteredAnnouncements = announcements.filter(a => {
    const matchesSearch = a.title?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesBuilding = filterBuilding === 'all' || a.building_id === filterBuilding;
    const matchesStatus = filterStatus === 'all' || a.status === filterStatus;
    return matchesSearch && matchesBuilding && matchesStatus;
  });

  const filteredMessages = messages.filter(msg => {
    const statusMatch = filterStatus === 'all' || msg.status === filterStatus;
    const categoryMatch = filterCategory === 'all' || msg.category === filterCategory;
    const searchMatch = !searchQuery || 
      msg.subject?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      msg.content?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      msg.sender_name?.toLowerCase().includes(searchQuery.toLowerCase());
    
    return statusMatch && categoryMatch && searchMatch;
  });

  const getStatusBadge = (status) => {
    const styles = {
      unread: 'bg-blue-100 text-blue-700',
      read: 'bg-slate-100 text-slate-700',
      in_progress: 'bg-yellow-100 text-yellow-700',
      resolved: 'bg-green-100 text-green-700',
      archived: 'bg-slate-100 text-slate-500'
    };
    return <Badge className={styles[status]}>{status}</Badge>;
  };

  const getPriorityBadge = (priority) => {
    const styles = {
      low: 'bg-slate-100 text-slate-600',
      medium: 'bg-blue-100 text-blue-700',
      high: 'bg-orange-100 text-orange-700',
      urgent: 'bg-red-100 text-red-700'
    };
    return <Badge className={styles[priority]}>{priority}</Badge>;
  };

  const statsByStatus = {
    unread: messages.filter(m => m.status === 'unread').length,
    in_progress: messages.filter(m => m.status === 'in_progress').length,
    resolved: messages.filter(m => m.status === 'resolved').length,
  };

  if (isLoading) {
    return (
      <div className="space-y-8">
        <PageHeader title="Announcements" subtitle="Communicate with residents" />
        <Skeleton className="h-96 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Communications Center" 
        subtitle="Manage announcements, resident messages, and templates"
      />

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="announcements" className="flex items-center gap-2">
            <Bell className="h-4 w-4" />
            Announcements
            <Badge variant="secondary">{announcements.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="messages" className="flex items-center gap-2">
            <Mail className="h-4 w-4" />
            Messages
            {statsByStatus.unread > 0 && (
              <Badge className="bg-blue-600">{statsByStatus.unread}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="templates" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Templates
          </TabsTrigger>
        </TabsList>

        {/* Announcements Tab */}
        <TabsContent value="announcements" className="space-y-6 mt-6">
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-600">
              {announcements.filter(a => a.status === 'published').length} published announcements
            </p>
            <Button onClick={() => setShowDialog(true)} className="bg-blue-600 hover:bg-blue-700">
              <Plus className="h-4 w-4 mr-2" />
              New Announcement
            </Button>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap gap-4">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search announcements..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={filterBuilding} onValueChange={setFilterBuilding}>
          <SelectTrigger className="w-[200px]">
            <Building2 className="h-4 w-4 mr-2 text-slate-400" />
            <SelectValue placeholder="All Buildings" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Buildings</SelectItem>
            {buildings.map(b => (
              <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="All Status" />
          </SelectTrigger>
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
            <EmptyState
              icon={Bell}
              title="No announcements"
              description="Create announcements to keep residents informed"
              action={() => setShowDialog(true)}
              actionLabel="New Announcement"
            />
          ) : (
            <div className="space-y-4">
          {filteredAnnouncements.map((announcement) => {
            const typeConfig = getTypeConfig(announcement.type);
            const TypeIcon = typeConfig.icon;
            
            return (
              <Card key={announcement.id} className="border-0 shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-4 flex-1">
                      <div className={`p-3 rounded-xl ${typeConfig.color}`}>
                        <TypeIcon className="h-5 w-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-lg text-slate-900">{announcement.title}</h3>
                          <StatusBadge status={announcement.status} />
                          {announcement.priority === 'urgent' && (
                            <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs font-medium rounded-full">Urgent</span>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-3 text-sm text-slate-500 mb-3">
                          <span className="flex items-center gap-1">
                            <Building2 className="h-3.5 w-3.5" />
                            {getBuildingName(announcement.building_id)}
                          </span>
                          <span className="flex items-center gap-1">
                            <Users className="h-3.5 w-3.5" />
                            {announcement.target_audience === 'all' ? 'All Residents' : announcement.target_audience}
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3.5 w-3.5" />
                            {announcement.created_date && format(new Date(announcement.created_date), 'MMM d, yyyy')}
                          </span>
                        </div>
                        <div 
                          className="text-slate-600 text-sm line-clamp-2 prose prose-sm max-w-none"
                          dangerouslySetInnerHTML={{ __html: announcement.content }}
                        />
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {announcement.status === 'draft' && (
                        <Button 
                          size="sm" 
                          className="bg-blue-600 hover:bg-blue-700"
                          onClick={() => handlePublish(announcement)}
                        >
                          <Send className="h-3.5 w-3.5 mr-1" /> Publish
                        </Button>
                      )}
                      {announcement.status === 'scheduled' && announcement.publish_date && (
                        <span className="text-xs text-slate-500">
                          Scheduled: {format(new Date(announcement.publish_date), 'MMM d, yyyy h:mm a')}
                        </span>
                      )}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEdit(announcement)}>
                            <Pencil className="mr-2 h-4 w-4" /> Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setDeleteAnnouncement(announcement)} className="text-red-600">
                            <Trash2 className="mr-2 h-4 w-4" /> Delete
                          </DropdownMenuItem>
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
        </TabsContent>

        {/* Messages Tab */}
        <TabsContent value="messages" className="space-y-6 mt-6">
          {/* Stats */}
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-500">Unread</p>
                    <p className="text-2xl font-bold">{statsByStatus.unread}</p>
                  </div>
                  <Inbox className="h-8 w-8 text-blue-600" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-500">In Progress</p>
                    <p className="text-2xl font-bold">{statsByStatus.in_progress}</p>
                  </div>
                  <Clock className="h-8 w-8 text-yellow-600" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-500">Resolved</p>
                    <p className="text-2xl font-bold">{statsByStatus.resolved}</p>
                  </div>
                  <CheckCircle2 className="h-8 w-8 text-green-600" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Filters */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col sm:flex-row gap-4">
                <Input
                  placeholder="Search messages..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="sm:max-w-xs"
                />
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="sm:w-40">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="unread">Unread</SelectItem>
                    <SelectItem value="read">Read</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="resolved">Resolved</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={filterCategory} onValueChange={setFilterCategory}>
                  <SelectTrigger className="sm:w-48">
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
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
              </div>
            </CardContent>
          </Card>

          {/* Messages List */}
          <div className="grid gap-4">
            {filteredMessages.map((msg) => (
              <Card
                key={msg.id}
                className={cn(
                  "cursor-pointer hover:shadow-md transition-shadow",
                  msg.status === 'unread' && "border-l-4 border-l-blue-600"
                )}
                onClick={() => handleMessageClick(msg)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold truncate">{msg.subject}</h3>
                        {msg.priority && getPriorityBadge(msg.priority)}
                        {getStatusBadge(msg.status)}
                      </div>
                      <div className="flex items-center gap-3 text-sm text-slate-600 mb-2">
                        <span className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          {msg.sender_name}
                        </span>
                        {msg.sender_unit && (
                          <span className="flex items-center gap-1">
                            <Building2 className="h-3 w-3" />
                            Unit {msg.sender_unit}
                          </span>
                        )}
                        <span className="text-xs text-slate-400">
                          {format(new Date(msg.created_date), 'MMM d, h:mm a')}
                        </span>
                      </div>
                      {msg.ai_summary && (
                        <p className="text-sm text-slate-600 line-clamp-2">{msg.ai_summary}</p>
                      )}
                      {msg.tags && msg.tags.length > 0 && (
                        <div className="flex items-center gap-1 mt-2 flex-wrap">
                          {msg.tags.map((tag, idx) => (
                            <Badge key={idx} variant="outline" className="text-xs">
                              <Tag className="h-2 w-2 mr-1" />
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                    {msg.category && (
                      <Badge variant="outline" className="capitalize">
                        {msg.category.replace(/_/g, ' ')}
                      </Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Templates Tab */}
        <TabsContent value="templates" className="space-y-6 mt-6">
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-600">
              Manage communication and response templates
            </p>
            <Button onClick={() => setEditingTemplate({ type: templateType })} className="bg-blue-600 hover:bg-blue-700">
              <Plus className="h-4 w-4 mr-2" />
              Create Template
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
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setEditingTemplate(template)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => deleteCommunicationTemplateMutation.mutate(template.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
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
                            <Badge variant="outline" className="capitalize">
                              {template.category.replace(/_/g, ' ')}
                            </Badge>
                            {template.building_id && <Badge>Building Specific</Badge>}
                          </div>
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
              {/* Sender Info */}
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{selectedMessage.sender_name}</p>
                      <p className="text-sm text-slate-500">{selectedMessage.sender_email}</p>
                      {selectedMessage.sender_unit && (
                        <p className="text-sm text-slate-500">Unit {selectedMessage.sender_unit}</p>
                      )}
                    </div>
                    <div className="text-right text-sm text-slate-500">
                      {format(new Date(selectedMessage.created_date), 'PPp')}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* AI Analysis */}
              {!selectedMessage.ai_summary && (
                <Button
                  onClick={handleProcessMessage}
                  disabled={processMessageMutation.isPending}
                  className="w-full"
                >
                  <Sparkles className="h-4 w-4 mr-2" />
                  {processMessageMutation.isPending ? 'Processing...' : 'Analyze with AI'}
                </Button>
              )}

              {selectedMessage.ai_summary && (
                <Card className="bg-blue-50 border-blue-200">
                  <CardContent className="pt-6">
                    <div className="flex items-start gap-2">
                      <Sparkles className="h-4 w-4 text-blue-600 mt-0.5" />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-blue-900 mb-1">AI Summary</p>
                        <p className="text-sm text-blue-800">{selectedMessage.ai_summary}</p>
                        {selectedMessage.assigned_role && (
                          <p className="text-xs text-blue-700 mt-2">
                            Suggested Assignment: <span className="font-medium capitalize">{selectedMessage.assigned_role.replace(/_/g, ' ')}</span>
                          </p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Message Content */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Message</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm whitespace-pre-wrap">{selectedMessage.content}</p>
                </CardContent>
              </Card>

              {/* Response Section */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center justify-between">
                    <span>Response</span>
                    {selectedMessage.suggested_response && (
                      <Badge variant="outline" className="font-normal">
                        <Sparkles className="h-3 w-3 mr-1" />
                        AI Suggested
                      </Badge>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Textarea
                    value={responseText}
                    onChange={(e) => setResponseText(e.target.value)}
                    placeholder="Type your response..."
                    rows={6}
                    disabled={selectedMessage.status === 'resolved'}
                  />
                  {selectedMessage.status !== 'resolved' && (
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="outline"
                        onClick={() => updateMessageMutation.mutate({
                          id: selectedMessage.id,
                          data: { status: 'in_progress' }
                        })}
                      >
                        Mark In Progress
                      </Button>
                      <Button
                        onClick={handleSendResponse}
                        disabled={!responseText.trim() || sendResponseMutation.isPending}
                      >
                        <Send className="h-4 w-4 mr-2" />
                        {sendResponseMutation.isPending ? 'Sending...' : 'Send Response'}
                      </Button>
                    </div>
                  )}
                  {selectedMessage.response && selectedMessage.response_date && (
                    <div className="text-sm text-slate-500">
                      Response sent on {format(new Date(selectedMessage.response_date), 'PPp')}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Template Editor Dialog */}
      <Dialog open={!!editingTemplate} onOpenChange={() => setEditingTemplate(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingTemplate?.id ? 'Edit' : 'Create'} {templateType === 'announcement' ? 'Announcement' : 'Response'} Template
            </DialogTitle>
          </DialogHeader>

          {editingTemplate && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Template Name</Label>
                <Input
                  value={editingTemplate.name || ''}
                  onChange={(e) => setEditingTemplate({ ...editingTemplate, name: e.target.value })}
                  placeholder="e.g., Lift Maintenance Notice"
                />
              </div>

              {templateType === 'announcement' && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Type</Label>
                      <Select
                        value={editingTemplate.type || 'announcement'}
                        onValueChange={(value) => setEditingTemplate({ ...editingTemplate, type: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="announcement">Announcement</SelectItem>
                          <SelectItem value="notice">Notice</SelectItem>
                          <SelectItem value="reminder">Reminder</SelectItem>
                          <SelectItem value="invitation">Invitation</SelectItem>
                          <SelectItem value="alert">Alert</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Category</Label>
                      <Select
                        value={editingTemplate.category || 'general'}
                        onValueChange={(value) => setEditingTemplate({ ...editingTemplate, category: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="general">General</SelectItem>
                          <SelectItem value="maintenance">Maintenance</SelectItem>
                          <SelectItem value="emergency">Emergency</SelectItem>
                          <SelectItem value="event">Event</SelectItem>
                          <SelectItem value="policy">Policy</SelectItem>
                          <SelectItem value="bylaw_reminder">Bylaw Reminder</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Title Template</Label>
                    <Input
                      value={editingTemplate.title_template || ''}
                      onChange={(e) => setEditingTemplate({ ...editingTemplate, title_template: e.target.value })}
                      placeholder="e.g., Lift Maintenance at {building_name}"
                    />
                  </div>
                </>
              )}

              {templateType === 'response' && (
                <div className="space-y-2">
                  <Label>Category</Label>
                  <Select
                    value={editingTemplate.category || 'general_inquiry'}
                    onValueChange={(value) => setEditingTemplate({ ...editingTemplate, category: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="maintenance">Maintenance</SelectItem>
                      <SelectItem value="noise_complaint">Noise Complaint</SelectItem>
                      <SelectItem value="parking">Parking</SelectItem>
                      <SelectItem value="pets">Pets</SelectItem>
                      <SelectItem value="amenity_booking">Amenity Booking</SelectItem>
                      <SelectItem value="bylaw_question">Bylaw Question</SelectItem>
                      <SelectItem value="general_inquiry">General Inquiry</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="space-y-2">
                <Label>Content Template</Label>
                <Textarea
                  value={editingTemplate.content_template || editingTemplate.content || ''}
                  onChange={(e) => setEditingTemplate({
                    ...editingTemplate,
                    [templateType === 'announcement' ? 'content_template' : 'content']: e.target.value
                  })}
                  rows={8}
                  placeholder="Template content with placeholders..."
                />
                <p className="text-xs text-slate-500">
                  Available placeholders: {'{building_name}, {date}, {time}, {resident_name}, {unit_number}'}
                </p>
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setEditingTemplate(null)}>
                  Cancel
                </Button>
                <Button
                  onClick={templateType === 'announcement' ? handleSaveCommunicationTemplate : handleSaveMessageTemplate}
                >
                  Save Template
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Add/Edit Announcement Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" aria-describedby="announcement-dialog-description">
          <DialogHeader>
            <DialogTitle>{editingAnnouncement ? 'Edit Announcement' : 'New Announcement'}</DialogTitle>
            <p id="announcement-dialog-description" className="sr-only">
              Fill in the announcement details below
            </p>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <Label htmlFor="title">Title *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Announcement title"
                  required
                />
              </div>
              <div>
                <Label htmlFor="building_id">Building</Label>
                <Select value={formData.building_id || ''} onValueChange={(v) => setFormData({ ...formData, building_id: v === '' ? '' : v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Buildings" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={null}>All Buildings</SelectItem>
                    {buildings.map(b => (
                      <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="type">Type</Label>
                <Select value={formData.type} onValueChange={(v) => setFormData({ ...formData, type: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {announcementTypes.map(t => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="priority">Priority</Label>
                <Select value={formData.priority} onValueChange={(v) => setFormData({ ...formData, priority: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="important">Important</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="target_audience">Target Audience</Label>
                <Select value={formData.target_audience} onValueChange={(v) => setFormData({ ...formData, target_audience: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="owners">Owners Only</SelectItem>
                    <SelectItem value="tenants">Tenants Only</SelectItem>
                    <SelectItem value="staff">Staff Only</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="publish_date">Publish Date & Time</Label>
                <Input
                  id="publish_date"
                  type="datetime-local"
                  value={formData.publish_date}
                  onChange={(e) => setFormData({ ...formData, publish_date: e.target.value })}
                />
                <p className="text-xs text-slate-500 mt-1">Leave empty to publish immediately</p>
              </div>
              <div>
                <Label htmlFor="expiry_date">Expiry Date</Label>
                <Input
                  id="expiry_date"
                  type="date"
                  value={formData.expiry_date}
                  onChange={(e) => setFormData({ ...formData, expiry_date: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="status">Status</Label>
                <Select value={formData.status} onValueChange={(v) => setFormData({ ...formData, status: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="scheduled">Scheduled</SelectItem>
                    <SelectItem value="published">Published</SelectItem>
                    <SelectItem value="archived">Archived</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="md:col-span-2">
                <Label htmlFor="content">Content *</Label>
                <ReactQuill
                  key={editingAnnouncement?.id || 'new'}
                  theme="snow"
                  value={formData.content}
                  onChange={(v) => setFormData({ ...formData, content: v })}
                  className="bg-white rounded-lg"
                  style={{ minHeight: '200px' }}
                />
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleCloseDialog}>Cancel</Button>
              <Button type="submit" className="bg-blue-600 hover:bg-blue-700" disabled={createMutation.isPending || updateMutation.isPending}>
                {createMutation.isPending || updateMutation.isPending ? 'Saving...' : (editingAnnouncement ? 'Update' : 'Create')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteAnnouncement} onOpenChange={() => setDeleteAnnouncement(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Announcement</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deleteAnnouncement?.title}"?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteMutation.mutate(deleteAnnouncement.id)} className="bg-red-600 hover:bg-red-700">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}