import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload, FileText, Trash2, Download, Shield, FileCheck, Briefcase } from 'lucide-react';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const documentTypes = [
  { key: 'trade_license', label: 'Trade License', icon: FileCheck, color: 'blue' },
  { key: 'workers_comp', label: 'Workers Compensation', icon: Shield, color: 'green' },
  { key: 'public_liability', label: 'Public Liability Insurance', icon: Briefcase, color: 'purple' },
  { key: 'general_insurance', label: 'General Insurance', icon: Shield, color: 'orange' },
];

export default function ContractorDocuments({ contractor }) {
  const [uploading, setUploading] = useState('');
  const [deleteDoc, setDeleteDoc] = useState(null);
  const queryClient = useQueryClient();

  const updateMutation = useMutation({
    mutationFn: (data) => base44.entities.Contractor.update(contractor.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contractors'] });
      toast.success('Documents updated');
    },
  });

  const handleUpload = async (e, type) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(type);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      
      const currentDocs = contractor.documents || [];
      const updatedDocs = currentDocs.filter(doc => !doc.startsWith(`${type}:`));
      updatedDocs.push(`${type}:${file_url}`);
      
      updateMutation.mutate({
        ...contractor,
        documents: updatedDocs
      });
      
      toast.success('Document uploaded successfully');
    } catch (error) {
      toast.error('Failed to upload document');
    } finally {
      setUploading('');
    }
  };

  const handleDelete = () => {
    if (!deleteDoc) return;
    
    const currentDocs = contractor.documents || [];
    const updatedDocs = currentDocs.filter(doc => doc !== deleteDoc);
    
    updateMutation.mutate({
      ...contractor,
      documents: updatedDocs
    });
    
    setDeleteDoc(null);
  };

  const getDocumentUrl = (type) => {
    const docs = contractor.documents || [];
    const doc = docs.find(d => d.startsWith(`${type}:`));
    return doc ? doc.split(':')[1] : null;
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Compliance Documents</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {documentTypes.map((docType) => {
            const Icon = docType.icon;
            const docUrl = getDocumentUrl(docType.key);
            
            return (
              <div key={docType.key} className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Icon className={`h-4 w-4 text-${docType.color}-600`} />
                  {docType.label}
                </Label>
                
                {docUrl ? (
                  <div className="flex items-center gap-2">
                    <div className="flex-1 flex items-center gap-2 p-3 bg-slate-50 rounded-lg">
                      <FileText className="h-4 w-4 text-slate-500" />
                      <span className="text-sm text-slate-700 flex-1">Document uploaded</span>
                      <a 
                        href={docUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-700"
                      >
                        <Download className="h-4 w-4" />
                      </a>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setDeleteDoc(`${docType.key}:${docUrl}`)}
                        className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="relative">
                    <input
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={(e) => handleUpload(e, docType.key)}
                      className="hidden"
                      id={`upload-${docType.key}`}
                      disabled={uploading === docType.key}
                    />
                    <Button 
                      asChild 
                      variant="outline" 
                      className="w-full"
                      disabled={uploading === docType.key}
                    >
                      <label htmlFor={`upload-${docType.key}`} className="cursor-pointer">
                        <Upload className="h-4 w-4 mr-2" />
                        {uploading === docType.key ? 'Uploading...' : `Upload ${docType.label}`}
                      </label>
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Additional Documents</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {(contractor.documents || [])
              .filter(doc => !documentTypes.some(dt => doc.startsWith(`${dt.key}:`)))
              .map((doc, idx) => {
                const url = doc.includes(':') ? doc.split(':')[1] : doc;
                return (
                  <div key={idx} className="flex items-center gap-2 p-3 bg-slate-50 rounded-lg">
                    <FileText className="h-4 w-4 text-slate-500" />
                    <span className="text-sm text-slate-700 flex-1">Document {idx + 1}</span>
                    <a 
                      href={url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-700"
                    >
                      <Download className="h-4 w-4" />
                    </a>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setDeleteDoc(doc)}
                      className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                );
              })}
            
            <div className="relative mt-4">
              <input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={(e) => handleUpload(e, 'additional')}
                className="hidden"
                id="upload-additional"
                disabled={uploading === 'additional'}
              />
              <Button 
                asChild 
                variant="outline" 
                className="w-full"
                disabled={uploading === 'additional'}
              >
                <label htmlFor="upload-additional" className="cursor-pointer">
                  <Upload className="h-4 w-4 mr-2" />
                  {uploading === 'additional' ? 'Uploading...' : 'Upload Additional Document'}
                </label>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteDoc} onOpenChange={() => setDeleteDoc(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Document</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this document? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}