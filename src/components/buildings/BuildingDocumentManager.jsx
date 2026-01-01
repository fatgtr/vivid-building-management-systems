import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { 
  Upload, 
  FileText, 
  Download, 
  Trash2, 
  Loader2,
  MapPin,
  Users,
  Zap,
  Building,
  Wind,
  Ruler,
  Layers,
  AlertCircle,
  Scale,
  FileCheck,
  Flame,
  Droplet,
  Sparkles,
  Plus,
  Search,
  Filter,
  Eye,
  History,
  Tag
} from 'lucide-react';
import { toast } from 'sonner';
import { ASSET_CATEGORIES } from '@/components/categories/assetCategories';
import { format } from 'date-fns';
import { Alert, AlertDescription } from "@/components/ui/alert";
import SubdivisionPlanExtractor from './SubdivisionPlanExtractor';
import StrataRollUploader from './StrataRollUploader';
import AFSSExtractor from './AFSSExtractor';
import AsBuiltExtractor from './AsBuiltExtractor';
import LiftRegistrationExtractor from './LiftRegistrationExtractor';
import GenericAssetExtractor from './GenericAssetExtractor';
import BylawsExtractor from './BylawsExtractor';
import StrataManagementStatementExtractor from './StrataManagementStatementExtractor';
import CleaningScheduleExtractor from './CleaningScheduleExtractor';
import AIDocumentUploadCard from './AIDocumentUploadCard';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
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

const specificDocumentTypes = [
  {
    category: 'subdivision_plan',
    label: 'Subdivision Plan',
    icon: MapPin,
    description: 'Extract unit/lot information, property details, PT numbers, easements, and common areas',
    color: 'indigo',
    hasAI: true,
  },
  {
    category: 'strata_roll',
    label: 'Strata Roll',
    icon: Users,
    description: 'Populate resident and owner information, contact details, investor data, and occupancy status',
    color: 'blue',
    hasAI: true,
  },
  {
    category: 'bylaws',
    label: 'Bylaws',
    icon: Scale,
    description: 'Extract building rules, restrictions, policies, pet/parking guidelines, and amendment history',
    color: 'emerald',
    hasAI: true,
  },
  {
    category: 'strata_management_statement',
    label: 'Strata Management Statement',
    icon: FileCheck,
    description: 'Extract management structure, committee duties, levies, service contracts, and financial reporting',
    color: 'violet',
    hasAI: true,
  },
  {
    category: 'cleaning_schedule',
    label: 'Cleaning Schedule',
    icon: Zap,
    description: 'Extract cleaning contractor schedules and auto-create recurring maintenance schedules',
    color: 'cyan',
    hasAI: true,
  },
];

const assetDocumentTypes = Object.entries(ASSET_CATEGORIES).map(([key, category]) => {
  // Extract color name from the Tailwind classes (e.g., "text-cyan-600 bg-cyan-50" -> "cyan")
  const colorMatch = category.color.match(/text-(\w+)-/);
  const colorName = colorMatch ? colorMatch[1] : 'slate';
  
  return {
    category: key,
    label: category.label,
    icon: category.icon,
    description: `Extract and manage ${category.label.toLowerCase()} assets`,
    color: colorName,
    hasAI: true,
  };
});

const documentTypes = [...specificDocumentTypes, ...assetDocumentTypes];

