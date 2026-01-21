import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, FileText, Sparkles, Filter, Download, Eye, Clock } from 'lucide-react';
import { Skeleton } from "@/components/ui/skeleton";
import { format } from 'date-fns';

export default function AdvancedDocumentSearch({ buildingId }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState(null);

  const searchMutation = useMutation({
    mutationFn: async (query) => {
      const { data } = await base44.functions.invoke('searchDocumentContent', {
        building_id: buildingId,
        search_query: query,
        search_type: 'full_text'
      });
      return data;
    },
    onSuccess: (data) => {
      setSearchResults(data);
    }
  });

  const aiSearchMutation = useMutation({
    mutationFn: async (query) => {
      const { data } = await base44.functions.invoke('searchDocumentContent', {
        building_id: buildingId,
        search_query: query,
        search_type: 'ai_semantic'
      });
      return data;
    },
    onSuccess: (data) => {
      setSearchResults(data);
    }
  });

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      searchMutation.mutate(searchQuery);
    }
  };

  const handleAISearch = () => {
    if (searchQuery.trim()) {
      aiSearchMutation.mutate(searchQuery);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Advanced Document Search</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSearch} className="space-y-4">
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search documents by content, title, or metadata..."
                  className="pl-10"
                />
              </div>
              <Button type="submit" disabled={searchMutation.isPending}>
                {searchMutation.isPending ? 'Searching...' : 'Search'}
              </Button>
              <Button 
                type="button" 
                variant="outline"
                onClick={handleAISearch}
                disabled={aiSearchMutation.isPending}
              >
                <Sparkles className="h-4 w-4 mr-2" />
                AI Search
              </Button>
            </div>
            <p className="text-xs text-slate-500">
              AI Search uses semantic understanding to find relevant documents even if they don't contain exact keywords
            </p>
          </form>
        </CardContent>
      </Card>

      {(searchMutation.isPending || aiSearchMutation.isPending) && (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-lg" />
          ))}
        </div>
      )}

      {searchResults && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Search Results</CardTitle>
              <Badge variant="outline">
                {searchResults.results?.length || 0} documents found
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            {searchResults.results?.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="h-16 w-16 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-600 font-medium mb-2">No documents found</p>
                <p className="text-sm text-slate-500">Try adjusting your search query or use AI Search for better results</p>
              </div>
            ) : (
              <div className="space-y-4">
                {searchResults.results?.map((result) => (
                  <Card key={result.document_id} className="border-2 hover:border-blue-200 transition-colors">
                    <CardContent className="pt-6">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="font-semibold text-slate-900">{result.title}</h3>
                            {result.relevance_score && (
                              <Badge className="bg-blue-100 text-blue-800">
                                {Math.round(result.relevance_score * 100)}% match
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-3 text-xs text-slate-500">
                            <Badge variant="outline" className="capitalize">
                              {result.category?.replace(/_/g, ' ')}
                            </Badge>
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {format(new Date(result.upload_date), 'MMM d, yyyy')}
                            </span>
                          </div>
                        </div>
                      </div>

                      {result.matched_content && (
                        <div className="mb-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                          <p className="text-sm text-slate-700">
                            <span className="font-medium">Matched content: </span>
                            {result.matched_content.map((match, idx) => (
                              <span key={idx} className="bg-yellow-200 px-1 rounded">
                                {match}
                              </span>
                            ))}
                          </p>
                        </div>
                      )}

                      {result.ai_summary && (
                        <div className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                          <p className="text-xs text-blue-600 font-medium mb-1 flex items-center gap-1">
                            <Sparkles className="h-3 w-3" />
                            AI Summary
                          </p>
                          <p className="text-sm text-slate-700">{result.ai_summary}</p>
                        </div>
                      )}

                      {result.key_points?.length > 0 && (
                        <div className="mb-3">
                          <p className="text-xs text-slate-500 mb-2">Key Points:</p>
                          <div className="flex flex-wrap gap-1">
                            {result.key_points.map((point, idx) => (
                              <Badge key={idx} variant="outline" className="text-xs">
                                {point}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="flex gap-2 pt-3 border-t">
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => window.open(result.file_url, '_blank')}
                        >
                          <Eye className="h-3 w-3 mr-2" />
                          View
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => {
                            const link = document.createElement('a');
                            link.href = result.file_url;
                            link.download = result.title;
                            link.click();
                          }}
                        >
                          <Download className="h-3 w-3 mr-2" />
                          Download
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {searchResults?.suggestions?.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Did you mean?</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {searchResults.suggestions.map((suggestion, idx) => (
                <Button
                  key={idx}
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSearchQuery(suggestion);
                    searchMutation.mutate(suggestion);
                  }}
                >
                  {suggestion}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}