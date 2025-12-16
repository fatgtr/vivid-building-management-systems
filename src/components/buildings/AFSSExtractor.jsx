import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Upload, FileText, Loader2, CheckCircle2, AlertCircle, Database, Flame, Calendar } from 'lucide-react';
import { toast } from 'sonner';

export default function AFSSExtractor({ buildingId, buildingName, fileUrl = null, documentId = null, onComplete = null }) {
  const [uploading, setUploading] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [planFile, setPlanFile] = useState(null);
  const [extractedData, setExtractedData] = useState(null);
  const queryClient = useQueryClient();

  const populateAssetsMutation = useMutation({
    mutationFn: async ({ assetsData, scheduleData }) => {
      const assetPromises = assetsData.map(asset => 
        base44.entities.Asset.create(asset)
      );
      const createdAssets = await Promise.all(assetPromises);

      const schedulePromises = scheduleData.map(schedule =>
        base44.entities.MaintenanceSchedule.create(schedule)
      );
      await Promise.all(schedulePromises);

      return { assets: createdAssets, schedules: scheduleData };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['assets'] });
      queryClient.invalidateQueries({ queryKey: ['maintenanceSchedules'] });
      toast.success(`Created ${data.assets.length} assets and ${data.schedules.length} maintenance schedules!`);
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

  const handleExtractAFSS = async () => {
    let extractFileUrl = fileUrl;

    if (!fileUrl && !planFile) {
      toast.error('Please select an AFSS file first');
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

      const { data } = await base44.functions.invoke('extractAFSSAssets', {
        file_url: extractFileUrl,
        buildingId,
        documentId
      });

      if (data.success) {
        setExtractedData(data.data);
        toast.success('AFSS data extracted successfully!');
      } else {
        toast.error('Failed to extract AFSS data: ' + data.error);
      }
    } catch (error) {
      console.error('AFSS extraction error:', error);
      toast.error('Failed to extract AFSS: ' + error.message);
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
      asset_category: 'fire_safety',
      asset_type: asset.asset_type,
      name: asset.name,
      identifier: asset.identifier || null,
      location: asset.location,
      floor: asset.floor || null,
      manufacturer: asset.manufacturer || null,
      model: asset.model || null,
      last_service_date: asset.last_service_date || null,
      next_service_date: asset.next_service_date || null,
      service_frequency: asset.service_frequency || 'yearly',
      compliance_status: asset.compliance_status || 'unknown',
      notes: asset.notes || null,
      status: 'active'
    }));

    // Create maintenance schedules for assets with next service dates
    const schedulesToCreate = extractedData.assets
      .filter(asset => asset.next_service_date)
      .map(asset => ({
        building_id: buildingId,
        subject: `${asset.asset_type.replace(/_/g, ' ')} Service - ${asset.location}`,
        description: `Scheduled maintenance for ${asset.name}`,
        event_start: asset.next_service_date,
        event_end: asset.next_service_date,
        recurrence: asset.service_frequency === 'monthly' ? 'monthly' : 
                    asset.service_frequency === 'quarterly' ? 'quarterly' :
                    asset.service_frequency === 'half_yearly' ? 'half_yearly' : 'yearly',
        asset: asset.name,
        job_area: asset.location,
        status: 'active'
      }));

    populateAssetsMutation.mutate({ 
      assetsData: assetsToCreate, 
      scheduleData: schedulesToCreate 
    });
  };

  return (
    <Card className="border-2 border-orange-100">
      <CardHeader className="bg-gradient-to-r from-orange-50 to-red-50">
        <CardTitle className="flex items-center gap-2">
          <Flame className="h-5 w-5 text-orange-600" />
          AFSS Asset Register Analysis
        </CardTitle>
        <CardDescription>
          Upload Annual Fire Safety Statement to extract fire safety assets and auto-schedule maintenance
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
                  id="afss-upload"
                />
                <label htmlFor="afss-upload" className="cursor-pointer">
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-16 h-16 rounded-full bg-orange-100 flex items-center justify-center">
                      <FileText className="h-8 w-8 text-orange-600" />
                    </div>
                    <div>
                      <p className="font-medium text-slate-700">
                        {planFile ? planFile.name : 'Click to upload AFSS document'}
                      </p>
                      <p className="text-sm text-slate-500 mt-1">
                        PDF format only
                      </p>
                    </div>
                  </div>
                </label>
              </div>
            )}

            <Alert className="border-orange-200 bg-orange-50">
              <AlertCircle className="h-4 w-4 text-orange-600" />
              <AlertDescription className="text-sm text-slate-700">
                The AI will extract:
                <ul className="list-disc list-inside mt-2 space-y-1">
                  <li>Fire extinguishers and hose reels</li>
                  <li>Smoke detectors and fire alarms</li>
                  <li>Fire panels and control systems</li>
                  <li>Sprinkler systems and emergency lighting</li>
                  <li>Service dates and compliance status</li>
                  <li>Maintenance schedules will be auto-generated</li>
                </ul>
              </AlertDescription>
            </Alert>

            <Button
              onClick={handleExtractAFSS}
              disabled={(!planFile && !fileUrl) || uploading || extracting}
              className="w-full bg-orange-600 hover:bg-orange-700"
            >
              {uploading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Uploading AFSS...
                </>
              ) : extracting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Analyzing AFSS with AI...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Extract AFSS Assets
                </>
              )}
            </Button>
          </>
        )}

        {extractedData && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-green-600">
              <CheckCircle2 className="h-5 w-5" />
              <span className="font-medium">AFSS Data Extracted Successfully!</span>
            </div>

            <div className="bg-slate-50 rounded-lg p-4 space-y-3">
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase">Building Information</p>
                <p className="text-sm font-semibold text-slate-900">{extractedData.building_name || buildingName}</p>
                <p className="text-sm text-slate-600">{extractedData.building_address || 'N/A'}</p>
              </div>

              {(extractedData.inspection_date || extractedData.next_inspection_date) && (
                <div className="pt-3 border-t border-slate-200">
                  <p className="text-xs font-medium text-slate-500 uppercase mb-2">Inspection Dates</p>
                  <div className="flex gap-3 text-sm">
                    {extractedData.inspection_date && (
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3 text-slate-400" />
                        <span className="text-slate-600">Last: {extractedData.inspection_date}</span>
                      </div>
                    )}
                    {extractedData.next_inspection_date && (
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3 text-orange-500" />
                        <span className="text-slate-600">Next: {extractedData.next_inspection_date}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {extractedData.fire_safety_practitioner && (
                <div className="pt-3 border-t border-slate-200">
                  <p className="text-xs font-medium text-slate-500 uppercase mb-1">Fire Safety Practitioner</p>
                  <p className="text-sm font-medium text-slate-900">{extractedData.fire_safety_practitioner.name}</p>
                  <p className="text-xs text-slate-600">{extractedData.fire_safety_practitioner.company}</p>
                  {extractedData.fire_safety_practitioner.license_number && (
                    <p className="text-xs text-slate-500">License: {extractedData.fire_safety_practitioner.license_number}</p>
                  )}
                </div>
              )}

              {extractedData.assets && (
                <div className="pt-3 border-t border-slate-200">
                  <p className="text-xs font-medium text-slate-500 uppercase mb-2">
                    Fire Safety Assets
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

              {extractedData.deficiencies && extractedData.deficiencies.length > 0 && (
                <div className="pt-3 border-t border-slate-200">
                  <p className="text-xs font-medium text-slate-500 uppercase mb-2">Deficiencies Found</p>
                  <Alert className="border-red-200 bg-red-50">
                    <AlertCircle className="h-4 w-4 text-red-600" />
                    <AlertDescription className="text-xs text-red-800">
                      {extractedData.deficiencies.length} issue(s) require attention
                    </AlertDescription>
                  </Alert>
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
                    Create {extractedData.assets?.length || 0} Assets & Schedules
                  </>
                )}
              </Button>
            </div>

            <Alert className="border-amber-200 bg-amber-50">
              <AlertCircle className="h-4 w-4 text-amber-600" />
              <AlertDescription className="text-xs text-amber-800">
                This will create asset records and auto-generate maintenance schedules based on service frequencies.
              </AlertDescription>
            </Alert>
          </div>
        )}
      </CardContent>
    </Card>
  );
}