const colorClasses = {
  indigo: 'bg-indigo-100 text-indigo-700 border-indigo-200',
  blue: 'bg-blue-100 text-blue-700 border-blue-200',
  emerald: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  violet: 'bg-violet-100 text-violet-700 border-violet-200',
  orange: 'bg-orange-100 text-orange-700 border-orange-200',
  yellow: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  cyan: 'bg-cyan-100 text-cyan-700 border-cyan-200',
  teal: 'bg-teal-100 text-teal-700 border-teal-200',
  purple: 'bg-purple-100 text-purple-700 border-purple-200',
  slate: 'bg-slate-100 text-slate-700 border-slate-200',
  core: 'bg-slate-100 text-slate-700 border-slate-200',
  mechanical: 'bg-cyan-100 text-cyan-700 border-cyan-200',
  electrical: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  fire: 'bg-orange-100 text-orange-700 border-orange-200',
  vertical: 'bg-purple-100 text-purple-700 border-purple-200',
  hydraulic: 'bg-blue-100 text-blue-700 border-blue-200',
  security: 'bg-red-100 text-red-700 border-red-200',
  communications: 'bg-indigo-100 text-indigo-700 border-indigo-200',
  building: 'bg-teal-100 text-teal-700 border-teal-200',
  external: 'bg-green-100 text-green-700 border-green-200',
  common: 'bg-amber-100 text-amber-700 border-amber-200',
  waste: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  parking: 'bg-gray-100 text-gray-700 border-gray-200',
  compliance: 'bg-orange-100 text-orange-700 border-orange-200',
  commercial: 'bg-violet-100 text-violet-700 border-violet-200',
  residential: 'bg-pink-100 text-pink-700 border-pink-200',
  documentation: 'bg-blue-100 text-blue-700 border-blue-200',
};

