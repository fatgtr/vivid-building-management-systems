import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Upload, Loader2, Save, Edit2, Trash2, X, Sparkles } from 'lucide-react';
import { toast } from 'sonner';

export default function AsBuiltMechanicalExtractor({ buildingId, onComplete }) {
  const [uploadedFile, setUploadedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [extractedAssets, setExtractedAssets] = useState([]);
  const [editingIndex, setEditingIndex] = useState(null);
  const [editedAsset, setEditedAsset] = useState(null);
  const queryClient = useQueryClient();

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

  const handleExtractAssets = async () => {
    if (!uploadedFile || !buildingId) return;

    setAnalyzing(true);
    try {
      const result = await base44.integrations.Core.ExtractDataFromUploadedFile({
        file_url: uploadedFile.url,
        json_schema: {
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
          },
        },
      });

      if (result.status === 'success' && result.output?.assets) {
        const assetsWithBuildingId = result.output.assets.map(asset => ({
          ...asset,
          building_id: buildingId,
          asset_category: 'mechanical',
          document_id: uploadedFile.url,
          status: 'active',
        }));
        setExtractedAssets(assetsWithBuildingId);
        toast.success(`Extracted ${assetsWithBuildingId.length} assets from drawing`);
      } else {
        toast.error('No assets found or extraction failed');
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
        <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
          <span className="text-sm font-medium">{uploadedFile.name}</span>
          <Button
            onClick={handleExtractAssets}
            disabled={analyzing}
            size="sm"
            className="bg-blue-600 hover:bg-blue-700"
          >
            {analyzing ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-2" />
                Extract Assets
              </>
            )}
          </Button>
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
                  <TableHead>Location</TableHead>
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
    </div>
  );
}