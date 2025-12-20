import React, { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Camera, 
  Upload, 
  CheckCircle2, 
  AlertCircle, 
  Wifi, 
  WifiOff,
  Save,
  Send,
  Image as ImageIcon,
  X,
  AlertTriangle
} from 'lucide-react';
import { toast } from 'sonner';

const OFFLINE_STORAGE_KEY = 'offline_inspections';

export default function MobileInspectionConductor({ onClose }) {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [currentInspection, setCurrentInspection] = useState({
    building_id: '',
    unit_id: '',
    title: '',
    inspection_type: 'general',
    findings: '',
    recommendations: '',
    status: 'in_progress',
    photos: [],
    captured_photos: [],
  });
  const [offlineInspections, setOfflineInspections] = useState([]);

  const queryClient = useQueryClient();

  const { data: buildings = [] } = useQuery({
    queryKey: ['buildings'],
    queryFn: () => base44.entities.Building.list(),
  });

  const { data: units = [] } = useQuery({
    queryKey: ['units'],
    queryFn: () => base44.entities.Unit.list(),
  });

  const createMutation = useMutation({
    mutationFn: async (data) => {
      // Upload photos first
      const photoUrls = await Promise.all(
        data.captured_photos.map(async (photoData) => {
          const blob = await fetch(photoData).then(r => r.blob());
          const file = new File([blob], `inspection-${Date.now()}.jpg`, { type: 'image/jpeg' });
          const { file_url } = await base44.integrations.Core.UploadFile({ file });
          return file_url;
        })
      );

      return base44.entities.Inspection.create({
        ...data,
        photos: photoUrls,
        captured_photos: undefined,
        scheduled_date: new Date().toISOString().split('T')[0],
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inspections'] });
      toast.success('Inspection saved successfully');
      resetForm();
    },
    onError: () => {
      toast.error('Failed to save inspection');
    },
  });

  useEffect(() => {
    // Load offline inspections from localStorage
    const stored = localStorage.getItem(OFFLINE_STORAGE_KEY);
    if (stored) {
      setOfflineInspections(JSON.parse(stored));
    }

    // Listen for online/offline events
    const handleOnline = () => {
      setIsOnline(true);
      syncOfflineInspections();
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const syncOfflineInspections = async () => {
    const stored = localStorage.getItem(OFFLINE_STORAGE_KEY);
    if (!stored) return;

    const inspections = JSON.parse(stored);
    if (inspections.length === 0) return;

    toast.info(`Syncing ${inspections.length} offline inspection(s)...`);

    for (const inspection of inspections) {
      try {
        await createMutation.mutateAsync(inspection);
      } catch (error) {
        console.error('Failed to sync inspection:', error);
      }
    }

    localStorage.removeItem(OFFLINE_STORAGE_KEY);
    setOfflineInspections([]);
    toast.success('All inspections synced');
  };

  const handlePhotoCapture = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      setCurrentInspection({
        ...currentInspection,
        captured_photos: [...currentInspection.captured_photos, event.target.result],
      });
    };
    reader.readAsDataURL(file);
  };

  const removePhoto = (index) => {
    setCurrentInspection({
      ...currentInspection,
      captured_photos: currentInspection.captured_photos.filter((_, i) => i !== index),
    });
  };

  const saveOffline = () => {
    const updated = [...offlineInspections, { ...currentInspection, timestamp: Date.now() }];
    localStorage.setItem(OFFLINE_STORAGE_KEY, JSON.stringify(updated));
    setOfflineInspections(updated);
    toast.success('Inspection saved offline');
    resetForm();
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!isOnline) {
      saveOffline();
    } else {
      createMutation.mutate(currentInspection);
    }
  };

  const resetForm = () => {
    setCurrentInspection({
      building_id: '',
      unit_id: '',
      title: '',
      inspection_type: 'general',
      findings: '',
      recommendations: '',
      status: 'in_progress',
      photos: [],
      captured_photos: [],
    });
  };

  const filteredUnits = units.filter(u => u.building_id === currentInspection.building_id);

  return (
    <div className="h-full flex flex-col bg-slate-50">
      {/* Header with Status */}
      <div className={`p-4 flex items-center justify-between ${isOnline ? 'bg-emerald-600' : 'bg-orange-600'} text-white`}>
        <div className="flex items-center gap-2">
          {isOnline ? <Wifi className="h-5 w-5" /> : <WifiOff className="h-5 w-5" />}
          <span className="font-medium">{isOnline ? 'Online' : 'Offline Mode'}</span>
        </div>
        {offlineInspections.length > 0 && (
          <Badge className="bg-white text-orange-600">
            {offlineInspections.length} pending sync
          </Badge>
        )}
      </div>

      {/* Form */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <form onSubmit={handleSubmit} className="space-y-4">
          <Card>
            <CardContent className="pt-6 space-y-4">
              <div>
                <Label htmlFor="title">Inspection Title *</Label>
                <Input
                  id="title"
                  value={currentInspection.title}
                  onChange={(e) => setCurrentInspection({ ...currentInspection, title: e.target.value })}
                  placeholder="e.g., Hallway lights inspection"
                  required
                />
              </div>

              <div>
                <Label htmlFor="building">Building *</Label>
                <Select 
                  value={currentInspection.building_id} 
                  onValueChange={(v) => setCurrentInspection({ ...currentInspection, building_id: v, unit_id: '' })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select building" />
                  </SelectTrigger>
                  <SelectContent>
                    {buildings.map(b => (
                      <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="unit">Unit (optional)</Label>
                <Select 
                  value={currentInspection.unit_id} 
                  onValueChange={(v) => setCurrentInspection({ ...currentInspection, unit_id: v })}
                  disabled={!currentInspection.building_id}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Building-wide" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={null}>Building-wide</SelectItem>
                    {filteredUnits.map(u => (
                      <SelectItem key={u.id} value={u.id}>Unit {u.unit_number}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="type">Type</Label>
                <Select 
                  value={currentInspection.inspection_type} 
                  onValueChange={(v) => setCurrentInspection({ ...currentInspection, inspection_type: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="general">General</SelectItem>
                    <SelectItem value="fire_safety">Fire Safety</SelectItem>
                    <SelectItem value="electrical">Electrical</SelectItem>
                    <SelectItem value="plumbing">Plumbing</SelectItem>
                    <SelectItem value="structural">Structural</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="findings">Findings</Label>
                <Textarea
                  id="findings"
                  value={currentInspection.findings}
                  onChange={(e) => setCurrentInspection({ ...currentInspection, findings: e.target.value })}
                  rows={4}
                  placeholder="Document what you found..."
                />
              </div>

              <div>
                <Label htmlFor="recommendations">Recommendations</Label>
                <Textarea
                  id="recommendations"
                  value={currentInspection.recommendations}
                  onChange={(e) => setCurrentInspection({ ...currentInspection, recommendations: e.target.value })}
                  rows={3}
                  placeholder="Action items..."
                />
              </div>
            </CardContent>
          </Card>

          {/* Photo Capture */}
          <Card>
            <CardContent className="pt-6">
              <Label className="mb-3 block">Inspection Photos</Label>
              
              <Button type="button" variant="outline" className="w-full mb-3" asChild>
                <label className="cursor-pointer">
                  <Camera className="h-4 w-4 mr-2" />
                  Capture Photo
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    onChange={handlePhotoCapture}
                  />
                </label>
              </Button>

              {currentInspection.captured_photos.length > 0 && (
                <div className="grid grid-cols-2 gap-2">
                  {currentInspection.captured_photos.map((photo, idx) => (
                    <div key={idx} className="relative group">
                      <img 
                        src={photo} 
                        alt={`Capture ${idx + 1}`}
                        className="w-full h-32 object-cover rounded-lg"
                      />
                      <button
                        type="button"
                        onClick={() => removePhoto(idx)}
                        className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Submit Buttons */}
          <div className="flex gap-3 pb-4">
            {!isOnline && (
              <Button 
                type="button" 
                variant="outline" 
                className="flex-1"
                onClick={saveOffline}
              >
                <Save className="h-4 w-4 mr-2" />
                Save Offline
              </Button>
            )}
            <Button 
              type="submit" 
              className={`flex-1 ${isOnline ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-orange-600 hover:bg-orange-700'}`}
              disabled={createMutation.isPending}
            >
              {isOnline ? (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Submit Inspection
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save Offline
                </>
              )}
            </Button>
          </div>
        </form>

        {/* Offline Inspections Queue */}
        {offlineInspections.length > 0 && (
          <Card className="border-orange-200 bg-orange-50">
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle className="h-5 w-5 text-orange-600" />
                <h3 className="font-semibold text-orange-900">Pending Sync ({offlineInspections.length})</h3>
              </div>
              <div className="space-y-2">
                {offlineInspections.map((inspection, idx) => (
                  <div key={idx} className="bg-white rounded-lg p-3 text-sm">
                    <p className="font-medium text-slate-900">{inspection.title}</p>
                    <p className="text-xs text-slate-500 mt-1">
                      {inspection.captured_photos.length} photo(s) • {new Date(inspection.timestamp).toLocaleString()}
                    </p>
                  </div>
                ))}
              </div>
              {isOnline && (
                <Button 
                  onClick={syncOfflineInspections} 
                  className="w-full mt-3 bg-emerald-600 hover:bg-emerald-700"
                >
                  <Send className="h-4 w-4 mr-2" />
                  Sync All Now
                </Button>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}