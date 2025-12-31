import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Upload, FileText, Trash2, Download, Shield, FileCheck, Briefcase, Eye, Calendar, Loader2, AlertCircle } from 'lucide-react';
import { Badge } from "@/components/ui/badge";
import { toast } from 'sonner';
import { format } from 'date-fns';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const documentTypes = [
  { key: 'trade_license', label: 'Trade License', icon: FileCheck, color: 'blue' },
  { key: 'workers_comp', label: 'Workers Compensation', icon: Shield, color: 'green' },
  { key: 'public_liability', label: 'Public Liability Insurance', icon: Briefcase, color: 'purple' },
  { key: 'general_insurance', label: 'General Insurance', icon: Shield, color: 'orange' },
];

export default function ContractorDocuments({ contractor }) {
  const [uploading, setUploading] = useState(false);
  const [deleteDoc, setDeleteDoc] = useState(null);
  const [viewDoc, setViewDoc] = useState(null);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [uploadForm, setUploadForm] = useState({
    title: '',
    description: '',
    category: 'other',
    expiry_date: '',
    issue_date: '',
    policy_number: '',
    notes: ''
  });
  const queryClient = useQueryClient();

  // Fetch documents for this contractor
  const { data: documents = [], isLoading } = useQuery({
    queryKey: ['contractorDocuments', contractor.id],
    queryFn: () => base44.entities.ContractorDocument.filter({ contractor_id: contractor.id }),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.ContractorDocument.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contractorDocuments', contractor.id] });
      toast.success('Document uploaded successfully');
      setUploadDialogOpen(false);
      setUploadForm({
        title: '',
        description: '',
        category: 'other',
        expiry_date: '',
        issue_date: '',
        policy_number: '',
        notes: ''
      });
    },
    onError: () => {
      toast.error('Failed to upload document');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (docId) => base44.entities.ContractorDocument.delete(docId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contractorDocuments', contractor.id] });
      toast.success('Document deleted');
      setDeleteDoc(null);
    },
    onError: () => {
      toast.error('Failed to delete document');
    }
  });

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      
      // Auto-populate title if empty
      const title = uploadForm.title || file.name;
      
      // Determine status based on expiry date
      let status = 'active';
      if (uploadForm.expiry_date) {
        const expiryDate = new Date(uploadForm.expiry_date);
        const today = new Date();
        if (expiryDate < today) {
          status = 'expired';
        }
      }
      
      await createMutation.mutateAsync({
        contractor_id: contractor.id,
        title,
        description: uploadForm.description,
        category: uploadForm.category,
        file_url,
        file_type: file.type,
        file_size: file.size,
        expiry_date: uploadForm.expiry_date || null,
        issue_date: uploadForm.issue_date || null,
        policy_number: uploadForm.policy_number || null,
        status,
        notes: uploadForm.notes || null
      });
      
    } catch (error) {
      toast.error('Failed to upload document');
    } finally {
      setUploading(false);
    }
  };

  const getDocumentsByCategory = (category) => {
    return documents.filter(doc => doc.category === category);
  };

  const getCategoryStatus = (category) => {
    const categoryDocs = getDocumentsByCategory(category);
    if (categoryDocs.length === 0) return 'missing';
    
    const hasExpired = categoryDocs.some(doc => doc.status === 'expired');
    if (hasExpired) return 'expired';
    
    // Check if expiring soon (within 30 days)
    const today = new Date();
    const hasExpiringSoon = categoryDocs.some(doc => {
      if (!doc.expiry_date) return false;
      const expiryDate = new Date(doc.expiry_date);
      const daysUntilExpiry = Math.ceil((expiryDate - today) / (1000 * 60 * 60 * 24));
      return daysUntilExpiry > 0 && daysUntilExpiry <= 30;
    });
    
    if (hasExpiringSoon) return 'expiring';
    return 'valid';
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Compliance Documents</CardTitle>
            <Button onClick={() => setUploadDialogOpen(true)}>
              <Upload className="h-4 w-4 mr-2" />
              Upload Document
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {documentTypes.map((docType) => {
            const Icon = docType.icon;
            const categoryDocs = getDocumentsByCategory(docType.key);
            const categoryStatus = getCategoryStatus(docType.key);
            
            return (
              <div key={docType.key} className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="flex items-center gap-2">
                    <Icon className={`h-4 w-4 text-${docType.color}-600`} />
                    {docType.label}
                  </Label>
                  {categoryStatus === 'missing' && (
                    <Badge variant="outline" className="text-red-600 border-red-200">
                      <AlertCircle className="h-3 w-3 mr-1" />
                      Missing
                    </Badge>
                  )}
                  {categoryStatus === 'expired' && (
                    <Badge variant="outline" className="text-red-600 border-red-200">
                      <AlertCircle className="h-3 w-3 mr-1" />
                      Expired
                    </Badge>
                  )}
                  {categoryStatus === 'expiring' && (
                    <Badge variant="outline" className="text-orange-600 border-orange-200">
                      <AlertCircle className="h-3 w-3 mr-1" />
                      Expiring Soon
                    </Badge>
                  )}
                  {categoryStatus === 'valid' && (
                    <Badge variant="outline" className="text-green-600 border-green-200">
                      <FileCheck className="h-3 w-3 mr-1" />
                      Valid
                    </Badge>
                  )}
                </div>
                
                {categoryDocs.length > 0 ? (
                  <div className="space-y-2">
                    {categoryDocs.map((doc) => (
                      <div key={doc.id} className="flex items-center gap-2 p-3 bg-slate-50 rounded-lg border">
                        <FileText className="h-4 w-4 text-slate-500" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-700 truncate">{doc.title}</p>
                          {doc.expiry_date && (
                            <p className="text-xs text-slate-500 flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              Expires: {format(new Date(doc.expiry_date), 'PP')}
                            </p>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setViewDoc(doc)}
                          className="h-8 w-8"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <a 
                          href={doc.file_url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-700"
                        >
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <Download className="h-4 w-4" />
                          </Button>
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
                    ))}
                  </div>
                ) : (
                  <div className="border-2 border-dashed border-slate-200 rounded-lg p-4 text-center">
                    <p className="text-sm text-slate-500">No {docType.label.toLowerCase()} uploaded</p>
                  </div>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Other Documents</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {documents.filter(doc => 
              !documentTypes.some(dt => dt.key === doc.category)
            ).map((doc) => (
              <div key={doc.id} className="flex items-center gap-2 p-3 bg-slate-50 rounded-lg border">
                <FileText className="h-4 w-4 text-slate-500" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-700 truncate">{doc.title}</p>
                  {doc.description && (
                    <p className="text-xs text-slate-500 truncate">{doc.description}</p>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setViewDoc(doc)}
                  className="h-8 w-8"
                >
                  <Eye className="h-4 w-4" />
                </Button>
                <a 
                  href={doc.file_url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-700"
                >
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <Download className="h-4 w-4" />
                  </Button>
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
            ))}
            
            {documents.filter(doc => !documentTypes.some(dt => dt.key === doc.category)).length === 0 && (
              <div className="border-2 border-dashed border-slate-200 rounded-lg p-8 text-center">
                <p className="text-sm text-slate-500">No additional documents</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Upload Dialog */}
      <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Upload Document</DialogTitle>
            <DialogDescription>
              Add a new document for {contractor.company_name}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Document Title</Label>
              <Input
                placeholder="e.g., Public Liability Insurance 2024"
                value={uploadForm.title}
                onChange={(e) => setUploadForm({ ...uploadForm, title: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>Category</Label>
              <Select
                value={uploadForm.category}
                onValueChange={(value) => setUploadForm({ ...uploadForm, category: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {documentTypes.map(type => (
                    <SelectItem key={type.key} value={type.key}>
                      {type.label}
                    </SelectItem>
                  ))}
                  <SelectItem value="contract">Contract</SelectItem>
                  <SelectItem value="certificate">Certificate</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Issue Date</Label>
                <Input
                  type="date"
                  value={uploadForm.issue_date}
                  onChange={(e) => setUploadForm({ ...uploadForm, issue_date: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Expiry Date</Label>
                <Input
                  type="date"
                  value={uploadForm.expiry_date}
                  onChange={(e) => setUploadForm({ ...uploadForm, expiry_date: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Policy/Certificate Number</Label>
              <Input
                placeholder="e.g., POL-123456"
                value={uploadForm.policy_number}
                onChange={(e) => setUploadForm({ ...uploadForm, policy_number: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                placeholder="Additional details..."
                value={uploadForm.description}
                onChange={(e) => setUploadForm({ ...uploadForm, description: e.target.value })}
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label>Select File *</Label>
              <Input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={handleUpload}
                disabled={uploading}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setUploadDialogOpen(false)}>
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Document Dialog */}
      <Dialog open={!!viewDoc} onOpenChange={() => setViewDoc(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{viewDoc?.title}</DialogTitle>
            <DialogDescription>
              Document details
            </DialogDescription>
          </DialogHeader>
          
          {viewDoc && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs text-slate-500">Category</Label>
                  <p className="font-medium capitalize">{viewDoc.category.replace(/_/g, ' ')}</p>
                </div>
                <div>
                  <Label className="text-xs text-slate-500">Status</Label>
                  <Badge variant={viewDoc.status === 'expired' ? 'destructive' : 'default'}>
                    {viewDoc.status}
                  </Badge>
                </div>
                {viewDoc.issue_date && (
                  <div>
                    <Label className="text-xs text-slate-500">Issue Date</Label>
                    <p className="font-medium">{format(new Date(viewDoc.issue_date), 'PP')}</p>
                  </div>
                )}
                {viewDoc.expiry_date && (
                  <div>
                    <Label className="text-xs text-slate-500">Expiry Date</Label>
                    <p className="font-medium">{format(new Date(viewDoc.expiry_date), 'PP')}</p>
                  </div>
                )}
                {viewDoc.policy_number && (
                  <div>
                    <Label className="text-xs text-slate-500">Policy Number</Label>
                    <p className="font-medium">{viewDoc.policy_number}</p>
                  </div>
                )}
                <div>
                  <Label className="text-xs text-slate-500">File Size</Label>
                  <p className="font-medium">{(viewDoc.file_size / 1024 / 1024).toFixed(2)} MB</p>
                </div>
              </div>
              
              {viewDoc.description && (
                <div>
                  <Label className="text-xs text-slate-500">Description</Label>
                  <p className="text-sm mt-1">{viewDoc.description}</p>
                </div>
              )}
              
              {viewDoc.notes && (
                <div>
                  <Label className="text-xs text-slate-500">Notes</Label>
                  <p className="text-sm mt-1">{viewDoc.notes}</p>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setViewDoc(null)}>
              Close
            </Button>
            <Button onClick={() => window.open(viewDoc?.file_url, '_blank')}>
              <Download className="h-4 w-4 mr-2" />
              Download
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteDoc} onOpenChange={() => setDeleteDoc(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Document</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deleteDoc?.title}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => deleteMutation.mutate(deleteDoc.id)} 
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}