export default function BuildingDocumentManager({ buildingId, buildingName }) {
  const [uploadingType, setUploadingType] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [deleteDoc, setDeleteDoc] = useState(null);
  const [aiDialogOpen, setAiDialogOpen] = useState(false);
  const [currentAIType, setCurrentAIType] = useState(null);
  const [uploadedFileUrl, setUploadedFileUrl] = useState(null);
  const [selectedDocumentId, setSelectedDocumentId] = useState(null);
  const [showGeneralUpload, setShowGeneralUpload] = useState(false);
  const [generalUploadData, setGeneralUploadData] = useState({
    title: '', description: '', category: 'other', visibility: 'staff_only', tags: ''
  });
  const [isProcessingOCR, setIsProcessingOCR] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [viewingDocument, setViewingDocument] = useState(null);
  const [processingOCR, setProcessingOCR] = useState({});

  const queryClient = useQueryClient();

  const { data: documents = [], isLoading } = useQuery({
    queryKey: ['buildingDocuments', buildingId],
    queryFn: () => base44.entities.Document.filter({ building_id: buildingId }),
  });

  const uploadMutation = useMutation({
    mutationFn: async ({ file, category, label }) => {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      
      return base44.entities.Document.create({
        building_id: buildingId,
        title: `${label} - ${file.name}`,
        category,
        file_url,
        file_type: file.type,
        file_size: file.size,
        visibility: 'staff_only',
        status: 'active',
      });
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['buildingDocuments', buildingId] });
      toast.success(`${variables.label} uploaded successfully!`);
      setUploadingType(null);
      setSelectedFile(null);
      
      const docType = documentTypes.find(dt => dt.category === variables.category);
      if (docType?.hasAI) {
        setUploadedFileUrl(data.file_url);
        setCurrentAIType(variables.category);
        setAiDialogOpen(true);
      }
    },
    onError: (error) => {
      toast.error('Failed to upload document');
      console.error('Upload error:', error);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (docId) => base44.entities.Document.delete(docId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['buildingDocuments', buildingId] });
      toast.success('Document deleted successfully');
      setDeleteDoc(null);
    },
    onError: (error) => {
      toast.error('Failed to delete document');
      console.error('Delete error:', error);
    },
  });

  const handleFileSelect = (file, category, label) => {
    if (!file) return;

    if (file.type !== 'application/pdf' && !file.type.startsWith('image/')) {
      toast.error('Please select a PDF or image file');
      return;
    }

    setUploadingType(category);
    uploadMutation.mutate({ file, category, label });
  };

  const getDocumentsForCategory = (category) => {
    return documents.filter(doc => doc.category === category);
  };

  const handleCloseAIDialog = () => {
    setAiDialogOpen(false);
    setCurrentAIType(null);
    setUploadedFileUrl(null);
    setSelectedDocumentId(null);
  };

  const handleManualOCR = async (docId) => {
    setProcessingOCR({ ...processingOCR, [docId]: true });
    try {
      await base44.entities.Document.update(docId, { ocr_status: 'processing' });
      queryClient.invalidateQueries({ queryKey: ['buildingDocuments', buildingId] });
      
      await base44.functions.invoke('processDocumentOCR', { document_id: docId });
      
      toast.success('OCR processing completed');
      queryClient.invalidateQueries({ queryKey: ['buildingDocuments', buildingId] });
    } catch (error) {
      toast.error('OCR processing failed: ' + error.message);
      await base44.entities.Document.update(docId, { ocr_status: 'failed' });
      queryClient.invalidateQueries({ queryKey: ['buildingDocuments', buildingId] });
    } finally {
      setProcessingOCR({ ...processingOCR, [docId]: false });
    }
  };

  const generalUploadMutation = useMutation({
    mutationFn: async ({ file }) => {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      
      const tags = generalUploadData.tags ? generalUploadData.tags.split(',').map(t => t.trim()) : [];
      
      const document = await base44.entities.Document.create({
        building_id: buildingId,
        title: generalUploadData.title || file.name,
        description: generalUploadData.description,
        category: generalUploadData.category,
        file_url,
        file_type: file.type,
        file_size: file.size,
        visibility: generalUploadData.visibility,
        status: 'active',
        tags,
        ocr_status: 'pending',
      });

      // Automatically trigger OCR processing for PDFs and images
      if (file.type === 'application/pdf' || file.type.startsWith('image/')) {
        try {
          await base44.entities.Document.update(document.id, { ocr_status: 'processing' });
          base44.functions.invoke('processDocumentOCR', { document_id: document.id })
            .then(() => {
              queryClient.invalidateQueries({ queryKey: ['buildingDocuments', buildingId] });
            })
            .catch(() => {
              base44.entities.Document.update(document.id, { ocr_status: 'failed' });
              queryClient.invalidateQueries({ queryKey: ['buildingDocuments', buildingId] });
            });
        } catch (error) {
          console.error('OCR processing error:', error);
        }
      }

      return document;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['buildingDocuments', buildingId] });
      setShowGeneralUpload(false);
      setGeneralUploadData({ title: '', description: '', category: 'other', visibility: 'staff_only', tags: '' });
      toast.success('Document uploaded successfully');
    },
    onError: () => {
      toast.error('Failed to upload document');
    },
  });

  const handleGeneralUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    generalUploadMutation.mutate({ file });
  };

  const createVersionMutation = useMutation({
    mutationFn: async ({ file, originalDoc }) => {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      
      return base44.entities.Document.create({
        building_id: buildingId,
        title: originalDoc.title,
        description: originalDoc.description,
        category: originalDoc.category,
        file_url,
        file_type: file.type,
        file_size: file.size,
        visibility: originalDoc.visibility,
        status: 'active',
        tags: originalDoc.tags,
        parent_document_id: originalDoc.parent_document_id || originalDoc.id,
        version: (originalDoc.version || 1) + 1,
        version_notes: `Updated version from ${format(new Date(), 'PPp')}`,
        ocr_status: 'pending',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['buildingDocuments', buildingId] });
      toast.success('New version created successfully');
    },
  });

  const allGeneralDocuments = documents;

  const filteredGeneralDocuments = allGeneralDocuments.filter(doc => {
    const matchesSearch = !searchQuery || 
      doc.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.ocr_content?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = filterCategory === 'all' || doc.category === filterCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-6">
      <Tabs defaultValue="specialized" className="w-full">
        <TabsList>
          <TabsTrigger value="specialized">
            <Sparkles className="h-4 w-4 mr-2" />
            AI-Powered Documents
          </TabsTrigger>
          <TabsTrigger value="general">
            <FileText className="h-4 w-4 mr-2" />
            All Documents
            {allGeneralDocuments.length > 0 && (
              <Badge variant="secondary" className="ml-2">{allGeneralDocuments.length}</Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="specialized" className="space-y-6 mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {documentTypes.map((docType) => {
          const Icon = docType.icon;
          const docs = getDocumentsForCategory(docType.category);
          const isUploading = uploadingType === docType.category;

          return (
            <AIDocumentUploadCard
              key={docType.category}
              title={docType.label}
              description={docType.description}
              icon={Icon}
              color={docType.color}
              onFileSelect={(file) => handleFileSelect(file, docType.category, docType.label)}
              uploading={isUploading}
              acceptedFormats=".pdf,.jpg,.jpeg,.png"
            />
          );
        })}
          </div>
          
          {/* AI Extraction Info */}
          <Card className="border-blue-200 bg-blue-50">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div className="space-y-2 text-sm text-slate-700">
                  <p className="font-semibold">AI will automatically extract:</p>
                  <ul className="list-disc list-inside space-y-1">
                    <li>Subdivision plans: Building details, easements, lot-to-unit mapping, common areas</li>
                    <li>Strata rolls: Unit/lot info, owner contacts, investor details, occupancy</li>
                    <li>Bylaws: Rules, restrictions, policies, amendments</li>
                    <li>Strata statements: Management structure, levies, responsibilities</li>
                    <li>AFSS: Fire equipment, compliance dates, auto-schedules</li>
                    <li>As-built plans: Asset registers, maintenance schedules</li>
                    <li>Lift registrations: Asset details, expiry tracking, reminders</li>
                    <li>All asset categories: Equipment details, service records</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="general" className="space-y-6 mt-6">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4 flex-1">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Search documents..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={filterCategory} onValueChange={setFilterCategory}>
                <SelectTrigger className="w-[180px]">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  <SelectItem value="subdivision_plan">Subdivision Plan</SelectItem>
                  <SelectItem value="strata_roll">Strata Roll</SelectItem>
                  <SelectItem value="bylaws">Bylaws</SelectItem>
                  <SelectItem value="strata_management_statement">Strata Management Statement</SelectItem>
                  <SelectItem value="afss_documentation">AFSS Documentation</SelectItem>
                  <SelectItem value="as_built_electrical">As-Built Electrical</SelectItem>
                  <SelectItem value="as_built_mechanical">As-Built Mechanical</SelectItem>
                  <SelectItem value="as_built_plumbing">As-Built Plumbing</SelectItem>
                  <SelectItem value="lift_plant_registration">Lift Plant Registration</SelectItem>
                  <SelectItem value="policy">Policy</SelectItem>
                  <SelectItem value="manual">Manual</SelectItem>
                  <SelectItem value="form">Form</SelectItem>
                  <SelectItem value="report">Report</SelectItem>
                  <SelectItem value="certificate">Certificate</SelectItem>
                  <SelectItem value="contract">Contract</SelectItem>
                  <SelectItem value="meeting_minutes">Meeting Minutes</SelectItem>
                  <SelectItem value="financial">Financial</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={() => setShowGeneralUpload(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              Upload Document
            </Button>
          </div>

          {filteredGeneralDocuments.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="py-12 text-center">
                <FileText className="h-12 w-12 mx-auto mb-4 text-slate-300" />
                <p className="text-slate-500 mb-4">
                  {searchQuery || filterCategory !== 'all' 
                    ? 'No documents match your filters' 
                    : 'No general documents uploaded yet'}
                </p>
                <Button onClick={() => setShowGeneralUpload(true)} variant="outline">
                  <Plus className="h-4 w-4 mr-2" />
                  Upload First Document
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {filteredGeneralDocuments.map((doc) => (
                <Card key={doc.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-semibold truncate">{doc.title}</h3>
                          <Badge variant="outline" className="capitalize">
                            {doc.category?.replace(/_/g, ' ')}
                          </Badge>
                          {doc.version > 1 && (
                            <Badge variant="secondary">v{doc.version}</Badge>
                          )}
                          {doc.ocr_status === 'processing' && (
                            <Badge variant="outline" className="text-blue-600">
                              <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                              Processing
                            </Badge>
                          )}
                          {doc.ocr_status === 'completed' && (
                            <Badge variant="outline" className="text-green-600">
                              <Sparkles className="h-3 w-3 mr-1" />
                              Searchable
                            </Badge>
                          )}
                          {doc.ocr_status === 'failed' && (
                            <Badge variant="outline" className="text-red-600">
                              <AlertCircle className="h-3 w-3 mr-1" />
                              Failed
                            </Badge>
                          )}
                        </div>
                        {doc.description && (
                          <p className="text-sm text-slate-600 mb-2">{doc.description}</p>
                        )}
                        <div className="flex items-center gap-3 text-xs text-slate-500">
                          <span>{format(new Date(doc.created_date), 'PPp')}</span>
                          {doc.file_size && (
                            <span>{(doc.file_size / 1024 / 1024).toFixed(2)} MB</span>
                          )}
                        </div>
                        {doc.tags && doc.tags.length > 0 && (
                          <div className="flex items-center gap-1 mt-2 flex-wrap">
                            {doc.tags.map((tag, idx) => (
                              <Badge key={idx} variant="secondary" className="text-xs">
                                <Tag className="h-2 w-2 mr-1" />
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        {(doc.file_type === 'application/pdf' || doc.file_type?.startsWith('image/')) && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleManualOCR(doc.id)}
                            disabled={processingOCR[doc.id] || doc.ocr_status === 'processing'}
                            title={doc.ocr_status === 'completed' ? 'Reprocess OCR' : 'Process for OCR'}
                            className="text-blue-600 hover:text-blue-700"
                          >
                            {processingOCR[doc.id] || doc.ocr_status === 'processing' ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Sparkles className="h-4 w-4" />
                            )}
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setViewingDocument(doc)}
                          title="View Details"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => window.open(doc.file_url, '_blank')}
                          title="Download"
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                        <input
                          type="file"
                          id={`version-${doc.id}`}
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) createVersionMutation.mutate({ file, originalDoc: doc });
                          }}
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => document.getElementById(`version-${doc.id}`).click()}
                          title="Upload New Version"
                        >
                          <History className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-red-600 hover:text-red-700"
                          onClick={() => setDeleteDoc(doc)}
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Upload General Document Dialog */}
      <Dialog open={showGeneralUpload} onOpenChange={setShowGeneralUpload}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Upload Document</DialogTitle>
            <DialogDescription>
              Add a new document to this building's profile
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Document Title *</Label>
              <Input
                value={generalUploadData.title}
                onChange={(e) => setGeneralUploadData({ ...generalUploadData, title: e.target.value })}
                placeholder="e.g., Annual Report 2024"
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={generalUploadData.description}
                onChange={(e) => setGeneralUploadData({ ...generalUploadData, description: e.target.value })}
                placeholder="Brief description of the document"
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Category *</Label>
                <Select
                  value={generalUploadData.category}
                  onValueChange={(value) => setGeneralUploadData({ ...generalUploadData, category: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="policy">Policy</SelectItem>
                    <SelectItem value="manual">Manual</SelectItem>
                    <SelectItem value="form">Form</SelectItem>
                    <SelectItem value="report">Report</SelectItem>
                    <SelectItem value="certificate">Certificate</SelectItem>
                    <SelectItem value="contract">Contract</SelectItem>
                    <SelectItem value="meeting_minutes">Meeting Minutes</SelectItem>
                    <SelectItem value="financial">Financial</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Visibility *</Label>
                <Select
                  value={generalUploadData.visibility}
                  onValueChange={(value) => setGeneralUploadData({ ...generalUploadData, visibility: value })}
                >
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
            </div>
            <div className="space-y-2">
              <Label>Tags (comma-separated)</Label>
              <Input
                value={generalUploadData.tags}
                onChange={(e) => setGeneralUploadData({ ...generalUploadData, tags: e.target.value })}
                placeholder="e.g., compliance, urgent, Q1-2024"
              />
            </div>
            <div className="space-y-2">
              <Label>Select File *</Label>
              <Input
                type="file"
                onChange={handleGeneralUpload}
                disabled={generalUploadMutation.isPending || isProcessingOCR}
              />
              {isProcessingOCR && (
                <p className="text-xs text-blue-600 flex items-center gap-2">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Processing document for search...
                </p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowGeneralUpload(false)}>
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Document Details Dialog */}
      <Dialog open={!!viewingDocument} onOpenChange={() => setViewingDocument(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{viewingDocument?.title}</DialogTitle>
            <DialogDescription>
              Document details and metadata
            </DialogDescription>
          </DialogHeader>
          {viewingDocument && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-slate-500">Category</p>
                  <p className="capitalize">{viewingDocument.category?.replace(/_/g, ' ')}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-500">Visibility</p>
                  <p className="capitalize">{viewingDocument.visibility?.replace(/_/g, ' ')}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-500">Version</p>
                  <p>{viewingDocument.version || 1}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-500">File Size</p>
                  <p>{viewingDocument.file_size ? `${(viewingDocument.file_size / 1024 / 1024).toFixed(2)} MB` : 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-500">Uploaded</p>
                  <p>{format(new Date(viewingDocument.created_date), 'PPp')}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-500">OCR Status</p>
                  <Badge variant={viewingDocument.ocr_status === 'completed' ? 'default' : 'secondary'}>
                    {viewingDocument.ocr_status || 'Not processed'}
                  </Badge>
                </div>
              </div>
              {viewingDocument.description && (
                <div>
                  <p className="text-sm font-medium text-slate-500 mb-1">Description</p>
                  <p className="text-sm">{viewingDocument.description}</p>
                </div>
              )}
              {viewingDocument.tags && viewingDocument.tags.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-slate-500 mb-2">Tags</p>
                  <div className="flex flex-wrap gap-2">
                    {viewingDocument.tags.map((tag, idx) => (
                      <Badge key={idx} variant="outline">{tag}</Badge>
                    ))}
                  </div>
                </div>
              )}
              {viewingDocument.ocr_content && (
                <div>
                  <p className="text-sm font-medium text-slate-500 mb-2">Extracted Content</p>
                  <div className="max-h-64 overflow-y-auto bg-slate-50 rounded-lg p-4 text-sm">
                    {viewingDocument.ocr_content}
                  </div>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setViewingDocument(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* AI Processing Dialog */}
      <Dialog open={aiDialogOpen} onOpenChange={setAiDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Process Document</DialogTitle>
            <DialogDescription>
              Use AI to extract and populate data from your uploaded document
            </DialogDescription>
          </DialogHeader>

          {currentAIType === 'subdivision_plan' && uploadedFileUrl && (
            <SubdivisionPlanExtractor
              buildingId={buildingId}
              buildingName={buildingName}
              fileUrl={uploadedFileUrl}
              onComplete={() => {
                handleCloseAIDialog();
                queryClient.invalidateQueries({ queryKey: ['units'] });
              }}
            />
          )}

          {currentAIType === 'strata_roll' && (
            <StrataRollUploader
              buildingId={buildingId}
              onUnitsCreated={() => {
                handleCloseAIDialog();
                queryClient.invalidateQueries({ queryKey: ['units'] });
                queryClient.invalidateQueries({ queryKey: ['residents'] });
              }}
              onSkip={handleCloseAIDialog}
            />
          )}

          {currentAIType === 'afss_documentation' && uploadedFileUrl && (
            <AFSSExtractor
              buildingId={buildingId}
              buildingName={buildingName}
              fileUrl={uploadedFileUrl}
              onComplete={() => {
                handleCloseAIDialog();
                queryClient.invalidateQueries({ queryKey: ['assets'] });
                queryClient.invalidateQueries({ queryKey: ['maintenanceSchedules'] });
              }}
            />
          )}

          {(currentAIType === 'as_built_electrical' || 
            currentAIType === 'as_built_mechanical' ||
            currentAIType === 'as_built_plumbing') && uploadedFileUrl && (
            <AsBuiltExtractor
              buildingId={buildingId}
              buildingName={buildingName}
              fileUrl={uploadedFileUrl}
              assetCategory={
                currentAIType === 'as_built_electrical' ? 'electrical' :
                currentAIType === 'as_built_mechanical' ? 'mechanical' :
                'plumbing'
              }
              onComplete={() => {
                handleCloseAIDialog();
                queryClient.invalidateQueries({ queryKey: ['assets'] });
                queryClient.invalidateQueries({ queryKey: ['maintenanceSchedules'] });
              }}
            />
          )}

          {currentAIType === 'lift_plant_registration' && uploadedFileUrl && (
            <LiftRegistrationExtractor
              buildingId={buildingId}
              buildingName={buildingName}
              fileUrl={uploadedFileUrl}
              documentId={selectedDocumentId}
              onComplete={() => {
                handleCloseAIDialog();
                queryClient.invalidateQueries({ queryKey: ['maintenanceSchedules'] });
              }}
            />
          )}

          {/* Cleaning Schedule Extractor */}
          {currentAIType === 'cleaning_schedule' && uploadedFileUrl && (
            <CleaningScheduleExtractor
              buildingId={buildingId}
              fileUrl={uploadedFileUrl}
              onComplete={() => {
                handleCloseAIDialog();
                queryClient.invalidateQueries({ queryKey: ['maintenanceSchedules'] });
              }}
            />
          )}

          {/* Generic Asset Extractor for all other asset categories */}
          {currentAIType && 
           !['subdivision_plan', 'strata_roll', 'bylaws', 'strata_management_statement', 
             'afss_documentation', 'as_built_electrical', 'as_built_mechanical', 
             'as_built_plumbing', 'lift_plant_registration', 'cleaning_schedule'].includes(currentAIType) && 
           uploadedFileUrl && (
            <GenericAssetExtractor
              buildingId={buildingId}
              buildingName={buildingName}
              fileUrl={uploadedFileUrl}
              assetCategory={currentAIType}
              categoryLabel={documentTypes.find(dt => dt.category === currentAIType)?.label || currentAIType}
              onComplete={() => {
                handleCloseAIDialog();
                queryClient.invalidateQueries({ queryKey: ['assets'] });
              }}
            />
          )}

          {/* Bylaws Extractor */}
          {currentAIType === 'bylaws' && uploadedFileUrl && (
            <BylawsExtractor
              buildingId={buildingId}
              buildingName={buildingName}
              fileUrl={uploadedFileUrl}
              documentId={selectedDocumentId}
              onComplete={() => {
                handleCloseAIDialog();
                queryClient.invalidateQueries({ queryKey: ['buildingBylaws', buildingId] });
              }}
            />
          )}

          {/* Strata Management Statement Extractor */}
          {currentAIType === 'strata_management_statement' && uploadedFileUrl && (
            <StrataManagementStatementExtractor
              buildingId={buildingId}
              buildingName={buildingName}
              fileUrl={uploadedFileUrl}
              documentId={selectedDocumentId}
              onComplete={() => {
                handleCloseAIDialog();
                queryClient.invalidateQueries({ queryKey: ['strataManagementInfo', buildingId] });
              }}
            />
          )}

          <div className="flex justify-end">
            <Button variant="outline" onClick={handleCloseAIDialog}>
              Close
            </Button>
          </div>
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