import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import PageHeader from '@/components/common/PageHeader';
import { Mail, Inbox, CheckCircle2, Archive, Send, Sparkles, User, Building2, Tag, Clock, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useBuildingContext } from '@/components/BuildingContext';
import { usePermissions } from '@/components/permissions/PermissionsContext';

export default function Messages() {
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterCategory, setFilterCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [responseText, setResponseText] = useState('');
  const { selectedBuildingId } = useBuildingContext();
  const { can } = usePermissions();
  const queryClient = useQueryClient();

  const { data: messages = [], isLoading } = useQuery({
    queryKey: ['messages', selectedBuildingId],
    queryFn: () => {
      if (selectedBuildingId) {
        return base44.entities.Message.filter({ building_id: selectedBuildingId });
      }
      return base44.entities.Message.list('-created_date');
    },
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

  if (!can('announcements', 'view')) {
    return (
      <div className="flex items-center justify-center h-96">
        <p className="text-slate-500">You don't have permission to view messages</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <PageHeader
        title="Resident Messages"
        subtitle="Manage and respond to resident communications"
      />

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
    </div>
  );
}