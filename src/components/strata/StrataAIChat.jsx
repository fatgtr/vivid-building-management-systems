import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Bot, Send, Loader2, FileText, X, Star, ExternalLink, Bookmark, Lightbulb, MessagesSquare, FileDown, Copy, Check } from 'lucide-react';
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { toast } from 'sonner';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export default function StrataAIChat({ buildingId }) {
  const [conversationId, setConversationId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [relevantDocs, setRelevantDocs] = useState([]);
  const [user, setUser] = useState(null);
  const [copiedText, setCopiedText] = useState(null);
  const scrollRef = useRef(null);
  const queryClient = useQueryClient();

  const { data: allDocuments = [] } = useQuery({
    queryKey: ['documents'],
    queryFn: () => base44.entities.Document.list(),
  });

  const { data: savedResponses = [] } = useQuery({
    queryKey: ['savedResponses', user?.email],
    queryFn: () => base44.entities.SavedResponse.filter({ user_email: user?.email }),
    enabled: !!user?.email,
  });

  const saveResponseMutation = useMutation({
    mutationFn: (data) => base44.entities.SavedResponse.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['savedResponses'] });
      toast.success('Response saved for quick reference');
    },
  });

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

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

  const parseSuggestedDocs = (text) => {
    const regex = /\[SUGGEST_DOCS\](.*?)\[\/SUGGEST_DOCS\]/g;
    const match = regex.exec(text);
    if (!match) return { suggestions: [], cleanText: text };
    
    const docNames = match[1].split(',').map(name => name.trim());
    const suggestions = docNames
      .map(name => allDocuments.find(d => d.title.toLowerCase().includes(name.toLowerCase())))
      .filter(Boolean);
    
    const cleanText = text.replace(regex, '');
    return { suggestions, cleanText };
  };

  const parseDraft = (text) => {
    const regex = /\[DRAFT_START\](.*?)\[DRAFT_END\]/s;
    const match = regex.exec(text);
    if (!match) return { draft: null, cleanText: text };
    
    const draft = match[1].trim();
    const cleanText = text.replace(regex, '');
    return { draft, cleanText };
  };

  const parseSummary = (text) => {
    const regex = /\[SUMMARY_START\](.*?)\[SUMMARY_END\]/s;
    const match = regex.exec(text);
    if (!match) return { summary: null, cleanText: text };
    
    const summary = match[1].trim();
    const cleanText = text.replace(regex, '');
    return { summary, cleanText };
  };

  const parseDocumentReferences = (text) => {
    const regex = /\[DOC:(.*?)\|SECTION:(.*?)\]/g;
    const references = [];
    let match;
    
    while ((match = regex.exec(text)) !== null) {
      const docTitle = match[1];
      const section = match[2];
      const doc = allDocuments.find(d => d.title.toLowerCase().includes(docTitle.toLowerCase()));
      
      if (doc) {
        references.push({
          document_id: doc.id,
          document_title: doc.title,
          document_url: doc.file_url,
          section: section,
          fullMatch: match[0]
        });
      }
    }
    
    return references;
  };

  const formatMessageWithLinks = (text) => {
    const references = parseDocumentReferences(text);
    const { suggestions, cleanText: textAfterSuggestions } = parseSuggestedDocs(text);
    const { draft, cleanText: textAfterDraft } = parseDraft(textAfterSuggestions);
    const { summary, cleanText: textAfterSummary } = parseSummary(textAfterDraft);
    
    let formattedText = textAfterSummary;
    
    references.forEach((ref, idx) => {
      formattedText = formattedText.replace(ref.fullMatch, `[REF_${idx}]`);
    });
    
    return { text: formattedText, references, suggestions, draft, summary };
  };

  const handleCopy = async (text) => {
    await navigator.clipboard.writeText(text);
    setCopiedText(text);
    toast.success('Copied to clipboard');
    setTimeout(() => setCopiedText(null), 2000);
  };

  const handleSaveResponse = (question, answer) => {
    const { references } = formatMessageWithLinks(answer);
    
    saveResponseMutation.mutate({
      user_email: user?.email,
      building_id: buildingId,
      question,
      answer,
      document_references: references.map(ref => ({
        document_id: ref.document_id,
        document_title: ref.document_title,
        section: ref.section
      })),
      tags: extractTags(question)
    });
  };

  const extractTags = (question) => {
    const tagKeywords = {
      'pet': ['pet', 'dog', 'cat', 'animal'],
      'noise': ['noise', 'loud', 'quiet', 'sound'],
      'renovation': ['renovate', 'construction', 'modify', 'change'],
      'parking': ['park', 'car', 'vehicle', 'garage'],
      'balcony': ['balcony', 'deck', 'terrace'],
      'common_area': ['common', 'shared', 'pool', 'gym', 'lift']
    };
    
    const tags = [];
    const lowerQuestion = question.toLowerCase();
    
    Object.entries(tagKeywords).forEach(([tag, keywords]) => {
      if (keywords.some(keyword => lowerQuestion.includes(keyword))) {
        tags.push(tag);
      }
    });
    
    return tags;
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
          <div className="flex items-center gap-2">
            {relevantDocs.length > 0 && (
              <Badge variant="outline" className="flex items-center gap-1">
                <FileText className="h-3 w-3" />
                {relevantDocs.length} docs
              </Badge>
            )}
            {savedResponses.length > 0 && (
              <Badge variant="outline" className="flex items-center gap-1 bg-amber-50 border-amber-200 text-amber-700">
                <Bookmark className="h-3 w-3" />
                {savedResponses.length} saved
              </Badge>
            )}
          </div>
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
            {messages.map((msg, idx) => {
              const prevMsg = idx > 0 ? messages[idx - 1] : null;
              const isUserQuestion = msg.role === 'user';
              const isAssistantResponse = msg.role === 'assistant';
              const userQuestion = isAssistantResponse && prevMsg?.role === 'user' ? prevMsg.content : null;
              
              if (isUserQuestion) {
                return (
                  <div key={idx} className="flex justify-end">
                    <div className="max-w-[80%] rounded-lg p-3 bg-blue-600 text-white">
                      <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                    </div>
                  </div>
                );
              }
              
              if (isAssistantResponse) {
                const { text, references, suggestions, draft, summary } = formatMessageWithLinks(msg.content);
                
                return (
                  <div key={idx} className="flex justify-start">
                    <div className="max-w-[80%] space-y-2">
                      <div className="bg-slate-100 text-slate-900 rounded-lg p-3">
                        <div className="flex items-center gap-2 mb-2">
                          <Bot className="h-4 w-4 text-blue-600" />
                          <span className="text-xs font-medium text-slate-600">AI Assistant</span>
                        </div>
                        <div className="text-sm leading-relaxed whitespace-pre-wrap">
                          {text.split(/(\[REF_\d+\])/).map((part, i) => {
                            const refMatch = part.match(/\[REF_(\d+)\]/);
                            if (refMatch) {
                              const refIdx = parseInt(refMatch[1]);
                              const ref = references[refIdx];
                              return (
                                <a
                                  key={i}
                                  href={ref.document_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs font-medium hover:bg-blue-200 transition-colors"
                                >
                                  <FileText className="h-3 w-3" />
                                  {ref.document_title} § {ref.section}
                                  <ExternalLink className="h-3 w-3" />
                                </a>
                              );
                            }
                            return part;
                          })}
                        </div>
                      </div>

                      {/* Suggested Documents */}
                      {suggestions && suggestions.length > 0 && (
                        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                          <div className="flex items-center gap-2 mb-2">
                            <Lightbulb className="h-4 w-4 text-amber-600" />
                            <span className="text-xs font-semibold text-amber-900">Suggested Documents</span>
                          </div>
                          <div className="space-y-1">
                            {suggestions.map((doc, i) => (
                              <a
                                key={i}
                                href={doc.file_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-2 text-xs text-amber-800 hover:text-amber-900 hover:underline"
                              >
                                <FileText className="h-3 w-3" />
                                {doc.title}
                                <ExternalLink className="h-3 w-3" />
                              </a>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Draft Communication */}
                      {draft && (
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <MessagesSquare className="h-4 w-4 text-blue-600" />
                              <span className="text-xs font-semibold text-blue-900">Draft Communication</span>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleCopy(draft)}
                              className="h-6 text-xs"
                            >
                              {copiedText === draft ? (
                                <Check className="h-3 w-3 text-green-600" />
                              ) : (
                                <Copy className="h-3 w-3" />
                              )}
                            </Button>
                          </div>
                          <div className="text-xs text-blue-900 whitespace-pre-wrap font-mono bg-white p-2 rounded border border-blue-100">
                            {draft}
                          </div>
                          <div className="mt-2">
                            <Link to={createPageUrl('Announcements')}>
                              <Button variant="outline" size="sm" className="w-full text-xs">
                                <FileDown className="h-3 w-3 mr-1" />
                                Create Announcement from Draft
                              </Button>
                            </Link>
                          </div>
                        </div>
                      )}

                      {/* Summary */}
                      {summary && (
                        <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <FileDown className="h-4 w-4 text-green-600" />
                              <span className="text-xs font-semibold text-green-900">Summary</span>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleCopy(summary)}
                              className="h-6 text-xs"
                            >
                              {copiedText === summary ? (
                                <Check className="h-3 w-3 text-green-600" />
                              ) : (
                                <Copy className="h-3 w-3" />
                              )}
                            </Button>
                          </div>
                          <div className="text-xs text-green-900 whitespace-pre-wrap">
                            {summary}
                          </div>
                        </div>
                      )}
                      
                      {references.length > 0 && (
                        <div className="flex items-center gap-2 text-xs text-slate-500 px-1">
                          <FileText className="h-3 w-3" />
                          <span>{references.length} document{references.length > 1 ? 's' : ''} referenced</span>
                        </div>
                      )}
                      
                      <div className="flex justify-end">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleSaveResponse(userQuestion, msg.content)}
                          className="h-7 text-xs"
                        >
                          <Bookmark className="h-3 w-3 mr-1" />
                          Save Response
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              }
              
              return null;
            })}
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