import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useBuildingContext } from '@/components/BuildingContext';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import PageHeader from '@/components/common/PageHeader';
import EmptyState from '@/components/common/EmptyState';
import StatusBadge from '@/components/common/StatusBadge';
import DocumentUploadDialog from '@/components/documents/DocumentUploadDialog';
import DocumentVersionDialog from '@/components/documents/DocumentVersionDialog';
import { FileText, Search, Building2, MoreVertical, Trash2, Download, Upload, Eye, File, FileImage, FileArchive, Folder, ChevronDown, ChevronRight, Scan, History, FileUp, Loader2, CheckCircle2, AlertCircle, Wrench, Tag, Sparkles, FileSearch, ChevronUp } from 'lucide-react';
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
import { ASSET_CATEGORIES } from '@/components/categories/assetCategories';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Pencil } from 'lucide-react';

// Priority categories that appear at the top
const priorityCategories = [
  { value: 'subdivision_plan', label: 'Subdivision Plan', icon: FileText, color: 'bg-purple-50 border-purple-200 text-purple-700' },
  { value: 'strata_roll', label: 'Strata Roll', icon: FileText, color: 'bg-blue-50 border-blue-200 text-blue-700' },
  { value: 'bylaws', label: 'By-Laws', icon: FileText, color: 'bg-green-50 border-green-200 text-green-700' },
  { value: 'strata_management_statement', label: 'Strata Management Statement', icon: FileText, color: 'bg-amber-50 border-amber-200 text-amber-700' },
];

// Build document categories from asset categories
const assetDocumentCategories = Object.entries(ASSET_CATEGORIES).map(([key, category]) => ({
  value: key,
  label: category.label,
  icon: category.icon,
  color: category.color,
  subcategories: category.subcategories
}));

const documentCategories = [
  ...priorityCategories,
  ...assetDocumentCategories,
  { value: 'other', label: 'Other Documents', icon: File, color: 'bg-slate-50 border-slate-200 text-slate-700' },
];

