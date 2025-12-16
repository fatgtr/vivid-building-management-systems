import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Upload, FileText, Loader2, CheckCircle2, AlertCircle, Database, MapPin } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from "@/components/ui/badge";

export default function SubdivisionPlanExtractor({ buildingId, buildingName }) {
  const [uploading, setUploading] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [planFile, setPlanFile] = useState(null);
  const [extractedData, setExtractedData] = useState(null);
  const queryClient = useQueryClient();

  const populateUnitsMutation = useMutation({
    mutationFn: async (unitsData) => {
      const promises = unitsData.map(unit => 
        base44.entities.Unit.create(unit)
      );
      return Promise.all(promises);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['units'] });
      toast.success(`Successfully created ${data.length} unit records!`);
      setExtractedData(null);
      setPlanFile(null);
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

  const handleExtractPlan = async () => {
    if (!planFile) {
      toast.error('Please select a plan file first');
      return;
    }

    setUploading(true);
    setExtracting(false);

    try {
      // Upload the file
      const { file_url } = await base44.integrations.Core.UploadFile({ file: planFile });

      setUploading(false);
      setExtracting(true);

      // Extract data from the plan
      const { data } = await base44.functions.invoke('extractSubdivisionPlan', {
        file_url,
        buildingId
      });

      if (data.success) {
        setExtractedData(data.data);
        toast.success('Plan data extracted successfully!');
      } else {
        toast.error('Failed to extract plan data: ' + data.error);
      }
    } catch (error) {
      console.error('Plan extraction error:', error);
      toast.error('Failed to extract plan: ' + error.message);
    } finally {
      setUploading(false);
      setExtracting(false);
    }
  };

  const handlePopulateUnits = () => {
    if (!extractedData || !extractedData.unit_lot_mapping) {
      toast.error('No unit data to populate');
      return;
    }

    const unitsToCreate = extractedData.unit_lot_mapping
      .filter(mapping => mapping.lot_number !== 'CP' && mapping.unit_number !== 'CP')
      .map(mapping => ({
        building_id: buildingId,
        unit_number: mapping.unit_number,
        lot_number: mapping.lot_number,
        status: 'vacant'
      }));

    if (unitsToCreate.length === 0) {
      toast.error('No valid units found in the extracted data');
      return;
    }

    populateUnitsMutation.mutate(unitsToCreate);
  };

  return (
    <Card className="border-2 border-indigo-100">
      <CardHeader className="bg-gradient-to-r from-indigo-50 to-blue-50">
        <CardTitle className="flex items-center gap-2">
          <MapPin className="h-5 w-5 text-indigo-600" />
          Subdivision Plan Analysis
        </CardTitle>
        <CardDescription>
          Upload strata subdivision plans to extract unit/lot information and build asset register
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-6 space-y-4">
        
        {!extractedData && (
          <>
            <div className="border-2 border-dashed border-slate-200 rounded-lg p-8 text-center">
              <input
                type="file"
                accept="application/pdf"
                onChange={handleFileSelect}
                className="hidden"
                id="plan-upload"
              />
              <label htmlFor="plan-upload" className="cursor-pointer">
                <div className="flex flex-col items-center gap-3">
                  <div className="w-16 h-16 rounded-full bg-indigo-100 flex items-center justify-center">
                    <FileText className="h-8 w-8 text-indigo-600" />
                  </div>
                  <div>
                    <p className="font-medium text-slate-700">
                      {planFile ? planFile.name : 'Click to upload subdivision plan'}
                    </p>
                    <p className="text-sm text-slate-500 mt-1">
                      PDF format only
                    </p>
                  </div>
                </div>
              </label>
            </div>

            <Alert className="border-blue-200 bg-blue-50">
              <AlertCircle className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-sm text-slate-700">
                The AI will extract:
                <ul className="list-disc list-inside mt-2 space-y-1">
                  <li>Building details and strata plan number</li>
                  <li>Easements and their descriptions</li>
                  <li>Lot-to-unit mapping (PT numbers)</li>
                  <li>Common areas and assets on each level</li>
                  <li>Legend abbreviations (CP, CS, S, etc.)</li>
                </ul>
              </AlertDescription>
            </Alert>

            <Button
              onClick={handleExtractPlan}
              disabled={!planFile || uploading || extracting}
              className="w-full bg-indigo-600 hover:bg-indigo-700"
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
                  Extract Plan Data
                </>
              )}
            </Button>
          </>
        )}

        {extractedData && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-green-600">
              <CheckCircle2 className="h-5 w-5" />
              <span className="font-medium">Plan Data Extracted Successfully!</span>
            </div>

            <div className="bg-slate-50 rounded-lg p-4 space-y-3">
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase">Building Information</p>
                <p className="text-sm font-semibold text-slate-900">{extractedData.building_name || 'N/A'}</p>
                <p className="text-sm text-slate-600">{extractedData.full_address || 'N/A'}</p>
                <div className="flex gap-2 mt-2">
                  <Badge variant="outline">SP: {extractedData.strata_plan_number || 'N/A'}</Badge>
                  <Badge variant="outline">{extractedData.total_stories || 0} Stories</Badge>
                </div>
              </div>

              {extractedData.easements && extractedData.easements.length > 0 && (
                <div className="pt-3 border-t border-slate-200">
                  <p className="text-xs font-medium text-slate-500 uppercase mb-2">Easements</p>
                  <div className="space-y-1">
                    {extractedData.easements.slice(0, 3).map((easement, idx) => (
                      <p key={idx} className="text-xs text-slate-600">
                        • {easement.type}
                      </p>
                    ))}
                    {extractedData.easements.length > 3 && (
                      <p className="text-xs text-slate-400">
                        + {extractedData.easements.length - 3} more
                      </p>
                    )}
                  </div>
                </div>
              )}

              {extractedData.unit_lot_mapping && (
                <div className="pt-3 border-t border-slate-200">
                  <p className="text-xs font-medium text-slate-500 uppercase mb-2">
                    Unit/Lot Mapping
                  </p>
                  <p className="text-sm text-slate-600">
                    {extractedData.unit_lot_mapping.length} lots identified
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    {extractedData.unit_lot_mapping.filter(m => m.lot_number !== 'CP').length} residential/commercial units
                  </p>
                </div>
              )}

              {extractedData.levels && (
                <div className="pt-3 border-t border-slate-200">
                  <p className="text-xs font-medium text-slate-500 uppercase mb-2">
                    Levels Analyzed
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {extractedData.levels.slice(0, 8).map((level, idx) => (
                      <Badge key={idx} variant="secondary" className="text-xs">
                        {level.name}
                      </Badge>
                    ))}
                    {extractedData.levels.length > 8 && (
                      <Badge variant="secondary" className="text-xs">
                        +{extractedData.levels.length - 8} more
                      </Badge>
                    )}
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
                onClick={handlePopulateUnits}
                disabled={populateUnitsMutation.isPending || !extractedData.unit_lot_mapping}
                className="flex-1 bg-green-600 hover:bg-green-700"
              >
                {populateUnitsMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Creating Units...
                  </>
                ) : (
                  <>
                    <Database className="h-4 w-4 mr-2" />
                    Populate {extractedData.unit_lot_mapping?.filter(m => m.lot_number !== 'CP').length || 0} Units
                  </>
                )}
              </Button>
            </div>

            <Alert className="border-amber-200 bg-amber-50">
              <AlertCircle className="h-4 w-4 text-amber-600" />
              <AlertDescription className="text-xs text-amber-800">
                Review the extracted data above. Click "Populate Units" to create unit records in the database.
              </AlertDescription>
            </Alert>
          </div>
        )}
      </CardContent>
    </Card>
  );
}