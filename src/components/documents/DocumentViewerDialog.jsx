import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, ExternalLink, Sparkles, Loader2, FileText, FileImage, File } from 'lucide-react';
import { format } from 'date-fns';
import StatusBadge from '@/components/common/StatusBadge';

const getFileIcon = (url) => {
  if (!url) return File;
  if (url.includes('.pdf')) return FileText;
  if (url.includes('.jpg') || url.includes('.png') || url.includes('.jpeg')) return FileImage;
  return File;
};

export default function DocumentViewerDialog({
  document: doc,
  open,
  onOpenChange,
  buildingName,
  onGenerateSummary,
  generatingSummary,
}) {
  if (!doc) return null;

  const FileIcon = getFileIcon(doc.file_url);
  const isPDF = doc.file_url?.toLowerCase().includes('.pdf');
  const isImage = doc.file_url?.toLowerCase().match(/\.(jpg|jpeg|png|gif|webp)$/);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 pr-8">
            <FileIcon className="h-5 w-5 text-blue-600 flex-shrink-0" />
            <span className="truncate">{doc.title}</span>
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4">
          {/* Metadata chips */}
          <div className="flex flex-wrap gap-2 text-xs">
            <Badge variant="outline" className="capitalize">{doc.category?.replace(/_/g, ' ')}</Badge>
            <Badge variant="outline" className="capitalize">{doc.visibility?.replace(/_/g, ' ')}</Badge>
            <StatusBadge status={doc.status} />
            {buildingName && <Badge variant="secondary">{buildingName}</Badge>}
            {doc.created_date && (
              <span className="text-slate-500 self-center">
                Uploaded {format(new Date(doc.created_date), 'MMM d, yyyy')}
              </span>
            )}
          </div>

          {doc.description && (
            <p className="text-sm text-slate-600">{doc.description}</p>
          )}

          {/* File preview */}
          {doc.file_url ? (
            <div className="border border-slate-200 rounded-lg overflow-hidden bg-slate-50">
              {isPDF ? (
                <iframe
                  src={doc.file_url}
                  title={doc.title}
                  className="w-full h-[55vh]"
                />
              ) : isImage ? (
                <img
                  src={doc.file_url}
                  alt={doc.title}
                  className="max-w-full max-h-[55vh] mx-auto object-contain"
                />
              ) : (
                <div className="p-8 text-center">
                  <File className="h-12 w-12 text-slate-400 mx-auto mb-3" />
                  <p className="text-sm text-slate-600 mb-4">
                    Preview is not available for this file type.
                  </p>
                  <Button asChild>
                    <a href={doc.file_url} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Open File
                    </a>
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <div className="p-8 text-center text-sm text-slate-500 border border-dashed rounded-lg">
              No file attached to this document.
            </div>
          )}

          {/* AI Summary section */}
          {doc.ai_summary ? (
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-100">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="h-4 w-4 text-blue-600" />
                <h4 className="font-semibold text-slate-900 text-sm">AI Summary</h4>
              </div>
              <div className="prose prose-sm max-w-none text-slate-700">
                {doc.ai_summary.split('\n').map((line, idx) => {
                  if (line.startsWith('## ')) {
                    return <h5 key={idx} className="font-semibold text-slate-900 mt-2 mb-1">{line.replace('## ', '')}</h5>;
                  } else if (line.startsWith('- ')) {
                    return <li key={idx} className="ml-4 text-sm">{line.replace('- ', '')}</li>;
                  } else if (line.trim()) {
                    return <p key={idx} className="mb-1 text-sm">{line}</p>;
                  }
                  return null;
                })}
              </div>
              {doc.ai_summary_generated_date && (
                <p className="text-[10px] text-slate-500 mt-2">
                  Generated {format(new Date(doc.ai_summary_generated_date), 'PPp')}
                </p>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-between p-3 border border-dashed border-blue-200 rounded-lg bg-blue-50/50">
              <p className="text-sm text-slate-600 flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-blue-500" />
                No AI summary yet.
              </p>
              <Button
                size="sm"
                variant="outline"
                onClick={() => onGenerateSummary?.(doc.id)}
                disabled={generatingSummary === doc.id}
              >
                {generatingSummary === doc.id ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Generating...</>
                ) : (
                  <><Sparkles className="h-4 w-4 mr-2" /> Generate AI Summary</>
                )}
              </Button>
            </div>
          )}

          {doc.tags && doc.tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {doc.tags.map(tag => (
                <Badge key={tag} variant="secondary" className="text-xs">{tag}</Badge>
              ))}
            </div>
          )}
        </div>

        <DialogFooter className="flex-shrink-0">
          <Button variant="outline" asChild>
            <a href={doc.file_url} download>
              <Download className="h-4 w-4 mr-2" /> Download
            </a>
          </Button>
          <Button variant="outline" asChild>
            <a href={doc.file_url} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-4 w-4 mr-2" /> Open in New Tab
            </a>
          </Button>
          <Button variant="default" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}