export default function Documents() {
  const { selectedBuildingId } = useBuildingContext();
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterBuilding, setFilterBuilding] = useState('all');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterVisibility, setFilterVisibility] = useState('all');
  const [deleteDocument, setDeleteDocument] = useState(null);
  const [expandedCategories, setExpandedCategories] = useState({});
  const [versionDialog, setVersionDialog] = useState(null);
  const [viewingVersions, setViewingVersions] = useState(null);
  const [ocrProcessing, setOcrProcessing] = useState({});
  const [showAsBuiltExtractor, setShowAsBuiltExtractor] = useState(false);
  const [editingDocument, setEditingDocument] = useState(null);
  const [expandedSummaries, setExpandedSummaries] = useState({});
  const [generatingSummary, setGeneratingSummary] = useState(null);

  const queryClient = useQueryClient();

  const { data: documents = [], isLoading } = useQuery({
    queryKey: ['documents'],
    queryFn: () => base44.entities.Document.list('-created_date'),
  });

  const { data: buildings = [] } = useQuery({
    queryKey: ['buildings'],
    queryFn: () => base44.entities.Building.list(),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Document.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      setDeleteDocument(null);
      toast.success('Document deleted successfully');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Document.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      setEditingDocument(null);
      toast.success('Document updated successfully');
    },
  });

  const handleEdit = (doc) => {
    setEditingDocument(doc);
  };

  const generateSummaryMutation = useMutation({
    mutationFn: async (documentId) => {
      const { data } = await base44.functions.invoke('generateDocumentSummary', {
        document_id: documentId
      });
      return data;
    },
    onSuccess: (data, documentId) => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      setGeneratingSummary(null);
      setExpandedSummaries({ ...expandedSummaries, [documentId]: true });
      toast.success('Summary generated successfully');
    },
    onError: () => {
      setGeneratingSummary(null);
      toast.error('Failed to generate summary');
    }
  });

  const handleGenerateSummary = (docId) => {
    setGeneratingSummary(docId);
    generateSummaryMutation.mutate(docId);
  };

  const toggleSummary = (docId) => {
    setExpandedSummaries({
      ...expandedSummaries,
      [docId]: !expandedSummaries[docId]
    });
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

  const handleDocumentUploaded = async (newDoc) => {
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
      console.error('Failed to index document:', error);
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
                         d.ocr_content?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         d.tags?.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesBuilding = filterBuilding === 'all' || d.building_id === filterBuilding;
    const matchesCategory = filterCategory === 'all' || d.category === filterCategory;
    const matchesVisibility = filterVisibility === 'all' || d.visibility === filterVisibility;
    const isLatestVersion = !d.parent_document_id || d.status === 'active';
    return matchesSearch && matchesBuilding && matchesCategory && matchesVisibility && isLatestVersion;
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
        subtitle={`${filteredDocuments.length} of ${documents.length} documents`}
        action={() => setShowUploadDialog(true)}
        actionLabel="Upload Document"
        actionIcon={Upload}
      />

      {/* Filters */}
      <div className="flex flex-wrap gap-4">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search by title, description, tags, or content..."
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
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All Categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {documentCategories.map(c => (
              <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterVisibility} onValueChange={setFilterVisibility}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="All Visibility" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Visibility</SelectItem>
            <SelectItem value="public">Public</SelectItem>
            <SelectItem value="residents_only">Residents Only</SelectItem>
            <SelectItem value="owners_only">Owners Only</SelectItem>
            <SelectItem value="staff_only">Staff Only</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {filteredDocuments.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="No documents found"
          description={searchQuery ? "Try adjusting your search or filters" : "Upload documents to get started"}
          action={() => setShowUploadDialog(true)}
          actionLabel="Upload Document"
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {documentCategories.map(categoryConfig => {
            const categoryDocs = documentsByCategory[categoryConfig.value] || [];
            const CategoryIcon = categoryConfig.icon;
            const hasAIAgent = ['subdivision_plan', 'strata_roll', 'bylaws', 'strata_management_statement'].includes(categoryConfig.value) || categoryConfig.subcategories;
            
            return (
              <Card 
                key={categoryConfig.value} 
                className={`border-2 shadow-sm hover:shadow-md transition-all cursor-pointer ${categoryConfig.color || 'bg-white border-slate-200'}`}
                onClick={() => toggleCategory(categoryConfig.value)}
              >
                <div className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div className={`p-3 rounded-xl ${categoryConfig.color || 'bg-slate-100'}`}>
                      <CategoryIcon className="h-6 w-6" />
                    </div>
                    {hasAIAgent && (
                      <Badge variant="secondary" className="text-xs">
                        AI Agent
                      </Badge>
                    )}
                  </div>
                  <h3 className="font-bold text-slate-900 mb-1 line-clamp-2">{categoryConfig.label}</h3>
                  <p className="text-2xl font-bold mb-1">{categoryDocs.length}</p>
                  <p className="text-xs text-slate-600">document{categoryDocs.length !== 1 ? 's' : ''}</p>
                  {categoryConfig.subcategories && (
                    <p className="text-xs text-slate-500 mt-2">{categoryConfig.subcategories.length} subcategories</p>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Expanded Category View */}
      {Object.keys(expandedCategories).some(key => expandedCategories[key]) && (
        <div className="space-y-4 mt-8">
          {documentCategories.map(categoryConfig => {
            const categoryDocs = documentsByCategory[categoryConfig.value] || [];
            const isExpanded = expandedCategories[categoryConfig.value];
            if (!isExpanded) return null;
            
            const CategoryIcon = categoryConfig.icon;
            
            return (
              <Card key={`expanded-${categoryConfig.value}`} className="border-0 shadow-sm overflow-hidden">
                <button
                  onClick={() => toggleCategory(categoryConfig.value)}
                  className="w-full p-4 flex items-center justify-between hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${categoryConfig.color || 'bg-blue-50'}`}>
                      <CategoryIcon className="h-5 w-5" />
                    </div>
                    <div className="text-left">
                      <h3 className="font-semibold text-slate-900">{categoryConfig.label}</h3>
                      <p className="text-sm text-slate-500">{categoryDocs.length} document{categoryDocs.length !== 1 ? 's' : ''}</p>
                    </div>
                  </div>
                  <ChevronDown className="h-5 w-5 text-slate-400" />
                </button>
                
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
                                  <div className="flex-1 min-w-0">
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
                                    {doc.tags && doc.tags.length > 0 && (
                                     <div className="flex gap-1 mt-1">
                                       {doc.tags.slice(0, 3).map(tag => (
                                         <Badge key={tag} variant="secondary" className="text-xs">
                                           {tag}
                                         </Badge>
                                       ))}
                                       {doc.tags.length > 3 && (
                                         <span className="text-xs text-slate-500">+{doc.tags.length - 3}</span>
                                       )}
                                     </div>
                                    )}
                                    {doc.ai_summary && (
                                     <button
                                       onClick={(e) => {
                                         e.stopPropagation();
                                         toggleSummary(doc.id);
                                       }}
                                       className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 mt-1"
                                     >
                                       <Sparkles className="h-3 w-3" />
                                       AI Summary
                                       {expandedSummaries[doc.id] ? (
                                         <ChevronUp className="h-3 w-3" />
                                       ) : (
                                         <ChevronDown className="h-3 w-3" />
                                       )}
                                     </button>
                                    )}
                                    </div>
                                    </div>
                                    {doc.ai_summary && expandedSummaries[doc.id] && (
                                    <div className="mt-2 p-3 bg-blue-50 rounded-lg border border-blue-100" onClick={(e) => e.stopPropagation()}>
                                    <div className="prose prose-sm max-w-none text-slate-700 text-xs">
                                     {doc.ai_summary.split('\n').map((line, idx) => {
                                       if (line.startsWith('## ')) {
                                         return <h4 key={idx} className="font-semibold text-slate-900 mt-1 mb-0.5 text-xs">{line.replace('## ', '')}</h4>;
                                       } else if (line.startsWith('- ')) {
                                         return <li key={idx} className="ml-3 text-xs">{line.replace('- ', '')}</li>;
                                       } else if (line.trim()) {
                                         return <p key={idx} className="mb-0.5 text-xs">{line}</p>;
                                       }
                                       return null;
                                     })}
                                    </div>
                                    <p className="text-[10px] text-slate-500 mt-1">
                                     Generated {format(new Date(doc.ai_summary_generated_date), 'PPp')}
                                    </p>
                                    </div>
                                    )}
                                    </TableCell>
                              <TableCell>
                                <span className="text-slate-600">{getBuildingName(doc.building_id)}</span>
                              </TableCell>
                              <TableCell>
                                <div className="flex flex-col gap-1">
                                  <Badge variant="outline" className="text-xs capitalize w-fit">
                                    {doc.visibility?.replace(/_/g, ' ')}
                                  </Badge>
                                  {doc.expiry_date && (
                                    <Badge 
                                      variant={new Date(doc.expiry_date) < new Date() ? "destructive" : "outline"} 
                                      className="text-xs w-fit"
                                    >
                                      {new Date(doc.expiry_date) < new Date() ? 'Expired' : 'Expires'}: {format(new Date(doc.expiry_date), 'MMM d')}
                                    </Badge>
                                  )}
                                </div>
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
                                      {!doc.ai_summary && (
                                        <DropdownMenuItem onClick={() => handleGenerateSummary(doc.id)} disabled={generatingSummary === doc.id}>
                                          {generatingSummary === doc.id ? (
                                            <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Generating...</>
                                          ) : (
                                            <><FileSearch className="mr-2 h-4 w-4" /> Generate AI Summary</>
                                          )}
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
              </Card>
            );
          })}
        </div>
      )}

      {/* Edit Document Dialog */}
      <Dialog open={!!editingDocument} onOpenChange={() => setEditingDocument(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Document</DialogTitle>
          </DialogHeader>
          {editingDocument && (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Title</label>
                <Input
                  value={editingDocument.title}
                  onChange={(e) => setEditingDocument({ ...editingDocument, title: e.target.value })}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Description</label>
                <Input
                  value={editingDocument.description || ''}
                  onChange={(e) => setEditingDocument({ ...editingDocument, description: e.target.value })}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Category</label>
                <Select 
                  value={editingDocument.category} 
                  onValueChange={(value) => setEditingDocument({ ...editingDocument, category: value })}
                >
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
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingDocument(null)}>Cancel</Button>
            <Button onClick={() => updateMutation.mutate({ id: editingDocument.id, data: editingDocument })}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Upload Dialog */}
      <DocumentUploadDialog
        open={showUploadDialog}
        onOpenChange={setShowUploadDialog}
        buildingId={filterBuilding !== 'all' ? filterBuilding : selectedBuildingId}
        onSuccess={handleDocumentUploaded}
      />

      {/* Version Management Dialog */}
      <DocumentVersionDialog
        open={!!versionDialog}
        onOpenChange={(open) => !open && setVersionDialog(null)}
        parentDocument={versionDialog}
        onSuccess={() => queryClient.invalidateQueries({ queryKey: ['documents'] })}
      />

      {/* Version History Dialog */}
      <Dialog open={!!viewingVersions} onOpenChange={() => setViewingVersions(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Version History</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-slate-600">
              All versions of "{viewingVersions?.title}"
            </p>
            <div className="space-y-2">
              {getDocumentVersions(viewingVersions || {}).map((version, idx) => (
                <Card key={version.id} className="border-0 shadow-sm">
                  <div className="p-4 flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-slate-900">
                          Version {version.version || 1}
                        </span>
                        {idx === 0 && (
                          <Badge variant="secondary" className="text-xs">Current</Badge>
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
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewingVersions(null)}>
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