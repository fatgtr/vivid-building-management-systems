import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
  Droplet
} from 'lucide-react';
import { toast } from 'sonner';
import { Alert, AlertDescription } from "@/components/ui/alert";
import SubdivisionPlanExtractor from './SubdivisionPlanExtractor';
import StrataRollUploader from './StrataRollUploader';
import AFSSExtractor from './AFSSExtractor';
import AsBuiltExtractor from './AsBuiltExtractor';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
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

const documentTypes = [
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
  {
    category: 'afss_documentation',
    label: 'AFSS Documentation',
    icon: Flame,
    description: 'Extract fire safety assets and auto-schedule maintenance',
    color: 'orange',
    hasAI: true,
  },
  {
    category: 'as_built_electrical',
    label: 'As-Built Electrical',
    icon: Zap,
    description: 'Extract electrical assets and create maintenance register',
    color: 'yellow',
    hasAI: true,
  },
  {
    category: 'as_built_mechanical',
    label: 'As-Built Mechanical',
    icon: Wind,
    description: 'Extract HVAC/mechanical assets and create register',
    color: 'cyan',
    hasAI: true,
  },
  {
    category: 'as_built_plumbing',
    label: 'As-Built Plumbing',
    icon: Droplet,
    description: 'Extract plumbing assets and create maintenance register',
    color: 'blue',
    hasAI: true,
  },
  {
    category: 'as_built_windows',
    label: 'As-Built Windows',
    icon: Layers,
    description: 'Window specifications and layouts',
    color: 'teal',
    hasAI: false,
  },
  {
    category: 'lift_plant_registration',
    label: 'Lift Plant Registration',
    icon: Building,
    description: 'Elevator registration and compliance',
    color: 'purple',
    hasAI: false,
  },
];

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
};

export default function BuildingDocumentManager({ buildingId, buildingName }) {
  const [uploadingType, setUploadingType] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [deleteDoc, setDeleteDoc] = useState(null);
  const [aiDialogOpen, setAiDialogOpen] = useState(false);
  const [currentAIType, setCurrentAIType] = useState(null);
  const [uploadedFileUrl, setUploadedFileUrl] = useState(null);

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
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {documentTypes.map((docType) => {
          const Icon = docType.icon;
          const docs = getDocumentsForCategory(docType.category);
          const isUploading = uploadingType === docType.category;

          return (
            <Card key={docType.category} className="border-2 hover:shadow-md transition-shadow">
              <CardHeader className={`pb-3 ${colorClasses[docType.color]} border-b-2`}>
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
                        <div className={`w-12 h-12 rounded-full ${colorClasses[docType.color]} flex items-center justify-center`}>
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