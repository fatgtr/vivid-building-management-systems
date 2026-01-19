import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useBuildingContext } from '@/components/BuildingContext';
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Bell, Pin, MessageCircle, Eye, Plus, Search } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import PageHeader from '@/components/common/PageHeader';
import ReactMarkdown from 'react-markdown';

export default function BulletinBoard() {
  const { selectedBuildingId, user } = useBuildingContext();
  const [showDialog, setShowDialog] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    building_id: selectedBuildingId || '',
    title: '',
    content: '',
    category: 'general',
    priority: 'normal',
    author_name: user?.full_name || '',
    author_email: user?.email || '',
    pinned: false,
    allow_comments: true
  });

  const { data: announcements = [] } = useQuery({
    queryKey: ['announcements', selectedBuildingId],
    queryFn: async () => {
      const all = await base44.entities.Announcement.list('-created_date');
      return selectedBuildingId ? all.filter(a => a.building_id === selectedBuildingId && a.status === 'published') : all;
    }
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Announcement.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['announcements'] });
      setShowDialog(false);
      toast.success('Announcement posted');
    }
  });

  const filteredAnnouncements = announcements.filter(a => {
    const matchesSearch = a.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         a.content?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = filterCategory === 'all' || a.category === filterCategory;
    return matchesSearch && matchesCategory;
  });

  const pinnedAnnouncements = filteredAnnouncements.filter(a => a.pinned);
  const regularAnnouncements = filteredAnnouncements.filter(a => !a.pinned);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Bulletin Board"
        subtitle="Community announcements and updates"
        action={() => setShowDialog(true)}
        actionLabel="Post Announcement"
      />

      <div className="flex gap-4 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search announcements..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={filterCategory} onValueChange={setFilterCategory}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All Categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            <SelectItem value="general">General</SelectItem>
            <SelectItem value="emergency">Emergency</SelectItem>
            <SelectItem value="maintenance">Maintenance</SelectItem>
            <SelectItem value="event">Event</SelectItem>
            <SelectItem value="policy">Policy</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-6">
        {pinnedAnnouncements.map((announcement) => (
          <Card key={announcement.id} className="border-2 border-blue-200 bg-blue-50/50">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Pin className="h-4 w-4 text-blue-600" />
                    <Badge className="bg-blue-600">Pinned</Badge>
                    <Badge variant="outline" className="capitalize">{announcement.category}</Badge>
                    {announcement.priority === 'urgent' && <Badge className="bg-red-600">Urgent</Badge>}
                  </div>
                  <h3 className="text-xl font-bold text-slate-900">{announcement.title}</h3>
                  <p className="text-sm text-slate-600 mt-1">
                    Posted by {announcement.author_name} • {format(new Date(announcement.created_date), 'MMM d, yyyy')}
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <ReactMarkdown className="prose prose-sm max-w-none">{announcement.content}</ReactMarkdown>
              {announcement.allow_comments && (
                <div className="mt-4 pt-4 border-t flex items-center gap-2 text-sm text-slate-600">
                  <MessageCircle className="h-4 w-4" />
                  <span>{announcement.comments?.length || 0} comments</span>
                  <Eye className="h-4 w-4 ml-4" />
                  <span>{announcement.read_by?.length || 0} views</span>
                </div>
              )}
            </CardContent>
          </Card>
        ))}

        {regularAnnouncements.map((announcement) => (
          <Card key={announcement.id}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="outline" className="capitalize">{announcement.category}</Badge>
                    {announcement.priority === 'urgent' && <Badge className="bg-red-600">Urgent</Badge>}
                    {announcement.priority === 'high' && <Badge className="bg-orange-600">High Priority</Badge>}
                  </div>
                  <h3 className="text-xl font-bold text-slate-900">{announcement.title}</h3>
                  <p className="text-sm text-slate-600 mt-1">
                    Posted by {announcement.author_name} • {format(new Date(announcement.created_date), 'MMM d, yyyy')}
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <ReactMarkdown className="prose prose-sm max-w-none">{announcement.content}</ReactMarkdown>
              {announcement.allow_comments && (
                <div className="mt-4 pt-4 border-t flex items-center gap-2 text-sm text-slate-600">
                  <MessageCircle className="h-4 w-4" />
                  <span>{announcement.comments?.length || 0} comments</span>
                  <Eye className="h-4 w-4 ml-4" />
                  <span>{announcement.read_by?.length || 0} views</span>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Post Announcement</DialogTitle>
          </DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); createMutation.mutate(formData); }} className="space-y-4">
            <div>
              <Label>Title *</Label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Category *</Label>
                <Select value={formData.category} onValueChange={(v) => setFormData({ ...formData, category: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="general">General</SelectItem>
                    <SelectItem value="emergency">Emergency</SelectItem>
                    <SelectItem value="maintenance">Maintenance</SelectItem>
                    <SelectItem value="event">Event</SelectItem>
                    <SelectItem value="policy">Policy</SelectItem>
                    <SelectItem value="reminder">Reminder</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Priority *</Label>
                <Select value={formData.priority} onValueChange={(v) => setFormData({ ...formData, priority: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Content * (Markdown supported)</Label>
              <Textarea
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                rows={8}
                required
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? 'Posting...' : 'Post Announcement'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}