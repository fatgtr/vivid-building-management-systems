import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertCircle, Upload, X, Loader2, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { ASSET_CATEGORIES, formatSubcategoryLabel, getSubcategories } from '@/components/categories/assetCategories';

export default function IssueReportingForm({ buildingId, unitId, residentName, onSuccess }) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    main_category: '',
    subcategory: '',
    priority: 'medium'
  });
  const [photos, setPhotos] = useState([]);
  const [uploading, setUploading] = useState(false);

  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: async () => {
      setUploading(true);
      
      let photoUrls = [];
      if (photos.length > 0) {
        const uploads = await Promise.all(
          photos.map(file => base44.integrations.Core.UploadFile({ file }))
        );
        photoUrls = uploads.map(r => r.file_url);
      }

      const user = await base44.auth.me();
      
      return base44.entities.WorkOrder.create({
        building_id: buildingId,
        unit_id: unitId,
        title: formData.title,
        description: formData.description,
        main_category: formData.main_category,
        subcategory: formData.subcategory,
        priority: formData.priority,
        status: 'open',
        reported_by: user.email,
        reported_by_name: residentName || user.full_name,
        photos: photoUrls
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workOrders'] });
      toast.success('Issue reported successfully');
      setFormData({ title: '', description: '', main_category: '', subcategory: '', priority: 'medium' });
      setPhotos([]);
      setUploading(false);
      if (onSuccess) onSuccess();
    },
    onError: (error) => {
      setUploading(false);
      toast.error('Failed to submit issue');
    }
  });

  const handlePhotoSelect = (e) => {
    const files = Array.from(e.target.files || []);
    if (photos.length + files.length > 5) {
      toast.error('Maximum 5 photos allowed');
      return;
    }
    setPhotos([...photos, ...files]);
  };

  const removePhoto = (index) => {
    setPhotos(photos.filter((_, i) => i !== index));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    createMutation.mutate();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertCircle className="h-5 w-5 text-blue-600" />
          Report an Issue
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="title">Issue Title *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Brief description of the issue"
              required
              className="mt-1.5"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="main_category">Category *</Label>
              <Select 
                value={formData.main_category} 
                onValueChange={(v) => setFormData({ ...formData, main_category: v, subcategory: '' })}
              >
                <SelectTrigger className="mt-1.5">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(ASSET_CATEGORIES).map(([key, cat]) => (
                    <SelectItem key={key} value={key}>{cat.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="subcategory">Sub-Category</Label>
              <Select 
                value={formData.subcategory} 
                onValueChange={(v) => setFormData({ ...formData, subcategory: v })}
                disabled={!formData.main_category}
              >
                <SelectTrigger className="mt-1.5">
                  <SelectValue placeholder={formData.main_category ? "Select sub-category" : "Select category first"} />
                </SelectTrigger>
                <SelectContent>
                  {formData.main_category && getSubcategories(formData.main_category).map(sub => (
                    <SelectItem key={sub} value={sub}>{formatSubcategoryLabel(sub)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label htmlFor="priority">Priority</Label>
            <Select value={formData.priority} onValueChange={(v) => setFormData({ ...formData, priority: v })}>
              <SelectTrigger className="mt-1.5">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="urgent">Urgent</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="description">Description *</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={4}
              placeholder="Provide detailed information about the issue"
              required
              className="mt-1.5"
            />
          </div>

          <div>
            <Label>Photos (Max 5)</Label>
            <div className="mt-1.5">
              <Button 
                type="button" 
                variant="outline" 
                className="w-full border-2 border-dashed" 
                asChild
              >
                <label className="cursor-pointer">
                  <Upload className="h-4 w-4 mr-2" />
                  Upload Photos ({photos.length}/5)
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    className="hidden"
                    onChange={handlePhotoSelect}
                    disabled={photos.length >= 5}
                  />
                </label>
              </Button>
              {photos.length > 0 && (
                <div className="grid grid-cols-3 gap-2 mt-3">
                  {photos.map((file, idx) => (
                    <div key={idx} className="relative group">
                      <img 
                        src={URL.createObjectURL(file)} 
                        alt="" 
                        className="w-full h-24 object-cover rounded-lg border"
                      />
                      <button
                        type="button"
                        onClick={() => removePhoto(idx)}
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <Button 
            type="submit" 
            className="w-full bg-blue-600 hover:bg-blue-700"
            disabled={createMutation.isPending || uploading}
          >
            {uploading || createMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Submitting...
              </>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Submit Issue
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}