import React, { useState, useRef, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  Sparkles, 
  Send, 
  X, 
  Loader2,
  FileText,
  MessageSquare,
  BarChart3,
  Lightbulb,
  Copy,
  Check,
  RotateCcw
} from 'lucide-react';
import { cn } from "@/lib/utils";
import ReactMarkdown from 'react-markdown';

const QUICK_ACTIONS = [
  {
    icon: MessageSquare,
    label: "Draft Resident Response",
    prompt: "Help me draft a professional response to a resident inquiry",
    category: "communication"
  },
  {
    icon: FileText,
    label: "Summarize Documents",
    prompt: "Summarize the key compliance requirements and deadlines from my building documents",
    category: "documents"
  },
  {
    icon: BarChart3,
    label: "Operational Insights",
    prompt: "Analyze my building's maintenance patterns and suggest operational improvements",
    category: "insights"
  },
  {
    icon: Lightbulb,
    label: "Best Practices",
    prompt: "What are the best practices for managing common property maintenance disputes?",
    category: "advice"
  },
  {
    icon: Sparkles,
    label: "How to Use Vivid BMS",
    prompt: "How do I create a work order in Vivid BMS?",
    category: "system_help"
  }
];

export default function AIAssistant({ buildingId, onClose }) {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: "Hi! I'm your Vivid BMS AI Assistant. I can help you with:\n\n• **Building Management** - Best practices, compliance, and operational insights\n• **System Guidance** - Learn how to use Vivid BMS features and workflows\n• **Draft Communications** - Professional responses to resident inquiries\n• **Document Analysis** - Summarize reports and identify key requirements\n• **Feature Recommendations** - Discover tools you might not be using\n\nHow can I assist you today?"
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState(null);
  const messagesEndRef = useRef(null);

  const { data: workOrders = [] } = useQuery({
    queryKey: ['workOrders', buildingId],
    queryFn: () => buildingId ? base44.entities.WorkOrder.filter({ building_id: buildingId }) : base44.entities.WorkOrder.list('-created_date', 50),
    enabled: true,
  });

  const { data: documents = [] } = useQuery({
    queryKey: ['documents', buildingId],
    queryFn: () => buildingId ? base44.entities.Document.filter({ building_id: buildingId }) : base44.entities.Document.list(),
    enabled: true,
  });

  const { data: announcements = [] } = useQuery({
    queryKey: ['announcements', buildingId],
    queryFn: () => buildingId ? base44.entities.Announcement.filter({ building_id: buildingId }) : base44.entities.Announcement.list(),
    enabled: true,
  });

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async (messageText = input) => {
    if (!messageText.trim() || isLoading) return;

    const userMessage = { role: 'user', content: messageText };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const { data } = await base44.functions.invoke('aiAssistantQuery', {
        query: messageText,
        buildingId: buildingId || null,
        contextData: {
          workOrdersCount: workOrders.length,
          openWorkOrders: workOrders.filter(wo => wo.status === 'open').length,
          urgentWorkOrders: workOrders.filter(wo => wo.priority === 'urgent').length,
          documentsCount: documents.length,
          recentAnnouncements: announcements.slice(0, 3).map(a => ({
            title: a.title,
            type: a.type,
            date: a.created_date
          }))
        }
      });

      const assistantMessage = {
        role: 'assistant',
        content: data.response,
        category: data.category
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.',
        error: true
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickAction = (action) => {
    handleSend(action.prompt);
  };

  const handleCopy = (content, index) => {
    navigator.clipboard.writeText(content);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const handleClearChat = () => {
    setMessages([
      {
        role: 'assistant',
        content: "Hi! I'm your Vivid BMS AI Assistant. I can help you with:\n\n• **Building Management** - Best practices, compliance, and operational insights\n• **System Guidance** - Learn how to use Vivid BMS features and workflows\n• **Draft Communications** - Professional responses to resident inquiries\n• **Document Analysis** - Summarize reports and identify key requirements\n• **Feature Recommendations** - Discover tools you might not be using\n\nHow can I assist you today?"
      }
    ]);
  };

  return (
    <Card className="fixed bottom-6 right-6 w-[450px] h-[600px] shadow-2xl border-2 border-blue-200 flex flex-col z-50">
      <CardHeader className="border-b bg-gradient-to-r from-blue-600 to-cyan-600 text-white p-4 flex-shrink-0">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Sparkles className="h-5 w-5" />
            AI Assistant
          </CardTitle>
          <div className="flex items-center gap-1">
            {messages.length > 1 && (
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={handleClearChat}
                className="text-white hover:bg-white/20"
                title="Clear chat"
              >
                <RotateCcw className="h-4 w-4" />
              </Button>
            )}
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={onClose}
              className="text-white hover:bg-white/20"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col p-0 overflow-hidden">
        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((message, index) => (
            <div
              key={index}
              className={cn(
                "flex gap-3",
                message.role === 'user' ? 'justify-end' : 'justify-start'
              )}
            >
              {message.role === 'assistant' && (
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center flex-shrink-0">
                  <Sparkles className="h-4 w-4 text-white" />
                </div>
              )}
              
              <div
                className={cn(
                  "max-w-[85%] rounded-lg p-3",
                  message.role === 'user'
                    ? 'bg-blue-600 text-white'
                    : message.error
                    ? 'bg-red-50 text-red-900 border border-red-200'
                    : 'bg-gray-100 text-gray-900'
                )}
              >
                {message.role === 'assistant' && message.category && (
                  <Badge variant="outline" className="mb-2 text-xs">
                    {message.category}
                  </Badge>
                )}
                
                {message.role === 'user' ? (
                  <p className="text-sm">{message.content}</p>
                ) : (
                  <div className="prose prose-sm max-w-none">
                    <ReactMarkdown
                      components={{
                        p: ({ children }) => <p className="mb-2 last:mb-0 text-sm leading-relaxed">{children}</p>,
                        ul: ({ children }) => <ul className="mb-2 ml-4 list-disc text-sm">{children}</ul>,
                        ol: ({ children }) => <ol className="mb-2 ml-4 list-decimal text-sm">{children}</ol>,
                        li: ({ children }) => <li className="mb-1">{children}</li>,
                        strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                        code: ({ children }) => (
                          <code className="bg-gray-200 px-1 py-0.5 rounded text-xs">{children}</code>
                        ),
                      }}
                    >
                      {message.content}
                    </ReactMarkdown>
                  </div>
                )}
                
                {message.role === 'assistant' && !message.error && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="mt-2 h-7 text-xs"
                    onClick={() => handleCopy(message.content, index)}
                  >
                    {copiedIndex === index ? (
                      <>
                        <Check className="h-3 w-3 mr-1" />
                        Copied
                      </>
                    ) : (
                      <>
                        <Copy className="h-3 w-3 mr-1" />
                        Copy
                      </>
                    )}
                  </Button>
                )}
              </div>
            </div>
          ))}
          
          {isLoading && (
            <div className="flex gap-3 justify-start">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center flex-shrink-0">
                <Sparkles className="h-4 w-4 text-white" />
              </div>
              <div className="bg-gray-100 rounded-lg p-3">
                <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>

        {/* Quick Actions */}
        {messages.length === 1 && (
        <div className="border-t p-4 bg-gray-50">
          <p className="text-xs text-gray-500 mb-3 font-medium">Quick Actions:</p>
          <div className="grid grid-cols-2 gap-2 max-h-[180px] overflow-y-auto">
            {QUICK_ACTIONS.map((action, index) => (
              <button
                key={index}
                onClick={() => handleQuickAction(action)}
                className="flex items-start gap-2 p-2 bg-white border border-gray-200 rounded-lg hover:border-blue-400 hover:bg-blue-50 transition-colors text-left"
                disabled={isLoading}
              >
                <action.icon className="h-4 w-4 text-blue-600 flex-shrink-0 mt-0.5" />
                <span className="text-xs text-gray-700">{action.label}</span>
              </button>
            ))}
          </div>
        </div>
        )}

        {/* Input Area */}
        <div className="border-t p-4 flex-shrink-0">
          <div className="flex gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
              placeholder="Ask me anything..."
              className="flex-1"
              disabled={isLoading}
            />
            <Button 
              onClick={() => handleSend()}
              disabled={!input.trim() || isLoading}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}