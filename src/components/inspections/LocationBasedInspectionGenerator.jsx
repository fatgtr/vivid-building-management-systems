import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  MapPin, 
  Loader2, 
  ClipboardCheck, 
  Download,
  CheckCircle2,
  Building2,
  AlertCircle
} from 'lucide-react';
import { toast } from 'sonner';
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ASSET_CATEGORIES } from '@/components/categories/assetCategories';

export default function LocationBasedInspectionGenerator({ buildingId, buildingName }) {
  const [selectedLocations, setSelectedLocations] = useState([]);
  const [generating, setGenerating] = useState(false);
  const queryClient = useQueryClient();

  const { data: assets = [], isLoading } = useQuery({
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

  const toggleLocation = (location) => {
    setSelectedLocations(prev => 
      prev.includes(location) 
        ? prev.filter(l => l !== location)
        : [...prev, location]
    );
  };

  const toggleAll = () => {
    if (selectedLocations.length === locations.length) {
      setSelectedLocations([]);
    } else {
      setSelectedLocations(locations);
    }
  };

  const createInspectionMutation = useMutation({
    mutationFn: async (locationData) => {
      const inspections = [];
      
      for (const location of selectedLocations) {
        const locationAssets = assetsByLocation[location];
        
        // Create detailed checklist for this location
        const checklist = locationAssets.map(asset => {
          const category = ASSET_CATEGORIES[asset.asset_main_category];
          return {
            asset_id: asset.id,
            asset_name: asset.name,
            asset_type: asset.asset_type,
            category: asset.asset_main_category,
            subcategory: asset.asset_subcategory,
            location: asset.location,
            identifier: asset.identifier,
            last_service: asset.last_service_date,
          };
        });

        const inspection = await base44.entities.Inspection.create({
          building_id: buildingId,
          title: `Location Inspection: ${location}`,
          inspection_type: 'general',
          scheduled_date: new Date().toISOString().split('T')[0],
          status: 'scheduled',
          findings: `Inspection checklist for ${location}\n\nAssets to inspect:\n${checklist.map(item => `- ${item.asset_name} (${item.asset_type})`).join('\n')}`,
          recommendations: 'Complete visual inspection of all listed assets and document any defects, maintenance needs, or safety concerns.',
        });

        inspections.push(inspection);
      }

      return inspections;
    },
    onSuccess: (inspections) => {
      queryClient.invalidateQueries({ queryKey: ['inspections'] });
      toast.success(`Created ${inspections.length} location-based inspection${inspections.length > 1 ? 's' : ''}`);
      setSelectedLocations([]);
    },
    onError: (error) => {
      toast.error('Failed to create inspections: ' + error.message);
    }
  });

  const generateInspectionList = () => {
    if (selectedLocations.length === 0) {
      toast.error('Please select at least one location');
      return;
    }
    createInspectionMutation.mutate();
  };

  const exportToPDF = async () => {
    setGenerating(true);
    try {
      // Generate PDF report with location-based asset lists
      const reportContent = selectedLocations.map(location => {
        const locationAssets = assetsByLocation[location];
        return {
          location,
          assets: locationAssets.map(asset => ({
            name: asset.name,
            type: asset.asset_type,
            identifier: asset.identifier,
            category: asset.asset_main_category,
          }))
        };
      });

      // For now, download as JSON (you can enhance this to actual PDF later)
      const blob = new Blob([JSON.stringify(reportContent, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${buildingName}-inspection-checklist.json`;
      a.click();
      URL.revokeObjectURL(url);

      toast.success('Inspection checklist exported');
    } catch (error) {
      toast.error('Export failed');
    } finally {
      setGenerating(false);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Loader2 className="h-8 w-8 mx-auto animate-spin text-blue-600" />
          <p className="text-slate-500 mt-2">Loading assets...</p>
        </CardContent>
      </Card>
    );
  }

  if (locations.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <MapPin className="h-12 w-12 mx-auto text-slate-300 mb-4" />
          <p className="text-slate-500 mb-2">No assets with location data found</p>
          <p className="text-sm text-slate-400">
            Upload asset documents to extract equipment locations and generate inspection lists
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Create location-based inspection checklists to help building managers systematically inspect assets floor by floor.
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-blue-600" />
            Select Locations for Inspection
          </CardTitle>
          <CardDescription>
            {assets.length} assets across {locations.length} locations
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between pb-3 border-b">
            <Button 
              variant="outline" 
              size="sm"
              onClick={toggleAll}
            >
              {selectedLocations.length === locations.length ? 'Deselect All' : 'Select All'}
            </Button>
            <Badge variant="secondary">
              {selectedLocations.length} of {locations.length} selected
            </Badge>
          </div>

          <div className="space-y-2 max-h-96 overflow-y-auto">
            {locations.map(location => {
              const locationAssets = assetsByLocation[location];
              const isSelected = selectedLocations.includes(location);

              return (
                <div 
                  key={location}
                  onClick={() => toggleLocation(location)}
                  className={`
                    p-4 rounded-lg border-2 transition-all cursor-pointer
                    ${isSelected 
                      ? 'border-blue-500 bg-blue-50' 
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                    }
                  `}
                >
                  <div className="flex items-start gap-3">
                    <Checkbox 
                      checked={isSelected}
                      onCheckedChange={() => toggleLocation(location)}
                      className="mt-1"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <Building2 className="h-4 w-4 text-slate-400 flex-shrink-0" />
                        <h3 className="font-semibold text-slate-900">{location}</h3>
                      </div>
                      <p className="text-sm text-slate-600 mb-2">
                        {locationAssets.length} asset{locationAssets.length !== 1 ? 's' : ''} to inspect
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {[...new Set(locationAssets.map(a => a.asset_main_category))].slice(0, 4).map(cat => {
                          const categoryInfo = ASSET_CATEGORIES[cat];
                          const Icon = categoryInfo?.icon || Building2;
                          return (
                            <Badge 
                              key={cat} 
                              variant="outline" 
                              className="text-xs"
                            >
                              <Icon className="h-3 w-3 mr-1" />
                              {categoryInfo?.label || cat}
                            </Badge>
                          );
                        })}
                        {[...new Set(locationAssets.map(a => a.asset_main_category))].length > 4 && (
                          <Badge variant="outline" className="text-xs">
                            +{[...new Set(locationAssets.map(a => a.asset_main_category))].length - 4} more
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex gap-3 pt-4 border-t">
            <Button
              onClick={exportToPDF}
              variant="outline"
              disabled={selectedLocations.length === 0 || generating}
              className="flex-1"
            >
              {generating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4 mr-2" />
                  Export Checklist
                </>
              )}
            </Button>
            <Button
              onClick={generateInspectionList}
              disabled={selectedLocations.length === 0 || createInspectionMutation.isPending}
              className="flex-1 bg-blue-600 hover:bg-blue-700"
            >
              {createInspectionMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Create Inspections
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {selectedLocations.length > 0 && (
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="pt-6">
            <h4 className="font-semibold text-blue-900 mb-3">Preview: Selected Locations</h4>
            <div className="space-y-2">
              {selectedLocations.map(location => (
                <div key={location} className="bg-white rounded-lg p-3">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-slate-900">{location}</span>
                    <Badge variant="secondary">
                      {assetsByLocation[location].length} assets
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}