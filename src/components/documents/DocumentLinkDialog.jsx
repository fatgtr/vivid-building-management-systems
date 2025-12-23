import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, FileText, Link2, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

export default function DocumentLinkDialog({ open, onOpenChange, buildingId, linkedEntityType, linkedEntityId, existingDocIds = [] }) {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDocs, setSelectedDocs] = useState([]);
  const [linking, setLinking] = useState(false);

  const { data: documents = [], isLoading } = useQuery({
    queryKey: ['documents', buildingId],
    queryFn: async () => {
      const docs = buildingId 
        ? await base44.entities.Document.filter({ building_id: buildingId, status: 'active' })
        : await base44.entities.Document.filter({ status: 'active' });
      return docs.filter(d => !existingDocIds.includes(d.id));
    },
    enabled: open,
  });

  const filteredDocs = documents.filter(doc =>
    doc.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    doc.category?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    doc.tags?.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const toggleDoc = (docId) => {
    setSelectedDocs(prev =>
      prev.includes(docId) ? prev.filter(id => id !== docId) : [...prev, docId]
    );
  };

  const handleLink = async () => {
    if (selectedDocs.length === 0 || !linkedEntityType || !linkedEntityId) {
      toast.error('Please select at least one document');
      return;
    }

    setLinking(true);
    try {
      const entity = await base44.entities[linkedEntityType].filter({ id: linkedEntityId });
      if (entity.length > 0) {
        const existingDocs = entity[0].documents || [];
        await base44.entities[linkedEntityType].update(linkedEntityId, {
          documents: [...existingDocs, ...selectedDocs],
        });
      }

      queryClient.invalidateQueries({ queryKey: [linkedEntityType.toLowerCase()] });
      toast.success(`${selectedDocs.length} document(s) linked successfully`);
      handleClose();
    } catch (error) {
      toast.error('Failed to link documents: ' + error.message);
    } finally {
      setLinking(false);
    }
  };

  const handleClose = () => {
    setSearchQuery('');
    setSelectedDocs([]);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Link Existing Documents</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search documents by title, category, or tags..."
              className="pl-9"
            />
          </div>

          {/* Document List */}
          <ScrollArea className="h-[400px] border rounded-lg">
            {isLoading ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
              </div>
            ) : filteredDocs.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center p-4">
                <FileText className="h-12 w-12 text-slate-300 mb-2" />
                <p className="text-sm font-medium text-slate-600">No documents found</p>
                <p className="text-xs text-slate-500 mt-1">Try adjusting your search</p>
              </div>
            ) : (
              <div className="space-y-2 p-4">
                {filteredDocs.map((doc) => (
                  <div
                    key={doc.id}
                    onClick={() => toggleDoc(doc.id)}
                    className="flex items-start gap-3 p-3 border rounded-lg hover:bg-slate-50 cursor-pointer transition-colors"
                  >
                    <Checkbox
                      checked={selectedDocs.includes(doc.id)}
                      onCheckedChange={() => toggleDoc(doc.id)}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-slate-900 truncate">{doc.title}</p>
                          {doc.description && (
                            <p className="text-xs text-slate-600 mt-1 line-clamp-2">{doc.description}</p>
                          )}
                        </div>
                        <Badge variant="outline" className="text-xs capitalize flex-shrink-0">
                          {doc.category?.replace(/_/g, ' ')}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-3 mt-2">
                        <span className="text-xs text-slate-500">
                          {doc.created_date && format(new Date(doc.created_date), 'dd/MM/yyyy')}
                        </span>
                        {doc.expiry_date && (
                          <Badge variant="outline" className="text-xs">
                            Expires: {format(new Date(doc.expiry_date), 'dd/MM/yyyy')}
                          </Badge>
                        )}
                        {doc.tags && doc.tags.length > 0 && (
                          <div className="flex gap-1">
                            {doc.tags.slice(0, 2).map(tag => (
                              <Badge key={tag} variant="secondary" className="text-xs">
                                {tag}
                              </Badge>
                            ))}
                            {doc.tags.length > 2 && (
                              <span className="text-xs text-slate-500">+{doc.tags.length - 2}</span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>

          {/* Selected Count */}
          {selectedDocs.length > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-sm font-medium text-blue-900">
                {selectedDocs.length} document(s) selected
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={linking}>
            Cancel
          </Button>
          <Button onClick={handleLink} disabled={linking || selectedDocs.length === 0}>
            {linking ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Linking...
              </>
            ) : (
              <>
                <Link2 className="mr-2 h-4 w-4" />
                Link {selectedDocs.length > 0 && `(${selectedDocs.length})`}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}