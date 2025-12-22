import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Upload, Loader2, Save, Edit2, Trash2, X, Sparkles, MessageSquare } from 'lucide-react';
import { toast } from 'sonner';
import { useQuery } from '@tanstack/react-query';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const DEFAULT_SCHEMA = {
  type: 'object',
  properties: {
    assets: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          asset_type: { type: 'string' },
          name: { type: 'string' },
          location: { type: 'string' },
          floor: { type: 'string' },
          manufacturer: { type: 'string' },
          model: { type: 'string' },
          identifier: { type: 'string' },
          notes: { type: 'string' },
        },
      },
    },
    locations: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          floor_level: { type: 'string' },
          area_type: { type: 'string' },
          description: { type: 'string' },
        },
      },
    },
  },
};

export default function AsBuiltMechanicalExtractor({ buildingId, onComplete }) {
  const [uploadedFile, setUploadedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [extractedAssets, setExtractedAssets] = useState([]);
  const [extractedLocations, setExtractedLocations] = useState([]);
  const [editingIndex, setEditingIndex] = useState(null);
  const [editedAsset, setEditedAsset] = useState(null);
  const [extractionMode, setExtractionMode] = useState('default'); // 'default' or 'prompt'
  const [naturalLanguagePrompt, setNaturalLanguagePrompt] = useState('');
  const [generatingSchema, setGeneratingSchema] = useState(false);
  const queryClient = useQueryClient();

  // Fetch locations for the building
  const { data: locations = [] } = useQuery({
    queryKey: ['locations', buildingId],
    queryFn: () => buildingId ? base44.entities.Location.filter({ building_id: buildingId }) : [],
    enabled: !!buildingId,
  });

  const createAssetsMutation = useMutation({
    mutationFn: async (assets) => {
      const results = [];
      for (const asset of assets) {
        const created = await base44.entities.Asset.create(asset);
        results.push(created);
      }
      return results;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assets'] });
      toast.success('Asset register created successfully!');
      setExtractedAssets([]);
      setUploadedFile(null);
      if (onComplete) onComplete();
    },
  });

  const createLocationsMutation = useMutation({
    mutationFn: async (locations) => {
      const results = [];
      for (const location of locations) {
        const created = await base44.entities.Location.create(location);
        results.push(created);
      }
      return results;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['locations'] });
      toast.success('Locations created successfully!');
      setExtractedLocations([]);
    },
  });

  const handleFileSelect = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setUploadedFile({ name: file.name, url: file_url });
      toast.success('File uploaded successfully');
    } catch (error) {
      toast.error('Failed to upload file');
      console.error(error);
    } finally {
      setUploading(false);
    }
  };

  const generateSchemaFromPrompt = async () => {
    if (!naturalLanguagePrompt.trim()) {
      toast.error('Please provide a description of what to extract');
      return null;
    }

    setGeneratingSchema(true);
    try {
      const llmPrompt = `You are an AI assistant that generates JSON schemas for data extraction.

The user wants to extract information from a building mechanical drawing PDF. They have described what they want to extract as follows:

"${naturalLanguagePrompt}"

Generate a JSON schema that can be used with an extraction API. The schema must:
1. Have a root "type" of "object"
2. Contain a "properties" field with an "assets" array
3. The "assets" array should contain items with properties matching what the user described
4. Always include these base fields: asset_type, name, location
5. Add any additional fields the user mentioned

Return ONLY the JSON schema, no explanation.`;

      const response = await base44.integrations.Core.InvokeLLM({
        prompt: llmPrompt,
        response_json_schema: {
          type: 'object',
          properties: {
            schema: {
              type: 'object',
              properties: {
                type: { type: 'string' },
                properties: { type: 'object' }
              }
            }
          }
        }
      });

      return response.schema;
    } catch (error) {
      toast.error('Failed to generate schema from prompt');
      console.error(error);
      return null;
    } finally {
      setGeneratingSchema(false);
    }
  };

  const handleExtractAssets = async () => {
    if (!uploadedFile || !buildingId) return;

    let schemaToUse = DEFAULT_SCHEMA;

    // If using natural language mode, generate schema first
    if (extractionMode === 'prompt') {
      const generatedSchema = await generateSchemaFromPrompt();
      if (!generatedSchema) return;
      schemaToUse = generatedSchema;
    }

    setAnalyzing(true);
    try {
      const result = await base44.integrations.Core.ExtractDataFromUploadedFile({
        file_url: uploadedFile.url,
        json_schema: schemaToUse,
      });

      if (result.status === 'success') {
        if (result.output?.assets) {
          console.log('Raw AI extraction returned:', result.output.assets.length, 'assets');
          
          let assetsWithBuildingId = result.output.assets.map(asset => ({
            ...asset,
            building_id: buildingId,
            asset_category: 'mechanical',
            document_id: uploadedFile.url,
            status: 'active',
          }));

          // Deduplicate assets based on key properties
          const uniqueAssets = [];
          const seen = new Set();
          assetsWithBuildingId.forEach(asset => {
            const identifier = `${asset.asset_type}-${asset.name}-${asset.location}-${asset.identifier || ''}`.toLowerCase();
            if (!seen.has(identifier)) {
              seen.add(identifier);
              uniqueAssets.push(asset);
            }
          });
          
          console.log('After deduplication:', uniqueAssets.length, 'unique assets');
          setExtractedAssets(uniqueAssets);
        }
        
        if (result.output?.locations) {
          console.log('Raw AI extraction returned:', result.output.locations.length, 'locations');
          
          let locationsWithBuildingId = result.output.locations.map(location => ({
            ...location,
            building_id: buildingId,
            responsibility: 'pending_review',
            common_property: false,
            inspection_required: true,
            inspection_frequency: 'monthly',
            status: 'active',
          }));

          // Deduplicate locations based on name and floor
          const uniqueLocations = [];
          const seenLocations = new Set();
          locationsWithBuildingId.forEach(location => {
            const identifier = `${location.name}-${location.floor_level || ''}`.toLowerCase();
            if (!seenLocations.has(identifier)) {
              seenLocations.add(identifier);
              uniqueLocations.push(location);
            }
          });
          
          console.log('After deduplication:', uniqueLocations.length, 'unique locations');
          setExtractedLocations(uniqueLocations);
        }
        
        const totalCount = (result.output?.assets?.length || 0) + (result.output?.locations?.length || 0);
        toast.success(`Extracted ${totalCount} items from drawing`);
      } else {
        toast.error('No data found or extraction failed');
      }
    } catch (error) {
      toast.error('Failed to extract assets');
      console.error(error);
    } finally {
      setAnalyzing(false);
    }
  };

  const handleEdit = (index) => {
    setEditingIndex(index);
    setEditedAsset({ ...extractedAssets[index] });
  };

  const handleLocationChange = (index, locationId) => {
    const updated = [...extractedAssets];
    updated[index] = { ...updated[index], location_id: locationId };
    setExtractedAssets(updated);
  };

  const handleSaveEdit = () => {
    const updated = [...extractedAssets];
    updated[editingIndex] = editedAsset;
    setExtractedAssets(updated);
    setEditingIndex(null);
    setEditedAsset(null);
  };

  const handleCancelEdit = () => {
    setEditingIndex(null);
    setEditedAsset(null);
  };

  const handleDelete = (index) => {
    setExtractedAssets(extractedAssets.filter((_, i) => i !== index));
  };

  const handleCreateAssets = () => {
    if (extractedAssets.length === 0) {
      toast.error('No assets to create');
      return;
    }
    createAssetsMutation.mutate(extractedAssets);
  };

  const handleCreateLocations = () => {
    if (extractedLocations.length === 0) {
      toast.error('No locations to create');
      return;
    }
    createLocationsMutation.mutate(extractedLocations);
  };

  return (
    <div className="space-y-4">
      <div>
        <Label>Upload As-Built Mechanical Drawing (PDF)</Label>
        <div className="mt-2">
          <Button variant="outline" className="w-full" asChild disabled={uploading}>
            <label>
              <Upload className="h-4 w-4 mr-2" />
              {uploading ? 'Uploading...' : uploadedFile ? uploadedFile.name : 'Choose PDF File'}
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

      {uploadedFile && (
        <div className="space-y-4">
          <div className="p-4 bg-slate-50 rounded-lg border space-y-3">
            <Label>Extraction Method</Label>
            <RadioGroup value={extractionMode} onValueChange={setExtractionMode}>
              <div className="flex items-start space-x-2">
                <RadioGroupItem value="default" id="default" />
                <div className="grid gap-1.5 leading-none">
                  <label htmlFor="default" className="text-sm font-medium cursor-pointer">
                    Standard Mechanical Assets
                  </label>
                  <p className="text-xs text-slate-500">
                    Extract common mechanical assets (HVAC, pumps, valves, etc.)
                  </p>
                </div>
              </div>
              <div className="flex items-start space-x-2">
                <RadioGroupItem value="prompt" id="prompt" />
                <div className="grid gap-1.5 leading-none">
                  <label htmlFor="prompt" className="text-sm font-medium cursor-pointer">
                    Custom Extraction
                  </label>
                  <p className="text-xs text-slate-500">
                    Describe what specific information you want to extract
                  </p>
                </div>
              </div>
            </RadioGroup>

            {extractionMode === 'prompt' && (
              <div className="mt-3">
                <Label htmlFor="prompt-input" className="text-xs">Describe what to extract</Label>
                <Textarea
                  id="prompt-input"
                  placeholder="e.g., Extract all fire pumps with their model numbers, installation dates, and maintenance schedules"
                  value={naturalLanguagePrompt}
                  onChange={(e) => setNaturalLanguagePrompt(e.target.value)}
                  rows={3}
                  className="mt-1.5"
                />
              </div>
            )}
          </div>

          <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
            <span className="text-sm font-medium">{uploadedFile.name}</span>
            <Button
              onClick={handleExtractAssets}
              disabled={analyzing || generatingSchema || (extractionMode === 'prompt' && !naturalLanguagePrompt.trim())}
              size="sm"
              className="bg-blue-600 hover:bg-blue-700"
            >
              {analyzing || generatingSchema ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {generatingSchema ? 'Generating...' : 'Analyzing...'}
                </>
              ) : (
                <>
                  {extractionMode === 'prompt' ? (
                    <MessageSquare className="h-4 w-4 mr-2" />
                  ) : (
                    <Sparkles className="h-4 w-4 mr-2" />
                  )}
                  Extract Assets
                </>
              )}
            </Button>
          </div>
        </div>
      )}

      {extractedAssets.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-slate-700">
              Extracted {extractedAssets.length} asset{extractedAssets.length !== 1 ? 's' : ''}
            </p>
            <Button
              onClick={handleCreateAssets}
              disabled={createAssetsMutation.isPending}
              size="sm"
              className="bg-green-600 hover:bg-green-700"
            >
              {createAssetsMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Create Assets
                </>
              )}
            </Button>
          </div>

          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Location (Text)</TableHead>
                  <TableHead>Location (Linked)</TableHead>
                  <TableHead>Manufacturer</TableHead>
                  <TableHead className="w-20">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {extractedAssets.map((asset, index) => (
                  <TableRow key={index}>
                    {editingIndex === index ? (
                      <>
                        <TableCell>
                          <Input
                            value={editedAsset.asset_type}
                            onChange={(e) => setEditedAsset({ ...editedAsset, asset_type: e.target.value })}
                            className="h-8"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            value={editedAsset.name}
                            onChange={(e) => setEditedAsset({ ...editedAsset, name: e.target.value })}
                            className="h-8"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            value={editedAsset.location || ''}
                            onChange={(e) => setEditedAsset({ ...editedAsset, location: e.target.value })}
                            className="h-8"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            value={editedAsset.manufacturer || ''}
                            onChange={(e) => setEditedAsset({ ...editedAsset, manufacturer: e.target.value })}
                            className="h-8"
                          />
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="icon" onClick={handleSaveEdit} className="h-8 w-8">
                              <Save className="h-4 w-4 text-green-600" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={handleCancelEdit} className="h-8 w-8">
                              <X className="h-4 w-4 text-red-600" />
                            </Button>
                          </div>
                        </TableCell>
                      </>
                    ) : (
                      <>
                        <TableCell>
                          <Badge variant="outline">{asset.asset_type}</Badge>
                        </TableCell>
                        <TableCell className="font-medium">{asset.name}</TableCell>
                        <TableCell className="text-sm text-slate-600">{asset.location || '—'}</TableCell>
                        <TableCell>
                          <Select 
                            value={asset.location_id || ''} 
                            onValueChange={(value) => handleLocationChange(index, value)}
                          >
                            <SelectTrigger className="h-8 text-xs">
                              <SelectValue placeholder="Link to location" />
                            </SelectTrigger>
                            <SelectContent>
                              {locations.map((loc) => (
                                <SelectItem key={loc.id} value={loc.id}>
                                  {loc.name} ({loc.floor_level})
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell className="text-sm text-slate-600">{asset.manufacturer || '—'}</TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="icon" onClick={() => handleEdit(index)} className="h-8 w-8">
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => handleDelete(index)} className="h-8 w-8">
                              <Trash2 className="h-4 w-4 text-red-600" />
                            </Button>
                          </div>
                        </TableCell>
                      </>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {extractedLocations.length > 0 && (
        <div className="space-y-3 mt-6">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-slate-700">
              Extracted {extractedLocations.length} location{extractedLocations.length !== 1 ? 's' : ''}
            </p>
            <Button
              onClick={handleCreateLocations}
              disabled={createLocationsMutation.isPending}
              size="sm"
              className="bg-green-600 hover:bg-green-700"
            >
              {createLocationsMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Create Locations
                </>
              )}
            </Button>
          </div>

          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Floor</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Description</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {extractedLocations.map((location, index) => (
                  <TableRow key={index}>
                    <TableCell className="font-medium">{location.name}</TableCell>
                    <TableCell className="text-sm text-slate-600">{location.floor_level || '—'}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{location.area_type || 'common_area'}</Badge>
                    </TableCell>
                    <TableCell className="text-sm text-slate-600">{location.description || '—'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}
    </div>
  );
}