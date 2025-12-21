import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useBuildingContext } from '@/components/BuildingContext';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import PageHeader from '@/components/common/PageHeader';
import { Upload, FileText, Loader2, CheckCircle2, XCircle, Edit2, Trash2, Save, X, Sparkles } from 'lucide-react';
import { toast } from 'sonner';

export default function AsBuiltMechanicalProcessor() {
  const { selectedBuildingId } = useBuildingContext();
  const [uploadedFile, setUploadedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [extractedAssets, setExtractedAssets] = useState([]);
  const [editingIndex, setEditingIndex] = useState(null);
  const [editedAsset, setEditedAsset] = useState(null);
  const [conversationId, setConversationId] = useState(null);
  const queryClient = useQueryClient();

  const { data: buildings = [] } = useQuery({
    queryKey: ['buildings'],
    queryFn: () => base44.entities.Building.list(),
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
      setConversationId(null);
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

  const handleAnalyze = async () => {
    if (!uploadedFile || !selectedBuildingId) {
      toast.error('Please select a building and upload a drawing');
      return;
    }

    setAnalyzing(true);
    try {
      // Create a conversation with the agent
      const conversation = await base44.agents.createConversation({
        agent_name: 'as_built_mechanical_agent',
        metadata: {
          name: `Analysis: ${uploadedFile.name}`,
          building_id: selectedBuildingId,
        },
      });
      setConversationId(conversation.id);

      // Send the file to the agent for analysis
      const building = buildings.find(b => b.id === selectedBuildingId);
      await base44.agents.addMessage(conversation, {
        role: 'user',
        content: `Please analyze this As-Built mechanical drawing and extract all mechanical assets. The drawing is for building: ${building?.name || 'Unknown'}. Extract asset details including type, location, manufacturer, model, and any other visible specifications.`,
        file_urls: [uploadedFile.url],
      });

      // Subscribe to conversation updates
      const unsubscribe = base44.agents.subscribeToConversation(conversation.id, (data) => {
        const lastMessage = data.messages[data.messages.length - 1];
        if (lastMessage && lastMessage.role === 'assistant' && !lastMessage.tool_calls?.some(tc => tc.status === 'running' || tc.status === 'in_progress')) {
          // Agent finished responding
          unsubscribe();
          setAnalyzing(false);
          
          // Parse the response to extract assets
          // This is a simplified version - in production, you'd have a more structured response
          toast.success('Analysis complete! Review the extracted assets below.');
          
          // Note: In a real implementation, you'd instruct the agent to return structured JSON
          // For now, we'll show the conversation and let users manually create a structured list
        }
      });
    } catch (error) {
      toast.error('Failed to analyze drawing');
      console.error(error);
      setAnalyzing(false);
    }
  };

  const handleExtractAssets = async () => {
    if (!uploadedFile || !selectedBuildingId) return;

    setAnalyzing(true);
    try {
      // Use the ExtractDataFromUploadedFile integration to get structured data
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
          building_id: selectedBuildingId,
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
    <div className="space-y-6">
      <PageHeader
        title="As-Built Mechanical Asset Extractor"
        subtitle="Upload mechanical drawings and let AI extract assets for your register"
      />

      {/* Upload Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-blue-600" />
            Upload As-Built Drawing
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Building</Label>
            <Select value={selectedBuildingId || ''} disabled>
              <SelectTrigger>
                <SelectValue placeholder="Select a building" />
              </SelectTrigger>
              <SelectContent>
                {buildings.map(b => (
                  <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {!selectedBuildingId && (
              <p className="text-sm text-amber-600 mt-1">Please select a building from the sidebar first</p>
            )}
          </div>

          <div>
            <Label>As-Built Mechanical Drawing (PDF)</Label>
            <div className="mt-2">
              <Button variant="outline" className="w-full" asChild disabled={uploading || !selectedBuildingId}>
                <label>
                  <Upload className="h-4 w-4 mr-2" />
                  {uploading ? 'Uploading...' : uploadedFile ? uploadedFile.name : 'Choose PDF File'}
                  <input
                    type="file"
                    accept=".pdf"
                    className="hidden"
                    onChange={handleFileSelect}
                    disabled={uploading || !selectedBuildingId}
                  />
                </label>
              </Button>
            </div>
          </div>

          {uploadedFile && (
            <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-blue-600" />
                <span className="text-sm font-medium">{uploadedFile.name}</span>
              </div>
              <Button
                onClick={handleExtractAssets}
                disabled={analyzing}
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
        </CardContent>
      </Card>

      {/* Extracted Assets Review */}
      {extractedAssets.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
                Extracted Assets ({extractedAssets.length})
              </CardTitle>
              <Button
                onClick={handleCreateAssets}
                disabled={createAssetsMutation.isPending}
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
                    Create Asset Register
                  </>
                )}
              </Button>
            </div>
            <p className="text-sm text-slate-500 mt-2">
              Review the extracted assets below. You can edit or remove items before creating the register.
            </p>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Manufacturer</TableHead>
                    <TableHead>Model</TableHead>
                    <TableHead className="w-24">Actions</TableHead>
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
                            <Input
                              value={editedAsset.model || ''}
                              onChange={(e) => setEditedAsset({ ...editedAsset, model: e.target.value })}
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
                          <TableCell className="text-sm text-slate-600">{asset.model || '—'}</TableCell>
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
          </CardContent>
        </Card>
      )}
    </div>
  );
}