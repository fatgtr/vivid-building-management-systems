import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { MessageSquare, Send, User, Search, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

export default function DirectMessaging({ buildingId }) {
  const [selectedChat, setSelectedChat] = useState(null);
  const [messageText, setMessageText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const messagesEndRef = useRef(null);
  const queryClient = useQueryClient();

  const { data: user } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => base44.auth.me(),
  });

  const { data: chats = [], isLoading: chatsLoading } = useQuery({
    queryKey: ['chats', buildingId, user?.email],
    queryFn: () => base44.entities.Chat.filter({ 
      building_id: buildingId 
    }),
    enabled: !!buildingId && !!user,
  });

  const { data: messages = [] } = useQuery({
    queryKey: ['chat-messages', selectedChat?.id],
    queryFn: () => base44.entities.ChatMessage.filter({ 
      chat_id: selectedChat.id 
    }, '-created_date'),
    enabled: !!selectedChat,
    refetchInterval: 3000,
  });

  const createChatMutation = useMutation({
    mutationFn: (data) => base44.entities.Chat.create(data),
    onSuccess: (newChat) => {
      queryClient.invalidateQueries({ queryKey: ['chats'] });
      setSelectedChat(newChat);
    },
  });

  const sendMessageMutation = useMutation({
    mutationFn: (data) => base44.entities.ChatMessage.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chat-messages'] });
      setMessageText('');
    },
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!messageText.trim() || !selectedChat) return;

    sendMessageMutation.mutate({
      chat_id: selectedChat.id,
      sender_email: user.email,
      sender_name: user.full_name,
      message: messageText.trim(),
      message_type: 'text'
    });
  };

  const userChats = chats.filter(chat => 
    chat.participants?.includes(user?.email) &&
    (searchQuery === '' || 
     chat.subject?.toLowerCase().includes(searchQuery.toLowerCase()) ||
     chat.participants?.some(p => p.toLowerCase().includes(searchQuery.toLowerCase())))
  );

  const getUnreadCount = (chat) => {
    return chat.unread_count || 0;
  };

  const isManagement = user?.role === 'admin';

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[700px]">
      {/* Chat List */}
      <Card className="lg:col-span-1 flex flex-col">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <MessageSquare className="h-4 w-4" />
            Conversations
          </CardTitle>
          <div className="relative mt-2">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 h-8 text-sm"
            />
          </div>
        </CardHeader>
        <CardContent className="flex-1 overflow-y-auto space-y-2 p-3">
          {chatsLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
            </div>
          ) : userChats.length === 0 ? (
            <div className="text-center py-8 text-slate-500 text-sm">
              <MessageSquare className="h-12 w-12 mx-auto mb-2 text-slate-300" />
              <p>No conversations yet</p>
            </div>
          ) : (
            userChats.map((chat) => (
              <button
                key={chat.id}
                onClick={() => setSelectedChat(chat)}
                className={`w-full text-left p-3 rounded-lg border transition-all ${
                  selectedChat?.id === chat.id
                    ? 'bg-blue-50 border-blue-200'
                    : 'hover:bg-slate-50 border-slate-200'
                }`}
              >
                <div className="flex items-start justify-between mb-1">
                  <span className="font-medium text-sm text-slate-900">
                    {chat.subject || 'General Inquiry'}
                  </span>
                  {getUnreadCount(chat) > 0 && (
                    <Badge className="bg-blue-600 text-white text-xs h-5">
                      {getUnreadCount(chat)}
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-slate-500 truncate">
                  {chat.last_message || 'No messages yet'}
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  {chat.updated_date && format(new Date(chat.updated_date), 'MMM d, h:mm a')}
                </p>
              </button>
            ))
          )}
        </CardContent>
      </Card>

      {/* Messages */}
      <Card className="lg:col-span-2 flex flex-col">
        {selectedChat ? (
          <>
            <CardHeader className="border-b pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-slate-900">{selectedChat.subject}</h3>
                  <p className="text-sm text-slate-500">
                    {selectedChat.participants?.join(', ')}
                  </p>
                </div>
                <Badge variant="outline">{selectedChat.status}</Badge>
              </div>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((message) => {
                const isOwn = message.sender_email === user?.email;
                return (
                  <div key={message.id} className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[70%] ${isOwn ? 'order-2' : 'order-1'}`}>
                      {!isOwn && (
                        <div className="flex items-center gap-2 mb-1">
                          <User className="h-3 w-3 text-slate-400" />
                          <span className="text-xs font-medium text-slate-600">
                            {message.sender_name}
                          </span>
                        </div>
                      )}
                      <div
                        className={`rounded-2xl px-4 py-2 ${
                          isOwn
                            ? 'bg-blue-600 text-white'
                            : 'bg-slate-100 text-slate-900'
                        }`}
                      >
                        <p className="text-sm whitespace-pre-wrap">{message.message}</p>
                      </div>
                      <p className="text-xs text-slate-400 mt-1 px-1">
                        {format(new Date(message.created_date), 'h:mm a')}
                      </p>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </CardContent>
            <div className="border-t p-4">
              <form onSubmit={handleSendMessage} className="flex gap-2">
                <Textarea
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  placeholder="Type your message..."
                  className="resize-none"
                  rows={2}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage(e);
                    }
                  }}
                />
                <Button 
                  type="submit" 
                  disabled={!messageText.trim() || sendMessageMutation.isPending}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-slate-500">
            <div className="text-center">
              <MessageSquare className="h-16 w-16 mx-auto mb-4 text-slate-300" />
              <p>Select a conversation to start messaging</p>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}