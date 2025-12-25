import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Image as ImageIcon, Upload, X, Loader2, ZoomIn } from 'lucide-react';
import { toast } from 'sonner';

export default function AssetPhotos({ asset }) {
  const [uploading, setUploading] = useState(false);
  const [viewingPhoto, setViewingPhoto] = useState(null);
  const queryClient = useQueryClient();

  const uploadPhotoMutation = useMutation({
    mutationFn: async (file) => {
      setUploading(true);
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      const existingPhotos = asset.photos || [];
      await base44.entities.Asset.update(asset.id, {
        photos: [...existingPhotos, file_url]
      });
      return file_url;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assets'] });
      setUploading(false);
      toast.success('Photo uploaded successfully');
    },
    onError: () => {
      setUploading(false);
      toast.error('Failed to upload photo');
    }
  });

  const deletePhotoMutation = useMutation({
    mutationFn: async (photoUrl) => {
      const updatedPhotos = (asset.photos || []).filter(url => url !== photoUrl);
      await base44.entities.Asset.update(asset.id, {
        photos: updatedPhotos
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assets'] });
      toast.success('Photo deleted successfully');
    },
    onError: () => {
      toast.error('Failed to delete photo');
    }
  });

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    uploadPhotoMutation.mutate(file);
  };

  const photos = asset.photos || [];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="font-medium text-slate-900 flex items-center gap-2">
          <ImageIcon className="h-4 w-4" />
          Asset Photos ({photos.length})
        </h4>
        <div>
          <input
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
            id={`photo-upload-${asset.id}`}
            disabled={uploading}
          />
          <label htmlFor={`photo-upload-${asset.id}`}>
            <Button size="sm" variant="outline" disabled={uploading} asChild>
              <div className="cursor-pointer">
                {uploading ? (
                  <>
                    <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="h-3 w-3 mr-1" />
                    Add Photo
                  </>
                )}
              </div>
            </Button>
          </label>
        </div>
      </div>

      {photos.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-8 text-center">
            <ImageIcon className="h-8 w-8 mx-auto mb-2 text-slate-300" />
            <p className="text-sm text-slate-500">No photos yet</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {photos.map((photoUrl, idx) => (
            <div key={idx} className="relative group">
              <div className="aspect-square rounded-lg overflow-hidden bg-slate-100 border-2 border-slate-200">
                <img
                  src={photoUrl}
                  alt={`${asset.name} photo ${idx + 1}`}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center gap-2">
                <Button
                  size="icon"
                  variant="secondary"
                  className="h-8 w-8"
                  onClick={() => setViewingPhoto(photoUrl)}
                >
                  <ZoomIn className="h-4 w-4" />
                </Button>
                <Button
                  size="icon"
                  variant="destructive"
                  className="h-8 w-8"
                  onClick={() => deletePhotoMutation.mutate(photoUrl)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={!!viewingPhoto} onOpenChange={() => setViewingPhoto(null)}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>{asset.name}</DialogTitle>
          </DialogHeader>
          {viewingPhoto && (
            <div className="max-h-[70vh] overflow-auto">
              <img
                src={viewingPhoto}
                alt={asset.name}
                className="w-full h-auto"
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}