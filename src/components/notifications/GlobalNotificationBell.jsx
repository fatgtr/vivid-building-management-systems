import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bell, Check, X, ExternalLink } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from 'date-fns';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export default function GlobalNotificationBell({ userEmail }) {
  const queryClient = useQueryClient();

  const { data: notifications = [] } = useQuery({
    queryKey: ['notifications', userEmail],
    queryFn: () => base44.entities.Notification.filter({ recipient_email: userEmail }),
    enabled: !!userEmail,
    refetchInterval: 30000,
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
    },
  });

  const unreadCount = notifications.filter(n => !n.read).length;
  const sortedNotifications = [...notifications]
    .sort((a, b) => new Date(b.created_date) - new Date(a.created_date))
    .slice(0, 10);

  const handleMarkAsRead = (notification) => {
    if (!notification.read) {
      markAsReadMutation.mutate({
        id: notification.id,
        data: { ...notification, read: true, read_date: new Date().toISOString() }
      });
    }
  };

  const handleMarkAllAsRead = () => {
    notifications.filter(n => !n.read).forEach(notification => {
      markAsReadMutation.mutate({
        id: notification.id,
        data: { ...notification, read: true, read_date: new Date().toISOString() }
      });
    });
  };

  const handleDelete = (e, id) => {
    e.stopPropagation();
    deleteNotificationMutation.mutate(id);
  };

  const getTypeColor = (type) => {
    const colors = {
      work_order: 'text-blue-600',
      message: 'text-purple-600',
      compliance: 'text-orange-600',
      announcement: 'text-green-600',
      system: 'text-gray-600'
    };
    return colors[type] || colors.system;
  };

  const getPriorityBadge = (priority) => {
    if (priority === 'urgent' || priority === 'high') {
      return <Badge className="bg-red-600 text-white text-xs">Urgent</Badge>;
    }
    return null;
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 bg-red-600 text-white">
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[400px] p-0" align="end">
        <div className="border-b p-4 flex items-center justify-between bg-gradient-to-r from-blue-50 to-cyan-50">
          <h3 className="font-semibold text-lg">Notifications</h3>
          {unreadCount > 0 && (
            <Button variant="ghost" size="sm" onClick={handleMarkAllAsRead} className="text-xs">
              <Check className="h-3 w-3 mr-1" />
              Mark all read
            </Button>
          )}
        </div>
        <div className="max-h-[500px] overflow-y-auto">
          {sortedNotifications.length === 0 ? (
            <div className="p-12 text-center text-slate-500">
              <Bell className="h-12 w-12 mx-auto mb-3 text-slate-300" />
              <p className="font-medium">No notifications</p>
              <p className="text-sm mt-1">You're all caught up!</p>
            </div>
          ) : (
            <div>
              {sortedNotifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`p-4 border-b hover:bg-slate-50 cursor-pointer transition-colors relative group ${
                    !notification.read ? 'bg-blue-50/50' : ''
                  }`}
                  onClick={() => handleMarkAsRead(notification)}
                >
                  <button
                    onClick={(e) => handleDelete(e, notification.id)}
                    className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="h-4 w-4 text-gray-400 hover:text-red-600" />
                  </button>
                  
                  <div className="flex items-start justify-between mb-2 pr-6">
                    <div className="flex items-center gap-2">
                      <h4 className="font-semibold text-sm">{notification.title}</h4>
                      {!notification.read && (
                        <div className="w-2 h-2 rounded-full bg-blue-600 flex-shrink-0" />
                      )}
                    </div>
                    {getPriorityBadge(notification.priority)}
                  </div>
                  
                  <p className="text-sm text-slate-600 mb-2 line-clamp-2">{notification.message}</p>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-medium capitalize ${getTypeColor(notification.type)}`}>
                        {notification.type.replace('_', ' ')}
                      </span>
                      <span className="text-xs text-slate-400">
                        {format(new Date(notification.created_date), 'MMM d, h:mm a')}
                      </span>
                    </div>
                    
                    {notification.link_url && (
                      <Link 
                        to={notification.link_url}
                        className="text-xs text-blue-600 hover:underline flex items-center gap-1"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {notification.link_text || 'View'}
                        <ExternalLink className="h-3 w-3" />
                      </Link>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        
        {sortedNotifications.length > 0 && (
          <div className="border-t p-3 bg-gray-50">
            <Link to={createPageUrl('Notifications')}>
              <Button variant="ghost" size="sm" className="w-full text-xs">
                View All Notifications
              </Button>
            </Link>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}