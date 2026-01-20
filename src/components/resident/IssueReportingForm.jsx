import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { AlertCircle, CheckCircle2, Loader2, Upload } from 'lucide-react';
import { toast } from 'sonner';

export default function IssueReportingForm({ buildingId, unitId, residentName, onSuccess }) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: '',
    priority: 'medium',
    location: ''
  });
  const [uploadedImage, setUploadedImage] = useState(null);
  const [uploading, setUploading] = useState(false);

  const queryClient = useQueryClient();

  const createIssueMutation = useMutation({
    mutationFn: async (data) => {
      const { data: result } = await base44.functions.invoke('autoCreateWorkOrder', {
        buildingId,
        unitId,
        title: data.title,
        description: data.description + (uploadedImage ? `\n\nPhoto: ${uploadedImage}` : ''),
        category: data.category,
        priority: data.priority,
        location: data.location,
        reportedBy: residentName,
        source: 'resident_report'
      });
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['work-orders'] });
      toast.success('Issue reported successfully! A work order has been created.');
      setFormData({ title: '', description: '', category: '', priority: 'medium', location: '' });
      setUploadedImage(null);
      onSuccess?.();
    },
    onError: () => {
      toast.error('Failed to report issue');
    }
  });

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    try {
      const { data } = await base44.integrations.Core.UploadFile({ file });
      setUploadedImage(data.file_url);
      toast.success('Image uploaded');
    } catch (error) {
      toast.error('Failed to upload image');
    }
    setUploading(false);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.title || !formData.description || !formData.category) {
      toast.error('Please fill in all required fields');
      return;
    }
    createIssueMutation.mutate(formData);
  };

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-slate-200">
        <CardTitle className="flex items-center gap-2">
          <AlertCircle className="h-5 w-5 text-blue-600" />
          Report a Maintenance Issue
        </CardTitle>
        <CardDescription>
          Submit a maintenance request and we'll create a work order for you
        </CardDescription>
      </CardHeader>
      <CardContent className="p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="title">Issue Title *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="e.g., Leaking tap in kitchen"
              required
            />
          </div>

          <div>
            <Label htmlFor="category">Category *</Label>
            <Select value={formData.category} onValueChange={(value) => setFormData({ ...formData, category: value })}>
              <SelectTrigger>
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="plumbing">Plumbing</SelectItem>
                <SelectItem value="electrical">Electrical</SelectItem>
                <SelectItem value="hvac">Heating/Cooling</SelectItem>
                <SelectItem value="appliance">Appliance</SelectItem>
                <SelectItem value="doors_windows">Doors/Windows</SelectItem>
                <SelectItem value="flooring">Flooring</SelectItem>
                <SelectItem value="walls_ceiling">Walls/Ceiling</SelectItem>
                <SelectItem value="safety">Safety Issue</SelectItem>
                <SelectItem value="pest_control">Pest Control</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="priority">Priority</Label>
            <Select value={formData.priority} onValueChange={(value) => setFormData({ ...formData, priority: value })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low - Can wait</SelectItem>
                <SelectItem value="medium">Medium - Normal priority</SelectItem>
                <SelectItem value="high">High - Needs attention soon</SelectItem>
                <SelectItem value="urgent">Urgent - Immediate attention required</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="location">Location</Label>
            <Input
              id="location"
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              placeholder="e.g., Kitchen, Bathroom, Living room"
            />
          </div>

          <div>
            <Label htmlFor="description">Description *</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Please describe the issue in detail..."
              rows={4}
              required
            />
          </div>

          <div>
            <Label>Photo (Optional)</Label>
            <div className="mt-2">
              <label htmlFor="image-upload" className="cursor-pointer">
                <div className="border-2 border-dashed border-slate-300 rounded-lg p-6 text-center hover:border-blue-400 transition-colors">
                  {uploading ? (
                    <Loader2 className="h-8 w-8 animate-spin mx-auto text-blue-600" />
                  ) : uploadedImage ? (
                    <div>
                      <CheckCircle2 className="h-8 w-8 mx-auto text-emerald-600 mb-2" />
                      <p className="text-sm text-slate-600">Image uploaded</p>
                    </div>
                  ) : (
                    <div>
                      <Upload className="h-8 w-8 mx-auto text-slate-400 mb-2" />
                      <p className="text-sm text-slate-600">Click to upload a photo</p>
                    </div>
                  )}
                </div>
                <input
                  id="image-upload"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleImageUpload}
                />
              </label>
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <Button 
              type="submit" 
              disabled={createIssueMutation.isPending}
              className="flex-1 bg-blue-600 hover:bg-blue-700"
            >
              {createIssueMutation.isPending ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Submitting...</>
              ) : (
                <>Submit Issue Report</>
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}