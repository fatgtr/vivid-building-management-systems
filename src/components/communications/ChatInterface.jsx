import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, Paperclip, MoreVertical, X, MessageSquare } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

export default function ChatInterface({ chat, userEmail, onClose }) {
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const queryClient = useQueryClient();

  const { data: messages = [] } = useQuery({
    queryKey: ['chatMessages', chat?.id],
    queryFn: () => base44.entities.ChatMessage.filter({ chat_id: chat.id }),
    enabled: !!chat?.id,
    refetchInterval: 3000,
  });

  const sendMessageMutation = useMutation({
    mutationFn: (data) => base44.entities.ChatMessage.create(data),
    onSuccess: async (newMessage) => {
      await base44.entities.Chat.update(chat.id, {
        ...chat,
        last_message: newMessage.message,
        last_message_date: new Date().toISOString()
      });
      queryClient.invalidateQueries({ queryKey: ['chatMessages'] });
      queryClient.invalidateQueries({ queryKey: ['chats'] });
      setMessage('');
    },
  });

  const markAsReadMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.ChatMessage.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chatMessages'] });
    },
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    
    // Mark unread messages as read
    messages.forEach(msg => {
      if (msg.sender_email !== userEmail && !msg.read_by?.includes(userEmail)) {
        markAsReadMutation.mutate({
          id: msg.id,
          data: {
            ...msg,
            read_by: [...(msg.read_by || []), userEmail]
          }
        });
      }
    });
  }, [messages, userEmail]);

  const handleSend = async () => {
    if (!message.trim() || isLoading) return;

    setIsLoading(true);
    try {
      await sendMessageMutation.mutateAsync({
        chat_id: chat.id,
        sender_email: userEmail,
        sender_name: chat.participants.find(p => p === userEmail) || userEmail,
        message: message.trim(),
        read_by: [userEmail]
      });
    } catch (error) {
      toast.error('Failed to send message');
    } finally {
      setIsLoading(false);
    }
  };

  if (!chat) {
    return (
      <Card className="h-[600px] flex items-center justify-center">
        <div className="text-center text-gray-500">
          <MessageSquare className="h-16 w-16 mx-auto mb-4 text-gray-300" />
          <p>Select a chat to start messaging</p>
        </div>
      </Card>
    );
  }

  const otherParticipants = chat.participants.filter(p => p !== userEmail);

  return (
    <Card className="h-[600px] flex flex-col">
      <CardHeader className="border-b">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg">
              {chat.chat_name || otherParticipants.join(', ')}
            </CardTitle>
            <p className="text-xs text-gray-500">
              {chat.chat_type === 'support' ? 'Property Manager Support' : `${otherParticipants.length} participant(s)`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline">{chat.chat_type}</Badge>
            {onClose && (
              <Button variant="ghost" size="icon" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col p-0 overflow-hidden">
        <ScrollArea className="flex-1 p-4">
          <div className="space-y-4">
            {messages.map((msg) => {
              const isOwn = msg.sender_email === userEmail;
              return (
                <div key={msg.id} className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[70%] ${isOwn ? 'order-2' : 'order-1'}`}>
                    <div className={`rounded-lg p-3 ${isOwn ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-900'}`}>
                      {!isOwn && (
                        <p className="text-xs font-semibold mb-1 opacity-75">{msg.sender_name}</p>
                      )}
                      <p className="text-sm">{msg.message}</p>
                    </div>
                    <p className="text-xs text-gray-400 mt-1 px-1">
                      {format(new Date(msg.created_date), 'h:mm a')}
                    </p>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>

        <div className="border-t p-4">
          <div className="flex items-center gap-2">
            <Input
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
              placeholder="Type a message..."
              className="flex-1"
            />
            <Button onClick={handleSend} disabled={!message.trim() || isLoading} className="bg-blue-600">
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}