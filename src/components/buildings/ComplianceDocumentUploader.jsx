import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Upload, 
  Loader2, 
  FileText, 
  Sparkles, 
  CheckCircle2,
  AlertCircle,
  Link as LinkIcon
} from 'lucide-react';
import { toast } from 'sonner';

export default function ComplianceDocumentUploader({ buildingId, onDataExtracted }) {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [extractedData, setExtractedData] = useState(null);
  const [linkedAsset, setLinkedAsset] = useState(null);

  const { data: assets = [] } = useQuery({
    queryKey: ['assets', buildingId],
    queryFn: () => base44.entities.Asset.filter({ building_id: buildingId }),
    enabled: !!buildingId,
  });

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      setExtractedData(null);
      setLinkedAsset(null);
    }
  };

  const handleUploadAndExtract = async () => {
    if (!file) {
      toast.error('Please select a file');
      return;
    }

    try {
      setUploading(true);
      
      // Step 1: Upload the file
      const uploadResult = await base44.integrations.Core.UploadFile({ file });
      const fileUrl = uploadResult.file_url;

      setUploading(false);
      setExtracting(true);

      // Step 2: Extract compliance data using AI
      const extractionSchema = {
        type: "object",
        properties: {
          compliance_type: {
            type: "string",
            description: "Type of compliance document (e.g., lift_registration_certificate, pool_registration_certificate, annual_fire_safety_statement, etc.)"
          },
          certificate_number: {
            type: "string",
            description: "Certificate or registration number"
          },
          inspection_date: {
            type: "string",
            description: "Date of inspection or issue in YYYY-MM-DD format"
          },
          expiry_date: {
            type: "string",
            description: "Expiry or renewal date in YYYY-MM-DD format"
          },
          next_due_date: {
            type: "string",
            description: "Next due date for inspection/renewal in YYYY-MM-DD format"
          },
          inspector_name: {
            type: "string",
            description: "Name of inspector or certifying authority"
          },
          inspector_company: {
            type: "string",
            description: "Inspector's company name"
          },
          asset_identifier: {
            type: "string",
            description: "Asset serial number, model number, or identifier mentioned in the document"
          },
          asset_location: {
            type: "string",
            description: "Location or floor where the asset is located"
          },
          findings: {
            type: "string",
            description: "Key findings or notes from the inspection"
          },
          status: {
            type: "string",
            description: "Compliance status (compliant, non_compliant, pending)"
          }
        }
      };

      const extractionResult = await base44.integrations.Core.ExtractDataFromUploadedFile({
        file_url: fileUrl,
        json_schema: extractionSchema
      });

      if (extractionResult.status === 'success') {
        const data = extractionResult.output;
        
        // Step 3: Try to link to existing asset
        let matchedAsset = null;
        if (data.asset_identifier || data.asset_location) {
          matchedAsset = assets.find(asset => {
            const identifierMatch = data.asset_identifier && 
              (asset.identifier?.toLowerCase().includes(data.asset_identifier.toLowerCase()) ||
               asset.serial_number?.toLowerCase().includes(data.asset_identifier.toLowerCase()) ||
               asset.model?.toLowerCase().includes(data.asset_identifier.toLowerCase()));
            
            const locationMatch = data.asset_location &&
              (asset.location?.toLowerCase().includes(data.asset_location.toLowerCase()) ||
               asset.floor?.toLowerCase().includes(data.asset_location.toLowerCase()));
            
            return identifierMatch || locationMatch;
          });
        }

        // Also try matching by compliance type to asset category
        if (!matchedAsset && data.compliance_type) {
          if (data.compliance_type.includes('lift')) {
            matchedAsset = assets.find(a => 
              a.asset_main_category === 'vertical_transportation' || 
              a.asset_type?.toLowerCase().includes('lift')
            );
          } else if (data.compliance_type.includes('pool')) {
            matchedAsset = assets.find(a => 
              a.asset_type?.toLowerCase().includes('pool') ||
              a.name?.toLowerCase().includes('pool')
            );
          } else if (data.compliance_type.includes('fire')) {
            matchedAsset = assets.find(a => 
              a.asset_main_category === 'fire_life_safety'
            );
          }
        }

        setExtractedData({ ...data, certificate_url: fileUrl });
        setLinkedAsset(matchedAsset);
        toast.success('Document processed successfully!');
      } else {
        toast.error('Failed to extract data: ' + extractionResult.details);
      }
    } catch (error) {
      toast.error('Error processing document: ' + error.message);
    } finally {
      setUploading(false);
      setExtracting(false);
    }
  };

  const handleUseExtractedData = () => {
    if (extractedData) {
      onDataExtracted({
        ...extractedData,
        asset_id: linkedAsset?.id || null,
        building_id: buildingId
      });
      
      // Reset
      setFile(null);
      setExtractedData(null);
      setLinkedAsset(null);
    }
  };

  const handleReset = () => {
    setFile(null);
    setExtractedData(null);
    setLinkedAsset(null);
  };

  return (
    <Card className="border-2 border-blue-200 bg-blue-50/30">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center">
            <Sparkles className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <CardTitle className="text-lg">AI Document Scanner</CardTitle>
            <p className="text-sm text-slate-600 mt-0.5">
              Upload compliance documents to auto-extract data
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {!extractedData ? (
          <>
            <div className="space-y-2">
              <Input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={handleFileChange}
                disabled={uploading || extracting}
              />
              {file && (
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <FileText className="h-4 w-4" />
                  <span>{file.name}</span>
                </div>
              )}
            </div>

            <Button
              onClick={handleUploadAndExtract}
              disabled={!file || uploading || extracting}
              className="w-full bg-blue-600 hover:bg-blue-700"
            >
              {uploading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Uploading...
                </>
              ) : extracting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Extracting Data with AI...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Scan Document
                </>
              )}
            </Button>

            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-xs">
                Supported: Lift registration certificates, fire safety statements, pool certificates, 
                and other compliance documents. The AI will automatically extract dates, certificate numbers, 
                and link to existing assets in the register.
              </AlertDescription>
            </Alert>
          </>
        ) : (
          <div className="space-y-4">
            <Alert className="bg-green-50 border-green-200">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                Data extracted successfully! Review and confirm below.
              </AlertDescription>
            </Alert>

            {linkedAsset && (
              <Alert className="bg-blue-50 border-blue-200">
                <LinkIcon className="h-4 w-4 text-blue-600" />
                <AlertDescription className="text-blue-800">
                  <strong>Linked to Asset:</strong> {linkedAsset.name}
                  {linkedAsset.location && ` (${linkedAsset.location})`}
                </AlertDescription>
              </Alert>
            )}

            <div className="bg-white rounded-lg border p-4 space-y-3">
              <h4 className="font-semibold text-sm">Extracted Information</h4>
              
              {extractedData.compliance_type && (
                <div>
                  <p className="text-xs text-slate-500">Compliance Type</p>
                  <Badge variant="outline" className="mt-1">
                    {extractedData.compliance_type.replace(/_/g, ' ')}
                  </Badge>
                </div>
              )}

              {extractedData.certificate_number && (
                <div>
                  <p className="text-xs text-slate-500">Certificate Number</p>
                  <p className="text-sm font-medium">{extractedData.certificate_number}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                {extractedData.inspection_date && (
                  <div>
                    <p className="text-xs text-slate-500">Inspection Date</p>
                    <p className="text-sm font-medium">{extractedData.inspection_date}</p>
                  </div>
                )}
                
                {extractedData.expiry_date && (
                  <div>
                    <p className="text-xs text-slate-500">Expiry Date</p>
                    <p className="text-sm font-medium">{extractedData.expiry_date}</p>
                  </div>
                )}

                {extractedData.next_due_date && (
                  <div>
                    <p className="text-xs text-slate-500">Next Due Date</p>
                    <p className="text-sm font-medium">{extractedData.next_due_date}</p>
                  </div>
                )}
              </div>

              {extractedData.inspector_name && (
                <div>
                  <p className="text-xs text-slate-500">Inspector</p>
                  <p className="text-sm font-medium">{extractedData.inspector_name}</p>
                  {extractedData.inspector_company && (
                    <p className="text-xs text-slate-500">{extractedData.inspector_company}</p>
                  )}
                </div>
              )}

              {extractedData.findings && (
                <div>
                  <p className="text-xs text-slate-500">Findings</p>
                  <p className="text-sm">{extractedData.findings}</p>
                </div>
              )}
            </div>

            <div className="flex gap-2">
              <Button
                onClick={handleUseExtractedData}
                className="flex-1 bg-green-600 hover:bg-green-700"
              >
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Use This Data
              </Button>
              <Button
                variant="outline"
                onClick={handleReset}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}