import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Bookmark, Trash2, FileText, ExternalLink } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

export default function SavedResponsesPanel({ userEmail }) {
  const queryClient = useQueryClient();

  const { data: savedResponses = [], isLoading } = useQuery({
    queryKey: ['savedResponses', userEmail],
    queryFn: () => base44.entities.SavedResponse.filter({ user_email: userEmail }),
    enabled: !!userEmail,
  });

  const { data: allDocuments = [] } = useQuery({
    queryKey: ['documents'],
    queryFn: () => base44.entities.Document.list(),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.SavedResponse.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['savedResponses'] });
      toast.success('Response removed');
    },
  });

  if (isLoading) {
    return (
      <Card className="border-0 shadow-sm">
        <CardContent className="p-6">
          <p className="text-sm text-slate-500">Loading saved responses...</p>
        </CardContent>
      </Card>
    );
  }

  if (savedResponses.length === 0) {
    return (
      <Card className="border-0 shadow-sm">
        <CardContent className="p-12 text-center">
          <Bookmark className="h-12 w-12 mx-auto text-slate-300 mb-4" />
          <h3 className="text-lg font-semibold mb-2">No Saved Responses</h3>
          <p className="text-slate-600 text-sm">
            Save helpful AI responses for quick reference later
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-900">Saved Responses</h2>
        <Badge variant="outline">{savedResponses.length} saved</Badge>
      </div>
      
      <ScrollArea className="h-[600px]">
        <div className="space-y-3 pr-4">
          {savedResponses.map((response) => {
            const docs = response.document_references?.map(ref => 
              allDocuments.find(d => d.id === ref.document_id)
            ).filter(Boolean) || [];

            return (
              <Card key={response.id} className="border-0 shadow-sm hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <CardTitle className="text-sm font-semibold text-slate-900 mb-2">
                        {response.question}
                      </CardTitle>
                      {response.tags && response.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {response.tags.map((tag, idx) => (
                            <Badge key={idx} variant="outline" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-slate-400 hover:text-red-600"
                      onClick={() => deleteMutation.mutate(response.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-slate-700 leading-relaxed">
                    {response.answer.substring(0, 200)}
                    {response.answer.length > 200 && '...'}
                  </p>
                  
                  {docs.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs font-medium text-slate-600">Referenced Documents:</p>
                      <div className="space-y-1">
                        {response.document_references.map((ref, idx) => {
                          const doc = docs[idx];
                          if (!doc) return null;
                          
                          return (
                            <a
                              key={idx}
                              href={doc.file_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-2 p-2 bg-blue-50 hover:bg-blue-100 rounded text-xs text-blue-700 transition-colors"
                            >
                              <FileText className="h-3 w-3 flex-shrink-0" />
                              <span className="flex-1 font-medium">{ref.document_title}</span>
                              <span className="text-blue-600">§ {ref.section}</span>
                              <ExternalLink className="h-3 w-3 flex-shrink-0" />
                            </a>
                          );
                        })}
                      </div>
                    </div>
                  )}
                  
                  <div className="pt-2 border-t text-xs text-slate-500">
                    Saved {format(new Date(response.created_date), 'MMM d, yyyy')}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}