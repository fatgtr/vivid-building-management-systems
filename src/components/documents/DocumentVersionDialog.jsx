import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Upload, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function DocumentVersionDialog({ open, onOpenChange, parentDocument, onSuccess }) {
  const queryClient = useQueryClient();
  const [file, setFile] = useState(null);
  const [versionNotes, setVersionNotes] = useState('');
  const [uploading, setUploading] = useState(false);

  const handleFileSelect = (e) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
    }
  };

  const handleUploadVersion = async () => {
    if (!file || !parentDocument) {
      toast.error('Please select a file');
      return;
    }

    setUploading(true);
    try {
      // Upload new file
      const { file_url } = await base44.integrations.Core.UploadFile({ file });

      // Create new version document
      const newVersion = await base44.entities.Document.create({
        building_id: parentDocument.building_id,
        title: parentDocument.title,
        description: parentDocument.description,
        category: parentDocument.category,
        file_url,
        file_type: file.type,
        file_size: file.size,
        visibility: parentDocument.visibility,
        expiry_date: parentDocument.expiry_date,
        tags: parentDocument.tags,
        status: 'active',
        version: (parentDocument.version || 1) + 1,
        parent_document_id: parentDocument.parent_document_id || parentDocument.id,
        version_notes: versionNotes,
      });

      // Archive old version
      await base44.entities.Document.update(parentDocument.id, {
        status: 'archived',
      });

      queryClient.invalidateQueries({ queryKey: ['documents'] });
      toast.success('New version uploaded successfully');
      onSuccess?.(newVersion);
      handleClose();
    } catch (error) {
      toast.error('Failed to upload version: ' + error.message);
    } finally {
      setUploading(false);
    }
  };

  const handleClose = () => {
    setFile(null);
    setVersionNotes('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Upload New Version</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-sm text-slate-700">
              <span className="font-semibold">Current Document:</span> {parentDocument?.title}
            </p>
            <p className="text-xs text-slate-500 mt-1">
              Version {parentDocument?.version || 1} will be archived
            </p>
          </div>

          {/* File Upload */}
          <div className="space-y-2">
            <Label>New File *</Label>
            <div className="border-2 border-dashed border-slate-300 rounded-lg p-6 text-center hover:border-blue-400 transition-colors">
              <input
                type="file"
                id="version-file-upload"
                className="hidden"
                onChange={handleFileSelect}
                accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.csv"
              />
              <label htmlFor="version-file-upload" className="cursor-pointer">
                {file ? (
                  <div className="flex items-center justify-center gap-2">
                    <Upload className="h-5 w-5 text-blue-600" />
                    <span className="text-sm font-medium text-slate-900">{file.name}</span>
                    <span className="text-xs text-slate-500">({(file.size / 1024 / 1024).toFixed(2)} MB)</span>
                  </div>
                ) : (
                  <div>
                    <Upload className="h-8 w-8 mx-auto text-slate-400 mb-2" />
                    <p className="text-sm font-medium text-slate-700">Click to upload replacement file</p>
                  </div>
                )}
              </label>
            </div>
          </div>

          {/* Version Notes */}
          <div className="space-y-2">
            <Label>Version Notes</Label>
            <Textarea
              value={versionNotes}
              onChange={(e) => setVersionNotes(e.target.value)}
              placeholder="What changed in this version..."
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={uploading}>
            Cancel
          </Button>
          <Button onClick={handleUploadVersion} disabled={uploading || !file}>
            {uploading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Uploading...
              </>
            ) : (
              'Upload Version'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}