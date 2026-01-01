import React, { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { 
  Camera, 
  Video, 
  Mic, 
  X, 
  Loader2,
  CheckCircle2,
  AlertCircle,
  ChevronDown,
  ChevronRight,
  Image as ImageIcon,
  Play
} from 'lucide-react';
import { toast } from 'sonner';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

export default function InspectionConductor({ inspectionId, buildingId, onComplete }) {
  const [findings, setFindings] = useState([]);
  const [currentLocationIndex, setCurrentLocationIndex] = useState(0);
  const [currentAssetIndex, setCurrentAssetIndex] = useState(0);
  const [expandedLocations, setExpandedLocations] = useState({});
  const [recording, setRecording] = useState(false);
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const recognitionRef = useRef(null);
  const queryClient = useQueryClient();

  const { data: inspection } = useQuery({
    queryKey: ['inspection', inspectionId],
    queryFn: () => base44.entities.Inspection.filter({ id: inspectionId }).then(res => res[0]),
    enabled: !!inspectionId,
  });

  const { data: assets = [] } = useQuery({
    queryKey: ['assets', buildingId],
    queryFn: () => base44.entities.Asset.filter({ building_id: buildingId }),
    enabled: !!buildingId,
  });

  // Group assets by location
  const assetsByLocation = assets.reduce((acc, asset) => {
    const locationKey = asset.floor || asset.location || 'Unknown Location';
    if (!acc[locationKey]) {
      acc[locationKey] = [];
    }
    acc[locationKey].push(asset);
    return acc;
  }, {});

  const locations = Object.keys(assetsByLocation).sort();

  // Initialize findings state
  useEffect(() => {
    if (assets.length > 0 && findings.length === 0) {
      const initialFindings = locations.map(location => ({
        location,
        assets: assetsByLocation[location].map(asset => ({
          asset_id: asset.id,
          item_name: asset.name,
          category: asset.asset_main_category,
          description: '',
          status: 'ok',
          photos: [],
          videos: [],
        }))
      }));
      setFindings(initialFindings);
      // Expand first location by default
      setExpandedLocations({ [locations[0]]: true });
    }
  }, [assets, locations]);

  const saveFindingMutation = useMutation({
    mutationFn: async (findingData) => {
      const finding = await base44.entities.InspectionFinding.create({
        inspection_id: inspectionId,
        building_id: buildingId,
        ...findingData,
      });

      // Auto-create work order if status is not_working or urgent
      if (findingData.status === 'not_working' || findingData.status === 'urgent') {
        const workOrder = await base44.entities.WorkOrder.create({
          building_id: buildingId,
          asset_id: findingData.asset_id,
          title: `Issue from Inspection: ${findingData.item_name}`,
          description: findingData.description,
          main_category: findingData.category,
          priority: findingData.status === 'urgent' ? 'urgent' : 'high',
          status: 'open',
          photos: findingData.photos,
          videos: findingData.videos,
        });

        // Update finding with work order reference
        await base44.entities.InspectionFinding.update(finding.id, {
          work_order_id: workOrder.id,
          work_order_created: true,
        });

        toast.success('Work order created automatically');
      }

      return finding;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inspectionFindings'] });
    },
  });

  const updateFinding = (locationIdx, assetIdx, field, value) => {
    setFindings(prev => {
      const updated = [...prev];
      updated[locationIdx].assets[assetIdx][field] = value;
      return updated;
    });
  };

  const handlePhotoCapture = async (locationIdx, assetIdx, file) => {
    if (!file) return;
    
    setUploadingMedia(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      updateFinding(locationIdx, assetIdx, 'photos', [
        ...findings[locationIdx].assets[assetIdx].photos,
        file_url
      ]);
      toast.success('Photo uploaded');
    } catch (error) {
      toast.error('Failed to upload photo');
    } finally {
      setUploadingMedia(false);
    }
  };

  const handleVideoCapture = async (locationIdx, assetIdx, file) => {
    if (!file) return;
    
    setUploadingMedia(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      updateFinding(locationIdx, assetIdx, 'videos', [
        ...findings[locationIdx].assets[assetIdx].videos,
        file_url
      ]);
      toast.success('Video uploaded');
    } catch (error) {
      toast.error('Failed to upload video');
    } finally {
      setUploadingMedia(false);
    }
  };

  const removePhoto = (locationIdx, assetIdx, photoIdx) => {
    const currentPhotos = findings[locationIdx].assets[assetIdx].photos;
    updateFinding(locationIdx, assetIdx, 'photos', currentPhotos.filter((_, i) => i !== photoIdx));
  };

  const removeVideo = (locationIdx, assetIdx, videoIdx) => {
    const currentVideos = findings[locationIdx].assets[assetIdx].videos;
    updateFinding(locationIdx, assetIdx, 'videos', currentVideos.filter((_, i) => i !== videoIdx));
  };

  const startVoiceRecording = (locationIdx, assetIdx) => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      toast.error('Voice recognition not supported in this browser');
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    
    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.onresult = (event) => {
      let transcript = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript;
      }
      const currentDesc = findings[locationIdx].assets[assetIdx].description;
      updateFinding(locationIdx, assetIdx, 'description', currentDesc + ' ' + transcript);
    };

    recognition.onerror = (event) => {
      toast.error('Voice recognition error');
      setRecording(false);
    };

    recognition.onend = () => {
      setRecording(false);
    };

    recognition.start();
    recognitionRef.current = recognition;
    setRecording(true);
    toast.info('Listening...');
  };

  const stopVoiceRecording = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setRecording(false);
  };

  const saveAllFindings = async () => {
    const allFindings = findings.flatMap((location, locIdx) => 
      location.assets.map((asset, assetIdx) => ({
        ...asset,
        location_name: location.location,
        floor: location.location,
      }))
    );

    try {
      for (const finding of allFindings) {
        await saveFindingMutation.mutateAsync(finding);
      }
      toast.success('Inspection completed successfully!');
      if (onComplete) onComplete();
    } catch (error) {
      toast.error('Failed to save inspection findings');
    }
  };

  const toggleLocation = (location) => {
    setExpandedLocations(prev => ({
      ...prev,
      [location]: !prev[location]
    }));
  };

  const getStatusColor = (status) => {
    switch(status) {
      case 'ok': return 'text-green-600 bg-green-50 border-green-200';
      case 'needs_attention': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'not_working': return 'text-red-600 bg-red-50 border-red-200';
      case 'urgent': return 'text-orange-600 bg-orange-50 border-orange-200';
      default: return 'text-slate-600 bg-slate-50 border-slate-200';
    }
  };

  if (!inspection) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Loader2 className="h-8 w-8 mx-auto animate-spin text-blue-600" />
          <p className="text-slate-500 mt-2">Loading inspection...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Conducting Inspection: {inspection.title}</span>
            <Button onClick={saveAllFindings} disabled={saveFindingMutation.isPending}>
              {saveFindingMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Complete Inspection
                </>
              )}
            </Button>
          </CardTitle>
        </CardHeader>
      </Card>

      <div className="space-y-3">
        {findings.map((locationData, locIdx) => (
          <Card key={locationData.location} className="overflow-hidden">
            <Collapsible
              open={expandedLocations[locationData.location]}
              onOpenChange={() => toggleLocation(locationData.location)}
            >
              <CollapsibleTrigger asChild>
                <div className="flex items-center justify-between p-4 cursor-pointer hover:bg-slate-50 transition-colors">
                  <div className="flex items-center gap-3">
                    {expandedLocations[locationData.location] ? (
                      <ChevronDown className="h-5 w-5 text-slate-400" />
                    ) : (
                      <ChevronRight className="h-5 w-5 text-slate-400" />
                    )}
                    <h3 className="font-semibold text-lg">{locationData.location}</h3>
                    <Badge variant="secondary">{locationData.assets.length} items</Badge>
                  </div>
                </div>
              </CollapsibleTrigger>
              
              <CollapsibleContent>
                <div className="p-4 pt-0 space-y-4">
                  {locationData.assets.map((asset, assetIdx) => (
                    <Card key={asset.asset_id} className="border-2">
                      <CardContent className="p-4 space-y-4">
                        <div className="flex items-start justify-between">
                          <div>
                            <h4 className="font-semibold">{asset.item_name}</h4>
                            <p className="text-sm text-slate-500">{asset.category}</p>
                          </div>
                          <Select
                            value={asset.status}
                            onValueChange={(value) => updateFinding(locIdx, assetIdx, 'status', value)}
                          >
                            <SelectTrigger className={`w-40 ${getStatusColor(asset.status)}`}>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="ok">OK</SelectItem>
                              <SelectItem value="needs_attention">Needs Attention</SelectItem>
                              <SelectItem value="not_working">Not Working</SelectItem>
                              <SelectItem value="urgent">Urgent</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Description with voice input */}
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Description</label>
                          <div className="flex gap-2">
                            <Textarea
                              value={asset.description}
                              onChange={(e) => updateFinding(locIdx, assetIdx, 'description', e.target.value)}
                              placeholder="Describe any issues or observations..."
                              rows={3}
                              className="flex-1"
                            />
                            <Button
                              type="button"
                              variant={recording ? "destructive" : "outline"}
                              size="icon"
                              onClick={() => recording ? stopVoiceRecording() : startVoiceRecording(locIdx, assetIdx)}
                              className="flex-shrink-0"
                            >
                              <Mic className={`h-4 w-4 ${recording ? 'animate-pulse' : ''}`} />
                            </Button>
                          </div>
                        </div>

                        {/* Photo upload */}
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Photos</label>
                          <div className="flex flex-wrap gap-2">
                            {asset.photos.map((photo, photoIdx) => (
                              <div key={photoIdx} className="relative group">
                                <img src={photo} alt="" className="h-20 w-20 object-cover rounded border" />
                                <button
                                  onClick={() => removePhoto(locIdx, assetIdx, photoIdx)}
                                  className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                  <X className="h-3 w-3" />
                                </button>
                              </div>
                            ))}
                            <label className="h-20 w-20 border-2 border-dashed rounded flex items-center justify-center cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition-colors">
                              <input
                                type="file"
                                accept="image/*"
                                capture="environment"
                                className="hidden"
                                onChange={(e) => handlePhotoCapture(locIdx, assetIdx, e.target.files?.[0])}
                                disabled={uploadingMedia}
                              />
                              {uploadingMedia ? (
                                <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
                              ) : (
                                <Camera className="h-5 w-5 text-slate-400" />
                              )}
                            </label>
                          </div>
                        </div>

                        {/* Video upload */}
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Videos</label>
                          <div className="flex flex-wrap gap-2">
                            {asset.videos.map((video, videoIdx) => (
                              <div key={videoIdx} className="relative group">
                                <div className="h-20 w-20 bg-slate-100 rounded border flex items-center justify-center">
                                  <Play className="h-6 w-6 text-slate-400" />
                                </div>
                                <button
                                  onClick={() => removeVideo(locIdx, assetIdx, videoIdx)}
                                  className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                  <X className="h-3 w-3" />
                                </button>
                              </div>
                            ))}
                            <label className="h-20 w-20 border-2 border-dashed rounded flex items-center justify-center cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition-colors">
                              <input
                                type="file"
                                accept="video/*"
                                capture="environment"
                                className="hidden"
                                onChange={(e) => handleVideoCapture(locIdx, assetIdx, e.target.files?.[0])}
                                disabled={uploadingMedia}
                              />
                              {uploadingMedia ? (
                                <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
                              ) : (
                                <Video className="h-5 w-5 text-slate-400" />
                              )}
                            </label>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CollapsibleContent>
            </Collapsible>
          </Card>
        ))}
      </div>
    </div>
  );
}