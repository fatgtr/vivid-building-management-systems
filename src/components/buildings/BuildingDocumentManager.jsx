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
    description: 'Extract unit/lot information and property details',
    color: 'indigo',
    hasAI: true,
  },
  {
    category: 'strata_roll',
    label: 'Strata Roll',
    icon: Users,
    description: 'Populate resident and owner information',
    color: 'blue',
    hasAI: true,
  },
  {
    category: 'bylaws',
    label: 'Bylaws',
    icon: Scale,
    description: 'Extract building rules, restrictions, and amendments',
    color: 'emerald',
    hasAI: true,
  },
  {
    category: 'strata_management_statement',
    label: 'Strata Management Statement',
    icon: FileCheck,
    description: 'Extract management structure, duties, and levies',
    color: 'violet',
    hasAI: true,
  },
];

const assetDocumentTypes = Object.entries(ASSET_CATEGORIES).map(([key, category]) => ({
  category: key,
  label: category.label,
  icon: category.icon,
  description: `Extract and manage ${category.label.toLowerCase()} assets`,
  color: key.split('_')[0],
  hasAI: true,
}));

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

  const handleFileSelect = (e, category, label) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      toast.error('Please select a PDF file');
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

  const allGeneralDocuments = documents.filter(doc => 
    !documentTypes.some(dt => dt.category === doc.category)
  );

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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {documentTypes.map((docType) => {
          const Icon = docType.icon;
          const docs = getDocumentsForCategory(docType.category);
          const isUploading = uploadingType === docType.category;
          const colorClass = colorClasses[docType.color] || colorClasses.slate;

          return (
            <Card key={docType.category} className="border-2 hover:shadow-md transition-shadow">
              <CardHeader className={`pb-3 ${colorClass} border-b-2`}>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <Icon className="h-5 w-5" />
                    <CardTitle className="text-base">{docType.label}</CardTitle>
                  </div>
                  {docs.length > 0 && (
                    <Badge variant="secondary" className="text-xs">
                      {docs.length}
                    </Badge>
                  )}
                </div>
                <CardDescription className="text-xs mt-1">
                  {docType.description}
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-4 space-y-3">
                {docs.length === 0 && (
                  <div className="border-2 border-dashed border-slate-200 rounded-lg p-6 text-center">
                    <input
                      type="file"
                      accept="application/pdf"
                      onChange={(e) => handleFileSelect(e, docType.category, docType.label)}
                      className="hidden"
                      id={`upload-${docType.category}`}
                      disabled={isUploading}
                    />
                    <label htmlFor={`upload-${docType.category}`} className="cursor-pointer">
                      <div className="flex flex-col items-center gap-3">
                        <div className={`w-12 h-12 rounded-full ${colorClass} flex items-center justify-center`}>
                          <Icon className="h-6 w-6" />
                        </div>
                        <div>
                          <p className="font-medium text-slate-700">
                            {isUploading ? 'Uploading...' : `Click to upload ${docType.label.toLowerCase()}`}
                          </p>
                          <p className="text-sm text-slate-500 mt-1">
                            PDF format only
                          </p>
                        </div>
                      </div>
                    </label>
                  </div>
                )}

                {docType.hasAI && docs.length === 0 && (
                  <Alert className="border-blue-200 bg-blue-50">
                    <AlertCircle className="h-4 w-4 text-blue-600" />
                    <AlertDescription className="text-sm text-slate-700">
                      The AI will extract:
                      <ul className="list-disc list-inside mt-2 space-y-1">
                        {docType.category === 'subdivision_plan' && (
                          <>
                            <li>Building details and strata plan number</li>
                            <li>Easements and their descriptions</li>
                            <li>Lot-to-unit mapping (PT numbers)</li>
                            <li>Common areas and assets on each level</li>
                          </>
                        )}
                        {docType.category === 'strata_roll' && (
                          <>
                            <li>Unit and lot information</li>
                            <li>Owner contact details</li>
                            <li>Investor and managing agent information</li>
                            <li>Resident occupancy status</li>
                          </>
                        )}
                        {docType.category === 'bylaws' && (
                          <>
                            <li>Key rules and restrictions</li>
                            <li>Common property usage guidelines</li>
                            <li>Pet and parking policies</li>
                            <li>Amendment history and dates</li>
                          </>
                        )}
                        {docType.category === 'strata_management_statement' && (
                          <>
                            <li>Management structure and hierarchy</li>
                            <li>Strata committee responsibilities</li>
                            <li>Levy and contribution details</li>
                            <li>Service and maintenance obligations</li>
                          </>
                        )}
                        {docType.category === 'afss_documentation' && (
                          <>
                            <li>Fire extinguishers and hose reels</li>
                            <li>Smoke detectors and fire alarms</li>
                            <li>Fire panels and sprinkler systems</li>
                            <li>Service dates and compliance status</li>
                            <li>Auto-generate maintenance schedules</li>
                          </>
                        )}
                        {docType.category === 'as_built_electrical' && (
                          <>
                            <li>Switchboards and distribution boards</li>
                            <li>Electrical meters and sub-meters</li>
                            <li>Circuit breakers and panels</li>
                            <li>Emergency power systems (generators, UPS)</li>
                            <li>Create asset register and maintenance schedules</li>
                          </>
                        )}
                        {docType.category === 'as_built_mechanical' && (
                          <>
                            <li>HVAC units and air handling systems</li>
                            <li>Chillers, boilers, and cooling towers</li>
                            <li>Pumps and ventilation fans</li>
                            <li>Building management system (BMS) panels</li>
                            <li>Create asset register and maintenance schedules</li>
                          </>
                        )}
                        {docType.category === 'as_built_plumbing' && (
                          <>
                            <li>Water meters and hot water systems</li>
                            <li>Water pumps and tanks</li>
                            <li>Backflow preventers and isolation valves</li>
                            <li>Drainage systems and grease traps</li>
                            <li>Create asset register and maintenance schedules</li>
                          </>
                        )}
                        {docType.category === 'lift_plant_registration' && (
                          <>
                            <li>Lift identifiers and registration numbers</li>
                            <li>Issue and expiry dates</li>
                            <li>Certifying body and inspector details</li>
                            <li>Auto-schedule renewals 2 weeks before expiry</li>
                            <li>Send email reminders to strata & building managers</li>
                          </>
                        )}
                        {docType.category.startsWith('core_building') && (
                          <>
                            <li>Structural elements and building components</li>
                            <li>Foundation, roof, and facade details</li>
                            <li>Waterproofing and expansion joints</li>
                            <li>Create asset register entries</li>
                          </>
                        )}
                        {docType.category.startsWith('mechanical') && (
                          <>
                            <li>HVAC systems and mechanical equipment</li>
                            <li>Chillers, boilers, and cooling towers</li>
                            <li>Ventilation and pump systems</li>
                            <li>Create asset register entries</li>
                          </>
                        )}
                        {docType.category.startsWith('electrical') && (
                          <>
                            <li>Switchboards and distribution systems</li>
                            <li>Emergency lighting and generators</li>
                            <li>Solar panels and UPS systems</li>
                            <li>Create asset register entries</li>
                          </>
                        )}
                        {docType.category.startsWith('fire') && (
                          <>
                            <li>Fire detection and suppression systems</li>
                            <li>Sprinklers, hydrants, and extinguishers</li>
                            <li>EWIS and emergency systems</li>
                            <li>Create asset register entries</li>
                          </>
                        )}
                        {docType.category.startsWith('vertical') && (
                          <>
                            <li>Lift systems and specifications</li>
                            <li>Capacity, speed, and service records</li>
                            <li>Registration and compliance data</li>
                            <li>Create asset register entries</li>
                          </>
                        )}
                        {docType.category.startsWith('hydraulic') && (
                          <>
                            <li>Water supply and hot water systems</li>
                            <li>Pumps, tanks, and drainage systems</li>
                            <li>Backflow devices and valves</li>
                            <li>Create asset register entries</li>
                          </>
                        )}
                        {docType.category.startsWith('security') && (
                          <>
                            <li>Access control and surveillance systems</li>
                            <li>CCTV, intercoms, and alarm systems</li>
                            <li>Roller doors and boom gates</li>
                            <li>Create asset register entries</li>
                          </>
                        )}
                        {docType.category.startsWith('communications') && (
                          <>
                            <li>Data cabling and network infrastructure</li>
                            <li>NBN, MATV, and Wi-Fi systems</li>
                            <li>MDF/IDF rooms and connectivity</li>
                            <li>Create asset register entries</li>
                          </>
                        )}
                        {docType.category.startsWith('building_management') && (
                          <>
                            <li>BMS controllers and sensors</li>
                            <li>Energy monitoring systems</li>
                            <li>HVAC and lighting controls</li>
                            <li>Create asset register entries</li>
                          </>
                        )}
                        {docType.category.startsWith('external') && (
                          <>
                            <li>Landscaping and irrigation systems</li>
                            <li>Fencing, gates, and driveways</li>
                            <li>External lighting and retaining walls</li>
                            <li>Create asset register entries</li>
                          </>
                        )}
                        {docType.category.startsWith('common') && (
                          <>
                            <li>Furniture, signage, and mailboxes</li>
                            <li>Storage cages and bike racks</li>
                            <li>Common area fixtures</li>
                            <li>Create asset register entries</li>
                          </>
                        )}
                        {docType.category.startsWith('waste') && (
                          <>
                            <li>Bin rooms and compactors</li>
                            <li>Recycling equipment and chutes</li>
                            <li>Waste management systems</li>
                            <li>Create asset register entries</li>
                          </>
                        )}
                        {docType.category.startsWith('parking') && (
                          <>
                            <li>Line marking and speed humps</li>
                            <li>Traffic mirrors and bollards</li>
                            <li>Parking access equipment</li>
                            <li>Create asset register entries</li>
                          </>
                        )}
                        {docType.category.startsWith('compliance') && (
                          <>
                            <li>Safety equipment and anchor points</li>
                            <li>Abseil systems and guardrails</li>
                            <li>Safety signage and ladders</li>
                            <li>Create asset register entries</li>
                          </>
                        )}
                        {docType.category.startsWith('commercial') && (
                          <>
                            <li>Commercial exhaust and kitchen hoods</li>
                            <li>Loading docks and dock levellers</li>
                            <li>Grease ducts and commercial equipment</li>
                            <li>Create asset register entries</li>
                          </>
                        )}
                        {docType.category.startsWith('residential') && (
                          <>
                            <li>Pools, spas, and gym equipment</li>
                            <li>BBQ areas and shared laundries</li>
                            <li>Residential amenity assets</li>
                            <li>Create asset register entries</li>
                          </>
                        )}
                        {docType.category.startsWith('documentation') && (
                          <>
                            <li>Asset registers and schedules</li>
                            <li>Certificates, warranties, and manuals</li>
                            <li>Compliance records and documentation</li>
                            <li>Link and categorize documents</li>
                          </>
                        )}
                        </ul>
                        </AlertDescription>
                        </Alert>
                        )}

                {docs.length > 0 && (
                  <>
                    <input
                      type="file"
                      accept="application/pdf"
                      onChange={(e) => handleFileSelect(e, docType.category, docType.label)}
                      className="hidden"
                      id={`upload-${docType.category}`}
                      disabled={isUploading}
                    />
                    <label htmlFor={`upload-${docType.category}`}>
                      <Button
                        variant="outline"
                        className="w-full"
                        disabled={isUploading}
                        asChild
                      >
                        <div className="cursor-pointer">
                          {isUploading ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              Uploading...
                            </>
                          ) : (
                            <>
                              <Upload className="h-4 w-4 mr-2" />
                              Upload Another
                            </>
                          )}
                        </div>
                      </Button>
                    </label>
                  </>
                )}

                {docs.length > 0 && (
                  <div className="space-y-2">
                    {docs.map((doc) => (
                      <div
                        key={doc.id}
                        className="flex items-center justify-between p-2 bg-slate-50 rounded border"
                      >
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <FileText className="h-4 w-4 text-slate-400 flex-shrink-0" />
                          <span className="text-xs text-slate-700 truncate">
                            {doc.title}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          {docType.hasAI && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-blue-600 hover:text-blue-700"
                              onClick={() => {
                                setUploadedFileUrl(doc.file_url);
                                setSelectedDocumentId(doc.id);
                                setCurrentAIType(docType.category);
                                setAiDialogOpen(true);
                              }}
                              title="Analyze with AI"
                            >
                              <Sparkles className="h-3 w-3" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => window.open(doc.file_url, '_blank')}
                          >
                            <Download className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-red-600 hover:text-red-700"
                            onClick={() => setDeleteDoc(doc)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
          </div>
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

          {/* Generic Asset Extractor for all other asset categories */}
          {currentAIType && 
           !['subdivision_plan', 'strata_roll', 'bylaws', 'strata_management_statement', 
             'afss_documentation', 'as_built_electrical', 'as_built_mechanical', 
             'as_built_plumbing', 'lift_plant_registration'].includes(currentAIType) && 
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

          {/* Fallback for document types without extractors yet */}
          {currentAIType && 
           ['bylaws', 'strata_management_statement'].includes(currentAIType) && (
            <Alert>
              <Sparkles className="h-4 w-4" />
              <AlertDescription>
                <p className="font-medium mb-2">AI extraction for {documentTypes.find(dt => dt.category === currentAIType)?.label} is coming soon!</p>
                <p className="text-sm text-slate-600">
                  For now, this document has been uploaded and is available for viewing and download. 
                  You can manually process the information it contains.
                </p>
              </AlertDescription>
            </Alert>
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