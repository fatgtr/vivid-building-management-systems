import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MessageSquare, Users } from 'lucide-react';
import { format } from 'date-fns';

export default function ChatList({ chats, userEmail, onSelectChat, selectedChatId }) {
  if (chats.length === 0) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <MessageSquare className="h-12 w-12 mx-auto mb-3 text-gray-300" />
          <p className="text-gray-500">No chats yet</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-2">
      {chats.map((chat) => {
        const otherParticipants = chat.participants.filter(p => p !== userEmail);
        const unreadCount = chat.unread_count?.[userEmail] || 0;
        const isSelected = chat.id === selectedChatId;

        return (
          <Card
            key={chat.id}
            className={`cursor-pointer hover:shadow-md transition-shadow ${isSelected ? 'border-2 border-blue-600' : ''}`}
            onClick={() => onSelectChat(chat)}
          >
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-semibold truncate">
                      {chat.chat_name || otherParticipants.join(', ')}
                    </p>
                    {unreadCount > 0 && (
                      <Badge className="bg-blue-600 text-white">{unreadCount}</Badge>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 truncate">{chat.last_message || 'No messages yet'}</p>
                  {chat.last_message_date && (
                    <p className="text-xs text-gray-400 mt-1">
                      {format(new Date(chat.last_message_date), 'MMM d, h:mm a')}
                    </p>
                  )}
                </div>
                <div className="ml-3">
                  {chat.chat_type === 'group' ? (
                    <Users className="h-5 w-5 text-gray-400" />
                  ) : (
                    <MessageSquare className="h-5 w-5 text-gray-400" />
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}