import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Upload, FileText, Loader2, CheckCircle2, AlertCircle, Database, Zap, Wind, Droplet } from 'lucide-react';
import { toast } from 'sonner';

const categoryIcons = {
  electrical: Zap,
  mechanical: Wind,
  plumbing: Droplet,
};

const categoryColors = {
  electrical: { bg: 'yellow', text: 'yellow-700', border: 'yellow-200' },
  mechanical: { bg: 'cyan', text: 'cyan-700', border: 'cyan-200' },
  plumbing: { bg: 'blue', text: 'blue-700', border: 'blue-200' },
};

export default function AsBuiltExtractor({ buildingId, buildingName, fileUrl = null, documentId = null, assetCategory, onComplete = null }) {
  const [uploading, setUploading] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [planFile, setPlanFile] = useState(null);
  const [extractedData, setExtractedData] = useState(null);
  const queryClient = useQueryClient();

  const Icon = categoryIcons[assetCategory] || FileText;
  const colors = categoryColors[assetCategory] || { bg: 'slate', text: 'slate-700', border: 'slate-200' };

  const populateAssetsMutation = useMutation({
    mutationFn: async (assetsData) => {
      const assetPromises = assetsData.map(asset => 
        base44.entities.Asset.create(asset)
      );
      return Promise.all(assetPromises);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['assets'] });
      toast.success(`Created ${data.length} ${assetCategory} assets!`);
      setExtractedData(null);
      setPlanFile(null);
      if (onComplete) onComplete(data);
    },
  });

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file && file.type === 'application/pdf') {
      setPlanFile(file);
      setExtractedData(null);
    } else {
      toast.error('Please select a PDF file');
    }
  };

  const handleExtract = async () => {
    let extractFileUrl = fileUrl;

    if (!fileUrl && !planFile) {
      toast.error('Please select a plan file first');
      return;
    }

    setUploading(!fileUrl && planFile);
    setExtracting(false);

    try {
      if (!fileUrl && planFile) {
        const { file_url } = await base44.integrations.Core.UploadFile({ file: planFile });
        extractFileUrl = file_url;
      }

      setUploading(false);
      setExtracting(true);

      const { data } = await base44.functions.invoke('extractAsBuiltAssets', {
        file_url: extractFileUrl,
        buildingId,
        documentId,
        assetCategory
      });

      if (data.success) {
        setExtractedData(data.data);
        toast.success(`${assetCategory.charAt(0).toUpperCase() + assetCategory.slice(1)} assets extracted successfully!`);
      } else {
        toast.error('Failed to extract assets: ' + data.error);
      }
    } catch (error) {
      console.error('Asset extraction error:', error);
      toast.error('Failed to extract assets: ' + error.message);
    } finally {
      setUploading(false);
      setExtracting(false);
    }
  };

  const handlePopulateAssets = () => {
    if (!extractedData || !extractedData.assets) {
      toast.error('No asset data to populate');
      return;
    }

    const assetsToCreate = extractedData.assets.map(asset => ({
      building_id: buildingId,
      document_id: documentId,
      asset_category: assetCategory,
      asset_type: asset.asset_type,
      name: asset.name,
      identifier: asset.identifier || null,
      location: asset.location,
      floor: asset.floor || null,
      manufacturer: asset.manufacturer || null,
      model: asset.model || null,
      installation_date: null,
      last_service_date: null,
      next_service_date: null,
      service_frequency: 'yearly',
      compliance_status: 'unknown',
      notes: asset.notes || null,
      status: 'active'
    }));

    populateAssetsMutation.mutate(assetsToCreate);
  };

  return (
    <Card className={`border-2 border-${colors.border}`}>
      <CardHeader className={`bg-gradient-to-r from-${colors.bg}-50 to-${colors.bg}-100`}>
        <CardTitle className="flex items-center gap-2">
          <Icon className={`h-5 w-5 text-${colors.text}`} />
          As-Built {assetCategory.charAt(0).toUpperCase() + assetCategory.slice(1)} Asset Register
        </CardTitle>
        <CardDescription>
          Upload as-built plans to extract {assetCategory} assets and build maintenance register
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-6 space-y-4">
        
        {!extractedData && (
          <>
            {!fileUrl && (
              <div className="border-2 border-dashed border-slate-200 rounded-lg p-8 text-center">
                <input
                  type="file"
                  accept="application/pdf"
                  onChange={handleFileSelect}
                  className="hidden"
                  id="asbuilt-upload"
                />
                <label htmlFor="asbuilt-upload" className="cursor-pointer">
                  <div className="flex flex-col items-center gap-3">
                    <div className={`w-16 h-16 rounded-full bg-${colors.bg}-100 flex items-center justify-center`}>
                      <FileText className={`h-8 w-8 text-${colors.text}`} />
                    </div>
                    <div>
                      <p className="font-medium text-slate-700">
                        {planFile ? planFile.name : `Click to upload as-built ${assetCategory} plan`}
                      </p>
                      <p className="text-sm text-slate-500 mt-1">
                        PDF format only
                      </p>
                    </div>
                  </div>
                </label>
              </div>
            )}

            <Alert className={`border-${colors.border} bg-${colors.bg}-50`}>
              <AlertCircle className={`h-4 w-4 text-${colors.text}`} />
              <AlertDescription className="text-sm text-slate-700">
                The AI will extract all {assetCategory} assets from the plan and create an asset register for maintenance tracking.
              </AlertDescription>
            </Alert>

            <Button
              onClick={handleExtract}
              disabled={(!planFile && !fileUrl) || uploading || extracting}
              className={`w-full bg-${colors.bg}-600 hover:bg-${colors.bg}-700`}
            >
              {uploading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Uploading Plan...
                </>
              ) : extracting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Analyzing Plan with AI...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Extract {assetCategory.charAt(0).toUpperCase() + assetCategory.slice(1)} Assets
                </>
              )}
            </Button>
          </>
        )}

        {extractedData && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-green-600">
              <CheckCircle2 className="h-5 w-5" />
              <span className="font-medium">Assets Extracted Successfully!</span>
            </div>

            <div className="bg-slate-50 rounded-lg p-4 space-y-3">
              {extractedData.building_name && (
                <div>
                  <p className="text-xs font-medium text-slate-500 uppercase">Building</p>
                  <p className="text-sm font-semibold text-slate-900">{extractedData.building_name}</p>
                </div>
              )}

              {extractedData.plan_title && (
                <div className="pt-3 border-t border-slate-200">
                  <p className="text-xs font-medium text-slate-500 uppercase">Plan Title</p>
                  <p className="text-sm text-slate-700">{extractedData.plan_title}</p>
                  {extractedData.plan_date && (
                    <p className="text-xs text-slate-500">Date: {extractedData.plan_date}</p>
                  )}
                </div>
              )}

              {extractedData.assets && (
                <div className="pt-3 border-t border-slate-200">
                  <p className="text-xs font-medium text-slate-500 uppercase mb-2">
                    {assetCategory.charAt(0).toUpperCase() + assetCategory.slice(1)} Assets
                  </p>
                  <p className="text-sm text-slate-600">
                    {extractedData.assets.length} assets identified
                  </p>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {[...new Set(extractedData.assets.map(a => a.asset_type))].slice(0, 6).map((type, idx) => (
                      <Badge key={idx} variant="secondary" className="text-xs">
                        {type.replace(/_/g, ' ')}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  setExtractedData(null);
                  setPlanFile(null);
                }}
                className="flex-1"
              >
                Start Over
              </Button>
              <Button
                onClick={handlePopulateAssets}
                disabled={populateAssetsMutation.isPending || !extractedData.assets}
                className="flex-1 bg-green-600 hover:bg-green-700"
              >
                {populateAssetsMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Creating Assets...
                  </>
                ) : (
                  <>
                    <Database className="h-4 w-4 mr-2" />
                    Create {extractedData.assets?.length || 0} Assets
                  </>
                )}
              </Button>
            </div>

            <Alert className="border-amber-200 bg-amber-50">
              <AlertCircle className="h-4 w-4 text-amber-600" />
              <AlertDescription className="text-xs text-amber-800">
                Assets will be added to the building's asset register for tracking and maintenance scheduling.
              </AlertDescription>
            </Alert>
          </div>
        )}
      </CardContent>
    </Card>
  );
}