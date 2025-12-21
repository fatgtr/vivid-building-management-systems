import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import PageHeader from '@/components/common/PageHeader';
import EmptyState from '@/components/common/EmptyState';
import StatusBadge from '@/components/common/StatusBadge';
import { FileText, Search, Building2, MoreVertical, Pencil, Trash2, Download, Upload, Eye, File, FileImage, FileArchive, Folder, ChevronDown, ChevronRight, Scan, History, FileUp, Loader2, CheckCircle2, AlertCircle, Wrench } from 'lucide-react';
import { toast } from 'sonner';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { format } from 'date-fns';
import AsBuiltMechanicalExtractor from '@/components/buildings/AsBuiltMechanicalExtractor';

const documentCategories = [
  { value: 'strata_roll', label: 'Strata Roll', icon: FileText },
  { value: 'subdivision_plan', label: 'Subdivision Plan', icon: FileText },
  { value: 'bylaws', label: 'By-Laws', icon: FileText },
  { value: 'strata_management_statement', label: 'Strata Management Statement', icon: FileText },
  { value: 'afss_documentation', label: 'AFSS Documentation', icon: FileText },
  { value: 'as_built_electrical', label: 'As-Built Electrical Plans', icon: FileText },
  { value: 'as_built_mechanical', label: 'As-Built Mechanical Plans', icon: FileText },
  { value: 'as_built_plumbing', label: 'As-Built Plumbing Plans', icon: FileText },
  { value: 'as_built_windows', label: 'As-Built Windows Plans', icon: FileText },
  { value: 'lift_plant_registration', label: 'Lift Plant Registration', icon: FileText },
  { value: 'policy', label: 'Policy', icon: FileText },
  { value: 'manual', label: 'Manual', icon: FileText },
  { value: 'form', label: 'Form', icon: FileText },
  { value: 'report', label: 'Report', icon: FileText },
  { value: 'certificate', label: 'Certificate', icon: FileText },
  { value: 'contract', label: 'Contract', icon: FileText },
  { value: 'meeting_minutes', label: 'Meeting Minutes', icon: FileText },
  { value: 'financial', label: 'Financial', icon: FileText },
  { value: 'other', label: 'Other', icon: File },
];

const initialFormState = {
  building_id: '',
  title: '',
  description: '',
  category: 'other',
  file_url: '',
  visibility: 'residents_only',
  expiry_date: '',
  status: 'active',
};

