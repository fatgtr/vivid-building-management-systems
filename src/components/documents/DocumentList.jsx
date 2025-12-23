import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { FileText, Download, Eye, History, Upload, Link2, Trash2 } from 'lucide-react';
import { format } from 'date-fns';

export default function DocumentList({ 
  documentIds = [], 
  onViewDocument, 
  onUploadNew, 
  onLinkExisting, 
  onRemove,
  showActions = true 
}) {
  const { data: documents = [], isLoading } = useQuery({
    queryKey: ['documents', documentIds],
    queryFn: async () => {
      if (documentIds.length === 0) return [];
      const allDocs = await base44.entities.Document.list();
      return allDocs.filter(doc => documentIds.includes(doc.id));
    },
    enabled: documentIds.length > 0,
  });

  const handleDownload = async (doc) => {
    window.open(doc.file_url, '_blank');
  };

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[...Array(3)].map((_, i) => (
          <Skeleton key={i} className="h-20 rounded-lg" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {showActions && (
        <div className="flex gap-2">
          <Button onClick={onUploadNew} size="sm" variant="outline" className="gap-2">
            <Upload className="h-4 w-4" />
            Upload New
          </Button>
          <Button onClick={onLinkExisting} size="sm" variant="outline" className="gap-2">
            <Link2 className="h-4 w-4" />
            Link Existing
          </Button>
        </div>
      )}

      {documents.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <FileText className="h-12 w-12 text-slate-300 mx-auto mb-3" />
            <p className="text-sm font-medium text-slate-600">No documents attached</p>
            <p className="text-xs text-slate-500 mt-1">Upload or link documents to get started</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {documents.map((doc) => (
            <Card key={doc.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-blue-50 rounded-lg">
                    <FileText className="h-5 w-5 text-blue-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-900 truncate">{doc.title}</p>
                        {doc.description && (
                          <p className="text-xs text-slate-600 mt-1 line-clamp-2">{doc.description}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <Badge variant="outline" className="text-xs capitalize">
                          {doc.category?.replace(/_/g, ' ')}
                        </Badge>
                        {doc.version > 1 && (
                          <Badge variant="secondary" className="text-xs">
                            v{doc.version}
                          </Badge>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-3 mt-2">
                      <span className="text-xs text-slate-500">
                        {doc.created_date && format(new Date(doc.created_date), 'dd/MM/yyyy')}
                      </span>
                      {doc.expiry_date && (
                        <Badge 
                          variant={new Date(doc.expiry_date) < new Date() ? "destructive" : "outline"} 
                          className="text-xs"
                        >
                          {new Date(doc.expiry_date) < new Date() ? 'Expired' : 'Expires'}: {format(new Date(doc.expiry_date), 'dd/MM/yyyy')}
                        </Badge>
                      )}
                      {doc.file_size && (
                        <span className="text-xs text-slate-500">
                          {(doc.file_size / 1024 / 1024).toFixed(2)} MB
                        </span>
                      )}
                    </div>

                    {doc.tags && doc.tags.length > 0 && (
                      <div className="flex gap-1 mt-2">
                        {doc.tags.map(tag => (
                          <Badge key={tag} variant="secondary" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    )}

                    <div className="flex items-center gap-2 mt-3">
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        className="h-7 text-xs gap-1"
                        onClick={() => handleDownload(doc)}
                      >
                        <Download className="h-3 w-3" />
                        Download
                      </Button>
                      {onViewDocument && (
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          className="h-7 text-xs gap-1"
                          onClick={() => onViewDocument(doc)}
                        >
                          <Eye className="h-3 w-3" />
                          View Details
                        </Button>
                      )}
                      {onRemove && (
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          className="h-7 text-xs gap-1 text-red-600 hover:text-red-700 hover:bg-red-50"
                          onClick={() => onRemove(doc.id)}
                        >
                          <Trash2 className="h-3 w-3" />
                          Remove
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}