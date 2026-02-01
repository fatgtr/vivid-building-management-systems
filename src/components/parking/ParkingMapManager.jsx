import React, { useState, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Upload, Edit, Trash2, MapPin, X } from 'lucide-react';
import { toast } from 'sonner';
import EmptyState from '@/components/common/EmptyState';

export default function ParkingMapManager({ maps, parkingSpaces, buildingId }) {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedMap, setSelectedMap] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    level: '',
    section: '',
    description: ''
  });
  const fileInputRef = useRef(null);
  const canvasRef = useRef(null);
  const [markers, setMarkers] = useState([]);
  const [selectedMarker, setSelectedMarker] = useState(null);

  const uploadMapMutation = useMutation({
    mutationFn: async (data) => {
      return base44.entities.ParkingPlanMap.create({
        ...data,
        building_id: buildingId
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['parkingMaps'] });
      toast.success('Parking map uploaded');
      handleCloseDialog();
    }
  });

  const deleteMapMutation = useMutation({
    mutationFn: (mapId) => base44.entities.ParkingPlanMap.delete(mapId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['parkingMaps'] });
      toast.success('Map deleted');
    }
  });

  const updateParkingMutation = useMutation({
    mutationFn: ({ spaceId, coordinates }) => {
      return base44.entities.ResidentParking.update(spaceId, {
        map_coordinates: coordinates
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['residentParking'] });
      toast.success('Parking location marked');
    }
  });

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      
      uploadMapMutation.mutate({
        ...formData,
        map_image_url: file_url
      });
    } catch (error) {
      toast.error('Failed to upload image');
      console.error(error);
    } finally {
      setUploading(false);
    }
  };

  const handleOpenDialog = () => {
    setFormData({ title: '', level: '', section: '', description: '' });
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
  };

  const handleMapClick = (e) => {
    if (!selectedMap) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    if (selectedMarker) {
      updateParkingMutation.mutate({
        spaceId: selectedMarker,
        coordinates: { x, y }
      });
      setSelectedMarker(null);
    }
  };

  const handleDeleteMap = (mapId) => {
    if (confirm('Delete this parking map?')) {
      deleteMapMutation.mutate(mapId);
    }
  };

  const getMarkersForMap = (map) => {
    return parkingSpaces.filter(space => 
      space.map_coordinates && 
      (space.level === map.level || space.section === map.section)
    );
  };

  if (maps.length === 0) {
    return (
      <>
        <EmptyState
          icon={MapPin}
          title="No Parking Maps"
          description="Upload parking plan images to mark up parking bay locations"
          actionLabel="Upload Map"
          onAction={handleOpenDialog}
        />

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Upload Parking Plan</DialogTitle>
              <DialogDescription>
                Upload an image of your parking plan to mark bay locations
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Map Title *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g., Basement 1 - North Section"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="level">Level</Label>
                  <Input
                    id="level"
                    value={formData.level}
                    onChange={(e) => setFormData({ ...formData, level: e.target.value })}
                    placeholder="e.g., B1, B2"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="section">Section</Label>
                  <Input
                    id="section"
                    value={formData.section}
                    onChange={(e) => setFormData({ ...formData, section: e.target.value })}
                    placeholder="e.g., North Wing"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Upload Image</Label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                >
                  <Upload className="h-4 w-4 mr-2" />
                  {uploading ? 'Uploading...' : 'Choose Image'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={handleOpenDialog}>
          <Plus className="h-4 w-4 mr-2" />
          Upload Map
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {maps.map((map) => {
          const mapMarkers = getMarkersForMap(map);
          
          return (
            <Card key={map.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-base">{map.title}</CardTitle>
                    {(map.level || map.section) && (
                      <CardDescription className="text-xs">
                        {map.level} {map.section}
                      </CardDescription>
                    )}
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => setSelectedMap(selectedMap?.id === map.id ? null : map)}
                    >
                      {selectedMap?.id === map.id ? (
                        <X className="h-3 w-3" />
                      ) : (
                        <Edit className="h-3 w-3" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => handleDeleteMap(map.id)}
                    >
                      <Trash2 className="h-3 w-3 text-red-500" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div
                  className="relative border rounded-lg overflow-hidden cursor-crosshair bg-slate-50"
                  onClick={handleMapClick}
                >
                  <img 
                    src={map.map_image_url} 
                    alt={map.title}
                    className="w-full h-auto"
                  />
                  {mapMarkers.map((space) => (
                    <div
                      key={space.id}
                      className="absolute w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center text-white text-xs font-bold cursor-pointer hover:scale-110 transition-transform"
                      style={{
                        left: `${space.map_coordinates.x}%`,
                        top: `${space.map_coordinates.y}%`,
                        transform: 'translate(-50%, -50%)'
                      }}
                      title={`${space.bay_number}`}
                    >
                      <MapPin className="h-3 w-3" />
                    </div>
                  ))}
                </div>
                {selectedMap?.id === map.id && (
                  <div className="mt-4 p-3 bg-blue-50 rounded-md">
                    <p className="text-sm font-medium mb-2">Mark parking locations:</p>
                    <div className="space-y-2">
                      {parkingSpaces
                        .filter(s => !s.map_coordinates)
                        .slice(0, 5)
                        .map((space) => (
                          <Button
                            key={space.id}
                            variant="outline"
                            size="sm"
                            className="w-full justify-start"
                            onClick={() => setSelectedMarker(space.id)}
                          >
                            {selectedMarker === space.id && '→ '}
                            {space.bay_number}
                          </Button>
                        ))}
                    </div>
                    {selectedMarker && (
                      <p className="text-xs text-blue-600 mt-2">
                        Click on the map to mark location
                      </p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Upload Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upload Parking Plan</DialogTitle>
            <DialogDescription>
              Upload an image of your parking plan to mark bay locations
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Map Title *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="e.g., Basement 1 - North Section"
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="level">Level</Label>
                <Input
                  id="level"
                  value={formData.level}
                  onChange={(e) => setFormData({ ...formData, level: e.target.value })}
                  placeholder="e.g., B1, B2"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="section">Section</Label>
                <Input
                  id="section"
                  value={formData.section}
                  onChange={(e) => setFormData({ ...formData, section: e.target.value })}
                  placeholder="e.g., North Wing"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Upload Image</Label>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
              >
                <Upload className="h-4 w-4 mr-2" />
                {uploading ? 'Uploading...' : 'Choose Image'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}