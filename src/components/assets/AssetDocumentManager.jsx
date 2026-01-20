import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { FileText, Upload, Download, Eye, Trash2, Loader2, File } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

export default function AssetDocumentManager({ assetId, buildingId }) {
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadData, setUploadData] = useState({
    title: '',
    category: 'manual',
    file: null
  });

  const queryClient = useQueryClient();

  const { data: documents = [] } = useQuery({
    queryKey: ['asset-documents', assetId],
    queryFn: async () => {
      const asset = await base44.entities.Asset.get(assetId);
      if (!asset.documents || asset.documents.length === 0) return [];
      
      const docs = await Promise.all(
        asset.documents.map(docId => base44.entities.Document.get(docId).catch(() => null))
      );
      return docs.filter(d => d !== null);
    },
    enabled: !!assetId
  });

  const uploadMutation = useMutation({
    mutationFn: async ({ file, title, category }) => {
      // Upload file
      const { data: uploadResult } = await base44.integrations.Core.UploadFile({ file });
      
      // Create document record
      const document = await base44.entities.Document.create({
        building_id: buildingId,
        title,
        category,
        file_url: uploadResult.file_url,
        file_type: file.type,
        file_size: file.size,
        status: 'active',
        visibility: 'staff_only',
        tags: ['asset-document']
      });

      // Link document to asset
      const asset = await base44.entities.Asset.get(assetId);
      const updatedDocuments = [...(asset.documents || []), document.id];
      await base44.entities.Asset.update(assetId, { documents: updatedDocuments });

      return document;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['asset-documents'] });
      queryClient.invalidateQueries({ queryKey: ['assets'] });
      setShowUploadDialog(false);
      setUploadData({ title: '', category: 'manual', file: null });
      toast.success('Document uploaded successfully');
    },
    onError: () => {
      toast.error('Failed to upload document');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (documentId) => {
      const asset = await base44.entities.Asset.get(assetId);
      const updatedDocuments = (asset.documents || []).filter(id => id !== documentId);
      await base44.entities.Asset.update(assetId, { documents: updatedDocuments });
      await base44.entities.Document.delete(documentId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['asset-documents'] });
      toast.success('Document deleted');
    },
    onError: () => {
      toast.error('Failed to delete document');
    }
  });

  const handleUpload = () => {
    if (!uploadData.file || !uploadData.title) {
      toast.error('Please select a file and provide a title');
      return;
    }
    uploadMutation.mutate(uploadData);
  };

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Asset Documents</CardTitle>
          <Button size="sm" onClick={() => setShowUploadDialog(true)}>
            <Upload className="h-4 w-4 mr-2" />
            Upload
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {documents.length === 0 ? (
          <div className="text-center py-8 text-slate-500">
            <File className="h-12 w-12 mx-auto mb-2 text-slate-300" />
            <p className="text-sm">No documents uploaded yet</p>
          </div>
        ) : (
          <div className="space-y-2">
            {documents.map(doc => (
              <div key={doc.id} className="flex items-center justify-between p-3 border border-slate-200 rounded-lg hover:bg-slate-50">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <FileText className="h-5 w-5 text-blue-600 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{doc.title}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className="text-xs">
                        {doc.category?.replace(/_/g, ' ')}
                      </Badge>
                      <span className="text-xs text-slate-500">
                        {doc.created_date && format(new Date(doc.created_date), 'MMM d, yyyy')}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                    <a href={doc.file_url} target="_blank" rel="noopener noreferrer">
                      <Eye className="h-4 w-4" />
                    </a>
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                    <a href={doc.file_url} download>
                      <Download className="h-4 w-4" />
                    </a>
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8 text-red-600 hover:text-red-700"
                    onClick={() => deleteMutation.mutate(doc.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upload Asset Document</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1 block">Document Title</label>
              <Input
                value={uploadData.title}
                onChange={(e) => setUploadData({ ...uploadData, title: e.target.value })}
                placeholder="e.g., User Manual, Maintenance Guide"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Category</label>
              <Select 
                value={uploadData.category} 
                onValueChange={(value) => setUploadData({ ...uploadData, category: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="manual">User Manual</SelectItem>
                  <SelectItem value="as_built_electrical">As-Built Electrical</SelectItem>
                  <SelectItem value="as_built_mechanical">As-Built Mechanical</SelectItem>
                  <SelectItem value="certificate">Certificate</SelectItem>
                  <SelectItem value="compliance">Compliance Document</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">File</label>
              <input
                type="file"
                onChange={(e) => setUploadData({ ...uploadData, file: e.target.files[0] })}
                className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowUploadDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpload} disabled={uploadMutation.isPending}>
              {uploadMutation.isPending ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Uploading...</>
              ) : (
                <>Upload</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}