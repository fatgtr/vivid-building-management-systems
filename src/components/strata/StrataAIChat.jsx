import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Bot, Send, Loader2, FileText, X } from 'lucide-react';
import { ScrollArea } from "@/components/ui/scroll-area";

export default function StrataAIChat({ buildingId }) {
  const [conversationId, setConversationId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [relevantDocs, setRelevantDocs] = useState([]);
  const scrollRef = useRef(null);

  useEffect(() => {
    if (buildingId) {
      initConversation();
      fetchRelevantDocs();
    }
  }, [buildingId]);

  useEffect(() => {
    if (conversationId) {
      const unsubscribe = base44.agents.subscribeToConversation(conversationId, (data) => {
        setMessages(data.messages);
        setIsLoading(false);
      });
      return () => unsubscribe();
    }
  }, [conversationId]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const initConversation = async () => {
    try {
      const conversation = await base44.agents.createConversation({
        agent_name: 'strata_expert',
        metadata: {
          name: 'Bylaws Q&A',
          building_id: buildingId
        }
      });
      setConversationId(conversation.id);
    } catch (error) {
      console.error('Error creating conversation:', error);
    }
  };

  const fetchRelevantDocs = async () => {
    try {
      const allDocs = await base44.entities.Document.list();
      const buildingDocs = allDocs.filter(doc => 
        doc.building_id === buildingId && 
        (doc.category === 'bylaws' || doc.category === 'strata_management_statement')
      );
      setRelevantDocs(buildingDocs);
    } catch (error) {
      console.error('Error fetching documents:', error);
    }
  };

  const handleSend = async () => {
    if (!inputMessage.trim() || !conversationId) return;

    setIsLoading(true);
    const userMessage = inputMessage;
    setInputMessage('');

    try {
      const conversation = await base44.agents.getConversation(conversationId);
      
      let contextMessage = userMessage;
      if (relevantDocs.length > 0) {
        const docList = relevantDocs.map(doc => `- ${doc.title} (${doc.category})`).join('\n');
        contextMessage = `Building has these relevant documents:\n${docList}\n\nUser question: ${userMessage}`;
      }

      await base44.agents.addMessage(conversation, {
        role: 'user',
        content: contextMessage
      });
    } catch (error) {
      console.error('Error sending message:', error);
      setIsLoading(false);
    }
  };

  return (
    <Card className="border-0 shadow-sm h-[600px] flex flex-col">
      <CardHeader className="border-b">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center">
              <Bot className="h-5 w-5 text-white" />
            </div>
            <div>
              <CardTitle>Bylaws AI Assistant</CardTitle>
              <p className="text-xs text-slate-500 mt-1">Ask about building rules and bylaws</p>
            </div>
          </div>
          {relevantDocs.length > 0 && (
            <Badge variant="outline" className="flex items-center gap-1">
              <FileText className="h-3 w-3" />
              {relevantDocs.length} docs
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="flex-1 p-0 flex flex-col overflow-hidden">
        <ScrollArea className="flex-1 p-4" ref={scrollRef}>
          <div className="space-y-4">
            {messages.length === 0 && (
              <div className="text-center py-12">
                <Bot className="h-12 w-12 mx-auto text-slate-300 mb-4" />
                <h3 className="font-semibold text-slate-700 mb-2">Ask me anything about your building</h3>
                <p className="text-sm text-slate-500 max-w-md mx-auto">
                  I can help you find information about bylaws, strata rules, shared facilities, and more.
                </p>
                <div className="mt-6 space-y-2 max-w-md mx-auto">
                  <p className="text-xs font-medium text-slate-600">Try asking:</p>
                  <div className="space-y-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="w-full text-left justify-start"
                      onClick={() => setInputMessage("What are the rules for pet ownership?")}
                    >
                      "What are the rules for pet ownership?"
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="w-full text-left justify-start"
                      onClick={() => setInputMessage("Can I renovate my balcony?")}
                    >
                      "Can I renovate my balcony?"
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="w-full text-left justify-start"
                      onClick={() => setInputMessage("What are the noise restrictions?")}
                    >
                      "What are the noise restrictions?"
                    </Button>
                  </div>
                </div>
              </div>
            )}
            {messages.map((msg, idx) => (
              <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] rounded-lg p-3 ${
                  msg.role === 'user' 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-slate-100 text-slate-900'
                }`}>
                  {msg.role === 'assistant' && (
                    <div className="flex items-center gap-2 mb-1">
                      <Bot className="h-4 w-4 text-blue-600" />
                      <span className="text-xs font-medium text-slate-600">AI Assistant</span>
                    </div>
                  )}
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-slate-100 rounded-lg p-3 flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                  <span className="text-sm text-slate-600">Thinking...</span>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        <div className="p-4 border-t">
          <form onSubmit={(e) => { e.preventDefault(); handleSend(); }} className="flex gap-2">
            <Input
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              placeholder="Ask about bylaws, rules, or facilities..."
              disabled={isLoading}
              className="flex-1"
            />
            <Button type="submit" disabled={isLoading || !inputMessage.trim()} size="icon">
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </div>
      </CardContent>
    </Card>
  );
}