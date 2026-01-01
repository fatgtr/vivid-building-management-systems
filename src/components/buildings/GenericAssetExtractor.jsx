import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Sparkles, CheckCircle, Trash2, Edit2, Save, X, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ASSET_CATEGORIES, formatSubcategoryLabel } from '@/components/categories/assetCategories';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../../utils';

export default function GenericAssetExtractor({ 
  buildingId, 
  buildingName, 
  fileUrl,
  assetCategory,
  categoryLabel,
  onComplete 
}) {
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractedAssets, setExtractedAssets] = useState([]);
  const [editingAsset, setEditingAsset] = useState(null);

  const extractAssetsMutation = useMutation({
    mutationFn: async () => {
      // Get subcategories for this asset category
      const categoryInfo = ASSET_CATEGORIES[assetCategory];
      const subcategories = categoryInfo?.subcategories || [];
      const subcategoryList = subcategories.map(sub => formatSubcategoryLabel(sub)).join(', ');

      const schema = {
        type: "object",
        properties: {
          assets: {
            type: "array",
            items: {
              type: "object",
              properties: {
                name: { type: "string", description: "Asset name/description including the subcategory type" },
                asset_type: { type: "string", description: "Specific asset type from document" },
                asset_subcategory: { 
                  type: "string", 
                  description: `MUST be one of these exact values: ${subcategories.join(', ')}. Choose the most appropriate subcategory.`,
                  enum: subcategories
                },
                identifier: { type: "string", description: "Serial number, model, or ID" },
                manufacturer: { type: "string", description: "Manufacturer name" },
                model: { type: "string", description: "Model number" },
                location: { type: "string", description: "Physical location" },
                floor: { type: "string", description: "Floor or level" },
                installation_date: { type: "string", description: "Installation date (YYYY-MM-DD)" },
                last_service_date: { type: "string", description: "Last service date (YYYY-MM-DD)" },
                service_frequency: { 
                  type: "string", 
                  enum: ["monthly", "bi_monthly", "quarterly", "half_yearly", "yearly", "bi_yearly", "custom"],
                  description: "Service frequency"
                },
                notes: { type: "string", description: "Additional details" }
              },
              required: ["name", "asset_type", "asset_subcategory"]
            }
          }
        }
      };

      return await base44.integrations.Core.InvokeLLM({
        prompt: `Analyze this ${categoryLabel} document and extract all assets, equipment, and systems.
        
Building: ${buildingName}
Document Category: ${categoryLabel}

IMPORTANT: For each asset, you MUST assign it to the most appropriate subcategory from this list:
${subcategoryList}

For example:
- "Ceiling concealed duct unit" or "FCU" should be categorized as "split_systems" or "air_conditioning_plant"
- "Chiller" should be "chillers"
- "Cooling tower" should be "cooling_towers"

Extract comprehensive details for each asset including:
- Name (include the equipment type in the name, e.g., "Level 2 Fan Coil Unit")
- Asset type (the specific equipment description from the document)
- Subcategory (MUST match one from the list above)
- Manufacturer and model
- Location and floor
- Serial/model numbers
- Installation dates
- Service requirements

Be precise with subcategory assignment - this is critical for proper asset organization.`,
        file_urls: [fileUrl],
        response_json_schema: schema
      });
    },
    onSuccess: (data) => {
      if (data?.assets && data.assets.length > 0) {
        setExtractedAssets(data.assets);
        toast.success(`Extracted ${data.assets.length} assets`);
      } else {
        toast.error('No assets found in document');
      }
    },
    onError: () => {
      toast.error('Failed to extract assets');
    }
  });

  const createAssetsMutation = useMutation({
    mutationFn: async (assets) => {
      const results = [];
      for (const asset of assets) {
        try {
          const created = await base44.entities.Asset.create({
            building_id: buildingId,
            asset_main_category: assetCategory,
            asset_subcategory: asset.asset_subcategory,
            asset_type: asset.asset_type,
            name: asset.name,
            identifier: asset.identifier,
            manufacturer: asset.manufacturer,
            model: asset.model,
            location: asset.location,
            floor: asset.floor,
            installation_date: asset.installation_date,
            last_service_date: asset.last_service_date,
            service_frequency: asset.service_frequency,
            notes: asset.notes,
            status: 'active'
          });
          results.push(created);
        } catch (error) {
          console.error('Failed to create asset:', error);
        }
      }
      return results;
    },
    onSuccess: (results) => {
      toast.success(
        <div className="flex items-center gap-2">
          <span>Successfully created {results.length} assets</span>
          <Link to={createPageUrl('AssetRegister') + `?building_id=${buildingId}`} className="underline">
            View Assets
          </Link>
        </div>
      );
      onComplete?.();
    }
  });

  const handleExtract = () => {
    setIsExtracting(true);
    extractAssetsMutation.mutate();
    setIsExtracting(false);
  };

  const handleSaveEdit = (index) => {
    const updatedAssets = [...extractedAssets];
    updatedAssets[index] = editingAsset;
    setExtractedAssets(updatedAssets);
    setEditingAsset(null);
    toast.success('Asset updated');
  };

  const handleDeleteAsset = (index) => {
    setExtractedAssets(extractedAssets.filter((_, i) => i !== index));
    toast.success('Asset removed');
  };

  const handleSaveAll = () => {
    if (extractedAssets.length === 0) {
      toast.error('No assets to save');
      return;
    }
    createAssetsMutation.mutate(extractedAssets);
  };

  return (
    <div className="space-y-6">
      <Alert>
        <Sparkles className="h-4 w-4" />
        <AlertDescription>
          AI will extract asset information from your {categoryLabel} document and automatically populate the Asset Register.
        </AlertDescription>
      </Alert>

      {extractedAssets.length === 0 && (
        <div className="text-center py-8">
          <Button 
            onClick={handleExtract} 
            disabled={isExtracting || extractAssetsMutation.isPending}
            size="lg"
          >
            {(isExtracting || extractAssetsMutation.isPending) ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Extracting Assets...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-2" />
                Extract Assets with AI
              </>
            )}
          </Button>
        </div>
      )}

      {extractedAssets.length > 0 && (
        <>
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">Extracted Assets ({extractedAssets.length})</h3>
              <p className="text-sm text-slate-500">
                Review and edit before saving to Asset Register
              </p>
            </div>
            <div className="flex gap-2">
              <Link to={createPageUrl('AssetRegister') + `?building_id=${buildingId}`}>
                <Button variant="outline" size="sm">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  View Asset Register
                </Button>
              </Link>
              <Button onClick={handleSaveAll} disabled={createAssetsMutation.isPending}>
                {createAssetsMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Save All to Asset Register
                  </>
                )}
              </Button>
            </div>
          </div>

          <div className="space-y-3">
            {extractedAssets.map((asset, index) => (
              <Card key={index}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-base">{asset.name}</CardTitle>
                      <CardDescription className="flex items-center gap-2 mt-1">
                        <Badge variant="outline">{asset.asset_type}</Badge>
                        {asset.asset_subcategory && (
                          <Badge variant="secondary">{asset.asset_subcategory}</Badge>
                        )}
                      </CardDescription>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setEditingAsset({ ...asset, _index: index })}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteAsset(index)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="text-sm space-y-1">
                  {asset.manufacturer && (
                    <p><span className="font-medium">Manufacturer:</span> {asset.manufacturer}</p>
                  )}
                  {asset.model && (
                    <p><span className="font-medium">Model:</span> {asset.model}</p>
                  )}
                  {asset.identifier && (
                    <p><span className="font-medium">ID/Serial:</span> {asset.identifier}</p>
                  )}
                  {asset.location && (
                    <p><span className="font-medium">Location:</span> {asset.location}</p>
                  )}
                  {asset.floor && (
                    <p><span className="font-medium">Floor:</span> {asset.floor}</p>
                  )}
                  {asset.installation_date && (
                    <p><span className="font-medium">Installed:</span> {asset.installation_date}</p>
                  )}
                  {asset.service_frequency && (
                    <p><span className="font-medium">Service Frequency:</span> {asset.service_frequency}</p>
                  )}
                  {asset.notes && (
                    <p className="text-slate-600 mt-2">{asset.notes}</p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}

      {editingAsset && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <CardHeader>
              <CardTitle>Edit Asset</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Name *</Label>
                  <Input
                    value={editingAsset.name}
                    onChange={(e) => setEditingAsset({ ...editingAsset, name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Asset Type *</Label>
                  <Input
                    value={editingAsset.asset_type}
                    onChange={(e) => setEditingAsset({ ...editingAsset, asset_type: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Subcategory</Label>
                  <Select
                    value={editingAsset.asset_subcategory || ''}
                    onValueChange={(value) => setEditingAsset({ ...editingAsset, asset_subcategory: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select subcategory" />
                    </SelectTrigger>
                    <SelectContent>
                      {ASSET_CATEGORIES[assetCategory]?.subcategories?.map((sub) => (
                        <SelectItem key={sub} value={sub}>
                          {formatSubcategoryLabel(sub)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>ID/Serial</Label>
                  <Input
                    value={editingAsset.identifier || ''}
                    onChange={(e) => setEditingAsset({ ...editingAsset, identifier: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Manufacturer</Label>
                  <Input
                    value={editingAsset.manufacturer || ''}
                    onChange={(e) => setEditingAsset({ ...editingAsset, manufacturer: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Model</Label>
                  <Input
                    value={editingAsset.model || ''}
                    onChange={(e) => setEditingAsset({ ...editingAsset, model: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Location</Label>
                  <Input
                    value={editingAsset.location || ''}
                    onChange={(e) => setEditingAsset({ ...editingAsset, location: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Floor</Label>
                  <Input
                    value={editingAsset.floor || ''}
                    onChange={(e) => setEditingAsset({ ...editingAsset, floor: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Installation Date</Label>
                  <Input
                    type="date"
                    value={editingAsset.installation_date || ''}
                    onChange={(e) => setEditingAsset({ ...editingAsset, installation_date: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Service Frequency</Label>
                  <Select
                    value={editingAsset.service_frequency || ''}
                    onValueChange={(value) => setEditingAsset({ ...editingAsset, service_frequency: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select frequency" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="monthly">Monthly</SelectItem>
                      <SelectItem value="bi_monthly">Bi-Monthly</SelectItem>
                      <SelectItem value="quarterly">Quarterly</SelectItem>
                      <SelectItem value="half_yearly">Half-Yearly</SelectItem>
                      <SelectItem value="yearly">Yearly</SelectItem>
                      <SelectItem value="bi_yearly">Bi-Yearly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Notes</Label>
                <Textarea
                  value={editingAsset.notes || ''}
                  onChange={(e) => setEditingAsset({ ...editingAsset, notes: e.target.value })}
                  rows={3}
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setEditingAsset(null)}>
                  <X className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
                <Button onClick={() => handleSaveEdit(editingAsset._index)}>
                  <Save className="h-4 w-4 mr-2" />
                  Save Changes
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}