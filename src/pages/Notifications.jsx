import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import NotificationPreferencesManager from '@/components/notifications/NotificationPreferencesManager';
import { 
  Bell, 
  Check, 
  Trash2, 
  ExternalLink,
  Settings,
  CheckCheck,
  Archive
} from 'lucide-react';
import { format } from 'date-fns';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';

export default function Notifications() {
  const [user, setUser] = useState(null);
  const queryClient = useQueryClient();

  React.useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const { data: notifications = [] } = useQuery({
    queryKey: ['notifications', user?.email],
    queryFn: () => base44.entities.Notification.filter({ recipient_email: user?.email }),
    enabled: !!user?.email,
  });

  const markAsReadMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Notification.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const deleteNotificationMutation = useMutation({
    mutationFn: (id) => base44.entities.Notification.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      toast.success('Notification deleted');
    },
  });

  const unreadNotifications = notifications.filter(n => !n.read);
  const readNotifications = notifications.filter(n => n.read);

  const handleMarkAsRead = (notification) => {
    markAsReadMutation.mutate({
      id: notification.id,
      data: { ...notification, read: true, read_date: new Date().toISOString() }
    });
  };

  const handleMarkAllAsRead = () => {
    unreadNotifications.forEach(notification => {
      markAsReadMutation.mutate({
        id: notification.id,
        data: { ...notification, read: true, read_date: new Date().toISOString() }
      });
    });
    toast.success('All notifications marked as read');
  };

  const handleDelete = (id) => {
    deleteNotificationMutation.mutate(id);
  };

  const getTypeColor = (type) => {
    const colors = {
      work_order: 'bg-blue-100 text-blue-800 border-blue-200',
      message: 'bg-purple-100 text-purple-800 border-purple-200',
      compliance: 'bg-orange-100 text-orange-800 border-orange-200',
      announcement: 'bg-green-100 text-green-800 border-green-200',
      system: 'bg-gray-100 text-gray-800 border-gray-200'
    };
    return colors[type] || colors.system;
  };

  const getPriorityBadge = (priority) => {
    if (priority === 'urgent') {
      return <Badge className="bg-red-600 text-white">Urgent</Badge>;
    }
    if (priority === 'high') {
      return <Badge className="bg-orange-600 text-white">High Priority</Badge>;
    }
    return null;
  };

  const NotificationCard = ({ notification, showRead = false }) => (
    <Card className={`hover:shadow-md transition-shadow ${!notification.read ? 'border-l-4 border-l-blue-600' : ''}`}>
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h3 className="font-semibold text-lg">{notification.title}</h3>
              {!notification.read && (
                <div className="w-2 h-2 rounded-full bg-blue-600" />
              )}
              {getPriorityBadge(notification.priority)}
            </div>
            <Badge variant="outline" className={getTypeColor(notification.type)}>
              {notification.type.replace('_', ' ')}
            </Badge>
          </div>
          
          <div className="flex items-center gap-2">
            {!notification.read && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleMarkAsRead(notification)}
                className="text-blue-600 hover:text-blue-700"
              >
                <Check className="h-4 w-4" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleDelete(notification.id)}
              className="text-red-600 hover:text-red-700"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
        
        <p className="text-gray-700 mb-4">{notification.message}</p>
        
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-500">
            {format(new Date(notification.created_date), 'MMM d, yyyy h:mm a')}
          </span>
          
          {notification.link_url && (
            <Link to={notification.link_url}>
              <Button variant="outline" size="sm" className="text-blue-600">
                {notification.link_text || 'View Details'}
                <ExternalLink className="h-3 w-3 ml-2" />
              </Button>
            </Link>
          )}
        </div>
      </CardContent>
    </Card>
  );

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Card className="w-96 text-center p-8">
          <Bell className="h-12 w-12 mx-auto text-slate-400 mb-4" />
          <h3 className="text-lg font-semibold mb-2">Please Log In</h3>
          <p className="text-slate-600">Access your notifications and manage preferences.</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Notifications</h1>
          <p className="text-gray-600 mt-1">Manage your notifications and preferences</p>
        </div>
        
        {unreadNotifications.length > 0 && (
          <Button onClick={handleMarkAllAsRead} className="bg-blue-600 hover:bg-blue-700">
            <CheckCheck className="h-4 w-4 mr-2" />
            Mark All as Read
          </Button>
        )}
      </div>

      <Tabs defaultValue="unread" className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-3">
          <TabsTrigger value="unread" className="relative">
            Unread
            {unreadNotifications.length > 0 && (
              <Badge className="ml-2 bg-blue-600 text-white">
                {unreadNotifications.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="all">
            All ({notifications.length})
          </TabsTrigger>
          <TabsTrigger value="settings">
            <Settings className="h-4 w-4 mr-2" />
            Settings
          </TabsTrigger>
        </TabsList>

        <TabsContent value="unread" className="space-y-4 mt-6">
          {unreadNotifications.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <CheckCheck className="h-16 w-16 mx-auto text-green-600 mb-4" />
                <h3 className="text-xl font-semibold mb-2">All Caught Up!</h3>
                <p className="text-gray-600">You have no unread notifications</p>
              </CardContent>
            </Card>
          ) : (
            unreadNotifications
              .sort((a, b) => new Date(b.created_date) - new Date(a.created_date))
              .map((notification) => (
                <NotificationCard key={notification.id} notification={notification} />
              ))
          )}
        </TabsContent>

        <TabsContent value="all" className="space-y-4 mt-6">
          {notifications.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <Bell className="h-16 w-16 mx-auto text-gray-300 mb-4" />
                <h3 className="text-xl font-semibold mb-2">No Notifications</h3>
                <p className="text-gray-600">You haven't received any notifications yet</p>
              </CardContent>
            </Card>
          ) : (
            notifications
              .sort((a, b) => new Date(b.created_date) - new Date(a.created_date))
              .map((notification) => (
                <NotificationCard key={notification.id} notification={notification} showRead />
              ))
          )}
        </TabsContent>

        <TabsContent value="settings" className="mt-6">
          <NotificationPreferencesManager userEmail={user?.email} />
        </TabsContent>
      </Tabs>
    </div>
  );
}