export default function Documents() {
  const [showDialog, setShowDialog] = useState(false);
  const [editingDocument, setEditingDocument] = useState(null);
  const [formData, setFormData] = useState(initialFormState);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterBuilding, setFilterBuilding] = useState('all');
  const [filterCategory, setFilterCategory] = useState('all');
  const [deleteDocument, setDeleteDocument] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState({});
  const [versionDialog, setVersionDialog] = useState(null);
  const [versionNotes, setVersionNotes] = useState('');
  const [uploadingVersion, setUploadingVersion] = useState(false);
  const [ocrProcessing, setOcrProcessing] = useState({});
  const [showAsBuiltExtractor, setShowAsBuiltExtractor] = useState(false);

  const queryClient = useQueryClient();

  const { data: documents = [], isLoading } = useQuery({
    queryKey: ['documents'],
    queryFn: () => base44.entities.Document.list('-created_date'),
  });

  const { data: buildings = [] } = useQuery({
    queryKey: ['buildings'],
    queryFn: () => base44.entities.Building.list(),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Document.create(data),
    onSuccess: async (newDoc) => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      handleCloseDialog();
      
      // Trigger OCR processing
      setOcrProcessing(prev => ({ ...prev, [newDoc.id]: true }));
      toast.info('Processing document for searchable text...');
      
      try {
        await base44.functions.invoke('processDocumentOCR', { documentId: newDoc.id });
        queryClient.invalidateQueries({ queryKey: ['documents'] });
        setOcrProcessing(prev => ({ ...prev, [newDoc.id]: false }));
        toast.success('Document indexed successfully');
      } catch (error) {
        setOcrProcessing(prev => ({ ...prev, [newDoc.id]: false }));
        toast.error('Failed to index document');
      }
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Document.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      handleCloseDialog();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Document.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      setDeleteDocument(null);
    },
  });

  const createVersionMutation = useMutation({
    mutationFn: async ({ originalDocumentId, newFileUrl, versionNotes }) => {
      const { data } = await base44.functions.invoke('createDocumentVersion', {
        originalDocumentId,
        newFileUrl,
        versionNotes
      });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      setVersionDialog(null);
      setVersionNotes('');
      toast.success('New version created and processing');
    },
  });

  const handleCloseDialog = () => {
    setShowDialog(false);
    setEditingDocument(null);
    setFormData(initialFormState);
  };

  const handleEdit = (document) => {
    setEditingDocument(document);
    setFormData({
      building_id: document.building_id || '',
      title: document.title || '',
      description: document.description || '',
      category: document.category || 'other',
      file_url: document.file_url || '',
      visibility: document.visibility || 'residents_only',
      expiry_date: document.expiry_date || '',
      status: document.status || 'active',
    });
    setShowDialog(true);
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setFormData({ ...formData, file_url, title: formData.title || file.name.replace(/\.[^/.]+$/, '') });
    setUploading(false);
  };

  const handleVersionUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !versionDialog) return;
    
    setUploadingVersion(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      await createVersionMutation.mutateAsync({
        originalDocumentId: versionDialog.id,
        newFileUrl: file_url,
        versionNotes
      });
    } catch (error) {
      toast.error('Failed to create version');
    }
    setUploadingVersion(false);
  };

  const getDocumentVersions = (doc) => {
    const parentId = doc.parent_document_id || doc.id;
    return documents.filter(d => 
      d.parent_document_id === parentId || d.id === parentId
    ).sort((a, b) => (b.version || 1) - (a.version || 1));
  };

  const retriggerOCR = async (docId) => {
    setOcrProcessing(prev => ({ ...prev, [docId]: true }));
    toast.info('Re-processing document...');
    
    try {
      await base44.functions.invoke('processDocumentOCR', { documentId: docId });
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      setOcrProcessing(prev => ({ ...prev, [docId]: false }));
      toast.success('Document re-indexed successfully');
    } catch (error) {
      setOcrProcessing(prev => ({ ...prev, [docId]: false }));
      toast.error('Failed to re-index document');
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (editingDocument) {
      updateMutation.mutate({ id: editingDocument.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const getBuildingName = (buildingId) => buildings.find(b => b.id === buildingId)?.name || 'All Buildings';

  const isPDF = (url) => url?.toLowerCase().includes('.pdf');

  const getFileIcon = (url) => {
    if (!url) return File;
    if (url.includes('.pdf')) return FileText;
    if (url.includes('.jpg') || url.includes('.png') || url.includes('.jpeg')) return FileImage;
    if (url.includes('.zip') || url.includes('.rar')) return FileArchive;
    return File;
  };

  const filteredDocuments = documents.filter(d => {
    const matchesSearch = d.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         d.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         d.ocr_content?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesBuilding = filterBuilding === 'all' || d.building_id === filterBuilding;
    const matchesCategory = filterCategory === 'all' || d.category === filterCategory;
    const isLatestVersion = !d.parent_document_id || d.status === 'active';
    return matchesSearch && matchesBuilding && matchesCategory && isLatestVersion;
  });

  const documentsByCategory = filteredDocuments.reduce((acc, doc) => {
    const category = doc.category || 'other';
    if (!acc[category]) acc[category] = [];
    acc[category].push(doc);
    return acc;
  }, {});

  const toggleCategory = (category) => {
    setExpandedCategories(prev => ({
      ...prev,
      [category]: !prev[category]
    }));
  };

  if (isLoading) {
    return (
      <div className="space-y-8">
        <PageHeader title="Documents" subtitle="Manage building documents" />
        <Skeleton className="h-96 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Documents" 
        subtitle={`${documents.length} documents`}
        action={() => setShowDialog(true)}
        actionLabel="Upload Document"
        actionIcon={Upload}
      />

      {/* Filters */}
      <div className="flex flex-wrap gap-4">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search documents..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={filterBuilding} onValueChange={setFilterBuilding}>
          <SelectTrigger className="w-[200px]">
            <Building2 className="h-4 w-4 mr-2 text-slate-400" />
            <SelectValue placeholder="All Buildings" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Buildings</SelectItem>
            {buildings.map(b => (
              <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterCategory} onValueChange={setFilterCategory}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="All Categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {documentCategories.map(c => (
              <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {filteredDocuments.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="No documents"
          description="Upload documents to share with residents and staff"
          action={() => setShowDialog(true)}
          actionLabel="Upload Document"
        />
      ) : (
        <div className="space-y-4">
          {documentCategories.map(categoryConfig => {
            const categoryDocs = documentsByCategory[categoryConfig.value] || [];
            if (categoryDocs.length === 0) return null;
            
            const isExpanded = expandedCategories[categoryConfig.value];
            const CategoryIcon = categoryConfig.icon;
            
            return (
              <Card key={categoryConfig.value} className="border-0 shadow-sm overflow-hidden">
                <button
                  onClick={() => toggleCategory(categoryConfig.value)}
                  className="w-full p-4 flex items-center justify-between hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-50 rounded-lg">
                      <Folder className="h-5 w-5 text-blue-600" />
                    </div>
                    <div className="text-left">
                      <h3 className="font-semibold text-slate-900">{categoryConfig.label}</h3>
                      <p className="text-sm text-slate-500">{categoryDocs.length} document{categoryDocs.length !== 1 ? 's' : ''}</p>
                    </div>
                  </div>
                  {isExpanded ? (
                    <ChevronDown className="h-5 w-5 text-slate-400" />
                  ) : (
                    <ChevronRight className="h-5 w-5 text-slate-400" />
                  )}
                </button>
                
                {isExpanded && (
                  <div className="border-t border-slate-100">
                    {categoryConfig.value === 'as_built_mechanical' && (
                      <div className="p-4 bg-slate-50 border-b border-slate-100">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <Wrench className="h-4 w-4 text-blue-600" />
                            <h4 className="font-medium text-slate-900">AI Asset Extractor</h4>
                          </div>
                          <Button 
                            size="sm"
                            variant={showAsBuiltExtractor ? "outline" : "default"}
                            onClick={() => setShowAsBuiltExtractor(!showAsBuiltExtractor)}
                            className={!showAsBuiltExtractor ? "bg-blue-600 hover:bg-blue-700" : ""}
                          >
                            {showAsBuiltExtractor ? 'Hide' : 'Extract Assets from Drawing'}
                          </Button>
                        </div>
                        {showAsBuiltExtractor && (
                          <AsBuiltMechanicalExtractor 
                            buildingId={filterBuilding !== 'all' ? filterBuilding : null}
                            onComplete={() => setShowAsBuiltExtractor(false)}
                          />
                        )}
                      </div>
                    )}
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-slate-50">
                          <TableHead>Document</TableHead>
                          <TableHead>Building</TableHead>
                          <TableHead>Visibility</TableHead>
                          <TableHead>Uploaded</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>OCR</TableHead>
                          <TableHead className="w-24">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {categoryDocs.map((doc) => {
                          const FileIcon = getFileIcon(doc.file_url);
                          const versions = getDocumentVersions(doc);
                          const hasVersions = versions.length > 1;
                          
                          return (
                            <TableRow key={doc.id} className="hover:bg-slate-50/50">
                              <TableCell>
                                <div className="flex items-center gap-3">
                                  <div className="p-2 bg-blue-50 rounded-lg">
                                    <FileIcon className="h-5 w-5 text-blue-600" />
                                  </div>
                                  <div>
                                    <div className="flex items-center gap-2">
                                      <p className="font-medium text-slate-900">{doc.title}</p>
                                      {hasVersions && (
                                        <span className="text-xs px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded">
                                          v{doc.version || 1}
                                        </span>
                                      )}
                                    </div>
                                    {doc.description && (
                                      <p className="text-xs text-slate-500 line-clamp-1">{doc.description}</p>
                                    )}
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell>
                                <span className="text-slate-600">{getBuildingName(doc.building_id)}</span>
                              </TableCell>
                              <TableCell>
                                <span className="capitalize text-slate-600 text-sm">{doc.visibility?.replace(/_/g, ' ')}</span>
                              </TableCell>
                              <TableCell>
                                <span className="text-sm text-slate-500">
                                  {doc.created_date && format(new Date(doc.created_date), 'MMM d, yyyy')}
                                </span>
                              </TableCell>
                              <TableCell>
                                <StatusBadge status={doc.status} />
                              </TableCell>
                              <TableCell>
                                {ocrProcessing[doc.id] ? (
                                  <div className="flex items-center gap-1 text-xs text-blue-600">
                                    <Loader2 className="h-3 w-3 animate-spin" />
                                    <span>Processing</span>
                                  </div>
                                ) : doc.ocr_status === 'completed' ? (
                                  <div className="flex items-center gap-1 text-xs text-emerald-600">
                                    <CheckCircle2 className="h-3 w-3" />
                                    <span>Indexed</span>
                                  </div>
                                ) : doc.ocr_status === 'failed' ? (
                                  <div className="flex items-center gap-1 text-xs text-red-600">
                                    <AlertCircle className="h-3 w-3" />
                                    <span>Failed</span>
                                  </div>
                                ) : (
                                  <span className="text-xs text-slate-400">Pending</span>
                                )}
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-1">
                                  {doc.file_url && (
                                    <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                                      <a href={doc.file_url} target="_blank" rel="noopener noreferrer">
                                        <Eye className="h-4 w-4 text-slate-500" />
                                      </a>
                                    </Button>
                                  )}
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button variant="ghost" size="icon" className="h-8 w-8">
                                        <MoreVertical className="h-4 w-4" />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                      {doc.file_url && (
                                        <DropdownMenuItem asChild>
                                          <a href={doc.file_url} download>
                                            <Download className="mr-2 h-4 w-4" /> Download
                                          </a>
                                        </DropdownMenuItem>
                                      )}
                                      <DropdownMenuItem onClick={() => setVersionDialog(doc)}>
                                        <FileUp className="mr-2 h-4 w-4" /> Upload New Version
                                      </DropdownMenuItem>
                                      {hasVersions && (
                                        <DropdownMenuItem onClick={() => setVersionDialog({ ...doc, viewMode: true })}>
                                          <History className="mr-2 h-4 w-4" /> View Versions ({versions.length})
                                        </DropdownMenuItem>
                                      )}
                                      {doc.ocr_status !== 'processing' && (
                                        <DropdownMenuItem onClick={() => retriggerOCR(doc.id)}>
                                          <Scan className="mr-2 h-4 w-4" /> 
                                          {doc.ocr_status === 'completed' ? 'Re-index' : 'Index'} Document
                                        </DropdownMenuItem>
                                      )}
                                      <DropdownMenuItem onClick={() => handleEdit(doc)}>
                                        <Pencil className="mr-2 h-4 w-4" /> Edit
                                      </DropdownMenuItem>
                                      <DropdownMenuItem onClick={() => setDeleteDocument(doc)} className="text-red-600">
                                        <Trash2 className="mr-2 h-4 w-4" /> Delete
                                      </DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingDocument ? 'Edit Document' : 'Upload Document'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            {!editingDocument && (
              <div>
                <Label>File</Label>
                <div className="mt-1">
                  <Input
                    type="file"
                    onChange={handleFileUpload}
                    disabled={uploading}
                    className="cursor-pointer"
                  />
                  {uploading && <p className="text-sm text-slate-500 mt-1">Uploading...</p>}
                  {formData.file_url && !uploading && (
                    <p className="text-sm text-emerald-600 mt-1">✓ File uploaded</p>
                  )}
                </div>
              </div>
            )}
            <div>
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                required
              />
            </div>
            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={2}
              />
            </div>
            <div>
              <Label htmlFor="building_id">Building</Label>
              <Select value={formData.building_id} onValueChange={(v) => setFormData({ ...formData, building_id: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="All Buildings" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={null}>All Buildings</SelectItem>
                  {buildings.map(b => (
                    <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="category">Category *</Label>
              <Select value={formData.category} onValueChange={(v) => setFormData({ ...formData, category: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {documentCategories.map(c => (
                    <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="visibility">Visibility</Label>
              <Select value={formData.visibility} onValueChange={(v) => setFormData({ ...formData, visibility: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="public">Public</SelectItem>
                  <SelectItem value="residents_only">Residents Only</SelectItem>
                  <SelectItem value="owners_only">Owners Only</SelectItem>
                  <SelectItem value="staff_only">Staff Only</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="expiry_date">Expiry Date</Label>
              <Input
                id="expiry_date"
                type="date"
                value={formData.expiry_date}
                onChange={(e) => setFormData({ ...formData, expiry_date: e.target.value })}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleCloseDialog}>Cancel</Button>
              <Button type="submit" className="bg-blue-600 hover:bg-blue-700" disabled={createMutation.isPending || updateMutation.isPending || uploading}>
                {createMutation.isPending || updateMutation.isPending ? 'Saving...' : (editingDocument ? 'Update' : 'Upload')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Version Management Dialog */}
      <Dialog open={!!versionDialog} onOpenChange={() => { setVersionDialog(null); setVersionNotes(''); }}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {versionDialog?.viewMode ? 'Version History' : 'Upload New Version'}
            </DialogTitle>
          </DialogHeader>
          
          {versionDialog?.viewMode ? (
            <div className="space-y-4">
              <p className="text-sm text-slate-600">
                All versions of "{versionDialog.title}"
              </p>
              <div className="space-y-2">
                {getDocumentVersions(versionDialog).map((version, idx) => (
                  <Card key={version.id} className="border-0 shadow-sm">
                    <div className="p-4 flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold text-slate-900">
                            Version {version.version || 1}
                          </span>
                          {idx === 0 && (
                            <span className="text-xs px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded">
                              Current
                            </span>
                          )}
                          {version.ocr_status === 'completed' && (
                            <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                          )}
                        </div>
                        <p className="text-sm text-slate-600">
                          {format(new Date(version.created_date), 'MMM d, yyyy h:mm a')}
                        </p>
                        {version.version_notes && (
                          <p className="text-xs text-slate-500 mt-1">{version.version_notes}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Button variant="ghost" size="sm" asChild>
                          <a href={version.file_url} target="_blank" rel="noopener noreferrer">
                            <Eye className="h-4 w-4" />
                          </a>
                        </Button>
                        <Button variant="ghost" size="sm" asChild>
                          <a href={version.file_url} download>
                            <Download className="h-4 w-4" />
                          </a>
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-slate-600">
                Upload a new version of "{versionDialog?.title}". The previous version will be archived.
              </p>
              <div>
                <Label>New File *</Label>
                <Input
                  type="file"
                  onChange={handleVersionUpload}
                  disabled={uploadingVersion}
                  className="cursor-pointer mt-1"
                />
              </div>
              <div>
                <Label htmlFor="version_notes">Version Notes</Label>
                <Textarea
                  id="version_notes"
                  value={versionNotes}
                  onChange={(e) => setVersionNotes(e.target.value)}
                  placeholder="Describe what changed in this version..."
                  rows={3}
                />
              </div>
              {uploadingVersion && (
                <div className="flex items-center gap-2 text-sm text-blue-600">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Creating new version and indexing...</span>
                </div>
              )}
            </div>
          )}
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => { setVersionDialog(null); setVersionNotes(''); }}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteDocument} onOpenChange={() => setDeleteDocument(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Document</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deleteDocument?.title}"?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteMutation.mutate(deleteDocument.id)} className="bg-red-600 hover:bg-red-700">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}