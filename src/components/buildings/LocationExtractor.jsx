import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Upload, Loader2, Save, Edit2, Trash2, X, MapPin, Pencil } from 'lucide-react';
import { toast } from 'sonner';
import PlanMarkupTool from './PlanMarkupTool';

const LOCATION_SCHEMA = {
  type: 'object',
  properties: {
    locations: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          floor_level: { type: 'string' },
          area_type: { type: 'string' },
          description: { type: 'string' },
          coordinates: { type: 'string' },
        },
      },
    },
  },
};

export default function LocationExtractor({ buildingId, onComplete }) {
  const [uploadedFile, setUploadedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [extractedLocations, setExtractedLocations] = useState([]);
  const [editingIndex, setEditingIndex] = useState(null);
  const [editedLocation, setEditedLocation] = useState(null);
  const queryClient = useQueryClient();

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
      setUploadedFile(null);
      if (onComplete) onComplete();
    },
  });

  const updateLocationCoordinatesMutation = useMutation({
    mutationFn: async (updates) => {
      const results = [];
      for (const update of updates) {
        if (update.id) {
          const updated = await base44.entities.Location.update(update.id, {
            coordinates: update.coordinates,
          });
          results.push(updated);
        }
      }
      return results;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['locations'] });
      toast.success('Location coordinates saved!');
    },
  });

  const handleSaveCoordinates = (coordinateUpdates) => {
    updateLocationCoordinatesMutation.mutate(coordinateUpdates);
  };

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

  const handleExtractLocations = async () => {
    if (!uploadedFile || !buildingId) return;

    setAnalyzing(true);
    try {
      const result = await base44.integrations.Core.ExtractDataFromUploadedFile({
        file_url: uploadedFile.url,
        json_schema: LOCATION_SCHEMA,
      });

      if (result.status === 'success' && result.output?.locations) {
        const locationsWithBuildingId = result.output.locations.map(location => ({
          ...location,
          building_id: buildingId,
          responsibility: 'pending_review',
          common_property: false,
          inspection_required: true,
          inspection_frequency: 'monthly',
          status: 'active',
        }));
        setExtractedLocations(locationsWithBuildingId);
        toast.success(`Extracted ${locationsWithBuildingId.length} locations from plan`);
      } else {
        toast.error('No locations found or extraction failed');
      }
    } catch (error) {
      toast.error('Failed to extract locations');
      console.error(error);
    } finally {
      setAnalyzing(false);
    }
  };

  const handleEdit = (index) => {
    setEditingIndex(index);
    setEditedLocation({ ...extractedLocations[index] });
  };

  const handleSaveEdit = () => {
    const updated = [...extractedLocations];
    updated[editingIndex] = editedLocation;
    setExtractedLocations(updated);
    setEditingIndex(null);
    setEditedLocation(null);
  };

  const handleCancelEdit = () => {
    setEditingIndex(null);
    setEditedLocation(null);
  };

  const handleDelete = (index) => {
    setExtractedLocations(extractedLocations.filter((_, i) => i !== index));
  };

  const handleCreateLocations = () => {
    if (extractedLocations.length === 0) {
      toast.error('No locations to create');
      return;
    }
    createLocationsMutation.mutate(extractedLocations);
  };

  return (
    <Tabs defaultValue="extract" className="space-y-4">
      <TabsList>
        <TabsTrigger value="extract">Extract Locations</TabsTrigger>
        <TabsTrigger value="markup" disabled={!uploadedFile || extractedLocations.length === 0}>
          Mark Up Plan
        </TabsTrigger>
      </TabsList>

      <TabsContent value="extract" className="space-y-4">
        <div>
          <Label>Upload Building Plan (PDF)</Label>
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
            onClick={handleExtractLocations}
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
                <MapPin className="h-4 w-4 mr-2" />
                Extract Locations
              </>
            )}
          </Button>
        </div>
      )}

      {extractedLocations.length > 0 && (
        <div className="space-y-3">
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
                  <TableHead>Responsibility</TableHead>
                  <TableHead className="w-20">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {extractedLocations.map((location, index) => (
                  <TableRow key={index}>
                    {editingIndex === index ? (
                      <>
                        <TableCell>
                          <Input
                            value={editedLocation.name}
                            onChange={(e) => setEditedLocation({ ...editedLocation, name: e.target.value })}
                            className="h-8"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            value={editedLocation.floor_level || ''}
                            onChange={(e) => setEditedLocation({ ...editedLocation, floor_level: e.target.value })}
                            className="h-8"
                          />
                        </TableCell>
                        <TableCell>
                          <Select
                            value={editedLocation.area_type}
                            onValueChange={(value) => setEditedLocation({ ...editedLocation, area_type: value })}
                          >
                            <SelectTrigger className="h-8">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="storage_cage">Storage Cage</SelectItem>
                              <SelectItem value="mechanical_room">Mechanical Room</SelectItem>
                              <SelectItem value="electrical_room">Electrical Room</SelectItem>
                              <SelectItem value="common_area">Common Area</SelectItem>
                              <SelectItem value="car_park">Car Park</SelectItem>
                              <SelectItem value="other">Other</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <Select
                            value={editedLocation.responsibility}
                            onValueChange={(value) => setEditedLocation({ ...editedLocation, responsibility: value })}
                          >
                            <SelectTrigger className="h-8">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="bmc">BMC</SelectItem>
                              <SelectItem value="residential_strata">Residential Strata</SelectItem>
                              <SelectItem value="owner">Owner</SelectItem>
                              <SelectItem value="pending_review">Pending Review</SelectItem>
                            </SelectContent>
                          </Select>
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
                        <TableCell className="font-medium">{location.name}</TableCell>
                        <TableCell className="text-sm text-slate-600">{location.floor_level || '—'}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{location.area_type}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={location.responsibility === 'pending_review' ? 'secondary' : 'outline'}>
                            {location.responsibility.replace(/_/g, ' ')}
                          </Badge>
                        </TableCell>
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
      </TabsContent>

      <TabsContent value="markup" className="space-y-4">
        {uploadedFile && extractedLocations.length > 0 && (
          <PlanMarkupTool
            pdfUrl={uploadedFile.url}
            locations={extractedLocations}
            onSaveCoordinates={handleSaveCoordinates}
          />
        )}
      </TabsContent>
    </Tabs>
  );
}