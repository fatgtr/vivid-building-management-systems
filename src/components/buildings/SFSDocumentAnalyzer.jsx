import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Upload, Loader2, FileText, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

export default function SFSDocumentAnalyzer({ buildingId, locations, onAnalysisComplete }) {
  const [uploadedDoc, setUploadedDoc] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisResults, setAnalysisResults] = useState(null);
  const queryClient = useQueryClient();

  const updateLocationsMutation = useMutation({
    mutationFn: async (updates) => {
      const results = [];
      for (const update of updates) {
        if (update.id) {
          const updated = await base44.entities.Location.update(update.id, {
            responsibility: update.responsibility,
            common_property: update.common_property,
            sfs_schedule_reference: update.sfs_schedule_reference,
          });
          results.push(updated);
        }
      }
      return results;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['locations'] });
      toast.success('Location responsibilities updated!');
      if (onAnalysisComplete) onAnalysisComplete();
    },
  });

  const handleFileSelect = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setUploadedDoc({ name: file.name, url: file_url });
      toast.success('SFS document uploaded successfully');
    } catch (error) {
      toast.error('Failed to upload document');
      console.error(error);
    } finally {
      setUploading(false);
    }
  };

  const handleAnalyze = async () => {
    if (!uploadedDoc || !locations || locations.length === 0) {
      toast.error('No document or locations to analyze');
      return;
    }

    setAnalyzing(true);
    try {
      // Create a structured prompt for the LLM
      const locationsList = locations.map(loc => 
        `- ${loc.name} (Type: ${loc.area_type}, Floor: ${loc.floor_level})`
      ).join('\n');

      const prompt = `You are analyzing a Strata Management Statement (specifically the SFS Schedule A and Schedule B sections) to determine responsibility for building areas.

LOCATIONS TO ANALYZE:
${locationsList}

STRATA MANAGEMENT DOCUMENT:
Analyze the uploaded document and determine for each location:
1. Who is responsible: BMC (Building Management Committee), Residential Strata Manager, or Owner
2. Whether it's classified as common property
3. The specific schedule reference (e.g., "Schedule A, Item 5" or "Schedule B, Section 2.3")

For parking spaces and storage cages:
- If part of common property, typically BMC responsibility
- If allocated to individual lots, typically Owner responsibility
- Check schedules for specific allocations

For mechanical rooms, lift lobbies, stairs:
- Usually BMC responsibility as essential services
- Should be common property

Return results in the exact format requested in the JSON schema.`;

      const response = await base44.integrations.Core.InvokeLLM({
        prompt: prompt,
        file_urls: [uploadedDoc.url],
        response_json_schema: {
          type: 'object',
          properties: {
            analysis: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  location_name: { type: 'string' },
                  responsibility: { type: 'string', enum: ['bmc', 'residential_strata', 'owner', 'pending_review'] },
                  common_property: { type: 'boolean' },
                  sfs_schedule_reference: { type: 'string' },
                  reasoning: { type: 'string' }
                }
              }
            }
          }
        }
      });

      if (response.analysis && response.analysis.length > 0) {
        setAnalysisResults(response.analysis);
        toast.success(`Analyzed ${response.analysis.length} locations`);
      } else {
        toast.error('No analysis results returned');
      }
    } catch (error) {
      toast.error('Failed to analyze document');
      console.error(error);
    } finally {
      setAnalyzing(false);
    }
  };

  const handleApplyResults = () => {
    if (!analysisResults) return;

    const updates = analysisResults.map(result => {
      const location = locations.find(loc => loc.name === result.location_name);
      return location ? {
        id: location.id,
        responsibility: result.responsibility,
        common_property: result.common_property,
        sfs_schedule_reference: result.sfs_schedule_reference,
      } : null;
    }).filter(Boolean);

    if (updates.length > 0) {
      updateLocationsMutation.mutate(updates);
    }
  };

  const getResponsibilityColor = (responsibility) => {
    switch (responsibility) {
      case 'bmc': return 'bg-blue-100 text-blue-800';
      case 'residential_strata': return 'bg-purple-100 text-purple-800';
      case 'owner': return 'bg-green-100 text-green-800';
      default: return 'bg-slate-100 text-slate-800';
    }
  };

  return (
    <div className="space-y-4">
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Upload your Strata Management Statement (SFS) with Schedule A and B to automatically assign responsibility for locations.
        </AlertDescription>
      </Alert>

      <div>
        <Label>Upload SFS Document (PDF)</Label>
        <div className="mt-2">
          <Button variant="outline" className="w-full" asChild disabled={uploading}>
            <label>
              <Upload className="h-4 w-4 mr-2" />
              {uploading ? 'Uploading...' : uploadedDoc ? uploadedDoc.name : 'Choose SFS PDF'}
              <input
                type="file"
                accept=".pdf"
                className="hidden"
                onChange={handleFileSelect}
                disabled={uploading}
              />
            </label>
          </Button>
        </div>
      </div>

      {uploadedDoc && (
        <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg border border-blue-200">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-blue-600" />
            <span className="text-sm font-medium">{uploadedDoc.name}</span>
          </div>
          <Button
            onClick={handleAnalyze}
            disabled={analyzing || locations.length === 0}
            size="sm"
            className="bg-blue-600 hover:bg-blue-700"
          >
            {analyzing ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Analyzing...
              </>
            ) : (
              'Analyze Document'
            )}
          </Button>
        </div>
      )}

      {analysisResults && analysisResults.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold">Analysis Results</h4>
            <Button
              onClick={handleApplyResults}
              disabled={updateLocationsMutation.isPending}
              size="sm"
              className="bg-green-600 hover:bg-green-700"
            >
              {updateLocationsMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Applying...
                </>
              ) : (
                'Apply to Locations'
              )}
            </Button>
          </div>

          <div className="border rounded-lg divide-y max-h-96 overflow-y-auto">
            {analysisResults.map((result, index) => (
              <div key={index} className="p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-medium">{result.location_name}</span>
                  <div className="flex items-center gap-2">
                    <Badge className={getResponsibilityColor(result.responsibility)}>
                      {result.responsibility.replace(/_/g, ' ')}
                    </Badge>
                    {result.common_property && (
                      <Badge variant="outline" className="bg-amber-50 text-amber-800">
                        Common Property
                      </Badge>
                    )}
                  </div>
                </div>
                {result.sfs_schedule_reference && (
                  <p className="text-xs text-slate-600">
                    <strong>Reference:</strong> {result.sfs_schedule_reference}
                  </p>
                )}
                {result.reasoning && (
                  <p className="text-xs text-slate-600">{result.reasoning}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}