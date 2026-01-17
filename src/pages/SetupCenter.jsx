import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  Building2,
  CheckCircle,
  ChevronRight,
  Package,
  Users,
  Wrench,
  HelpCircle,
  QrCode,
  Mail,
  Plus,
  Trash2,
  Upload,
  FileText,
  ExternalLink
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '../utils';

const SETUP_STEPS = [
  {
    id: 'registration',
    title: 'Complete Registration',
    description: 'Set up your account',
    completed: true,
  },
  {
    id: 'building',
    title: 'Add Your Building',
    description: 'Add your first building or property',
    icon: Building2,
  },
  {
    id: 'location',
    title: 'Add a Location',
    description: 'Define areas within your building (e.g., "Level 2", "Basement")',
    icon: Building2,
  },
  {
    id: 'asset',
    title: 'Add an Asset',
    description: 'Something your team maintains, like equipment or systems',
    icon: Package,
  },
  {
    id: 'upload_asset_register',
    title: 'Upload Asset Register',
    description: 'Upload existing asset register (PDF or Excel)',
    icon: Package,
  },
  {
    id: 'invite_team',
    title: 'Invite the whole team',
    description: 'Add staff members and contractors',
    icon: Users,
  },
  {
    id: 'share_portal',
    title: 'Share Request Portal',
    description: 'Enable residents to submit requests',
    icon: Mail,
  },
];

export default function SetupCenter() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [currentStep, setCurrentStep] = useState(1);
  const [showHelp, setShowHelp] = useState(false);

  // Get buildingId from URL params
  const urlParams = new URLSearchParams(window.location.search);
  const buildingIdFromUrl = urlParams.get('buildingId');

  // Form states
  const [buildingForm, setBuildingForm] = useState({
    name: '',
    address: '',
    city: '',
    state: '',
    postal_code: '',
    floors: '',
    total_units: '',
    image_url: '',
    strata_plan_number: '',
    is_bmc: false,
    bmc_strata_plans: [], // Array of additional strata plans under BMC
  });

  const [locationForm, setLocationForm] = useState({
    name: '',
    building_id: '',
    floor: '',
    description: '',
    qr_code: '',
  });

  const [assetForm, setAssetForm] = useState({
    name: '',
    building_id: '',
    location_id: '',
    asset_main_category: '',
    asset_type: '',
    manufacturer: '',
    model: '',
    serial_number: '',
    criticality: 'medium',
    description: '',
  });

  const [uploadingRegister, setUploadingRegister] = useState(false);
  const [uploadedRegister, setUploadedRegister] = useState(null);

  // Fetch existing data to determine progress
  const { data: buildings = [] } = useQuery({
    queryKey: ['buildings'],
    queryFn: () => base44.entities.Building.list(),
  });

  const { data: locations = [] } = useQuery({
    queryKey: ['locations'],
    queryFn: () => base44.entities.Location.list(),
    enabled: buildings.length > 0,
  });

  const { data: assets = [] } = useQuery({
    queryKey: ['assets'],
    queryFn: () => base44.entities.Asset.list(),
    enabled: buildings.length > 0,
  });



  // Determine which step to show
  useEffect(() => {
    // If buildingId is in URL, we're coming from Buildings page after creating
    if (buildingIdFromUrl && buildings.length > 0) {
      const targetBuilding = buildings.find(b => b.id === buildingIdFromUrl);
      if (targetBuilding) {
        setBuildingForm(targetBuilding);
        setLocationForm({ ...locationForm, building_id: targetBuilding.id });
        setAssetForm({ ...assetForm, building_id: targetBuilding.id });
        
        // Start at location step since building is already created
        if (locations.filter(l => l.building_id === buildingIdFromUrl).length === 0) {
          setCurrentStep(2);
        } else if (assets.filter(a => a.building_id === buildingIdFromUrl).length === 0) {
          setCurrentStep(3);
          setAssetForm({ 
            ...assetForm, 
            building_id: buildingIdFromUrl,
            location_id: locations.find(l => l.building_id === buildingIdFromUrl)?.id 
          });
        } else {
          setCurrentStep(4);
        }
        return;
      }
    }

    // Normal flow for first-time users
    if (buildings.length === 0) {
      setCurrentStep(1);
    } else if (locations.length === 0) {
      setCurrentStep(2);
      setBuildingForm(buildings[0]);
      setLocationForm({ ...locationForm, building_id: buildings[0].id });
    } else if (assets.length === 0) {
      setCurrentStep(3);
      setAssetForm({ 
        ...assetForm, 
        building_id: buildings[0].id,
        location_id: locations[0]?.id 
      });
    } else {
      setCurrentStep(4);
    }
  }, [buildings, locations, assets, buildingIdFromUrl]);

  // Mutations
  const createBuildingMutation = useMutation({
    mutationFn: (data) => base44.entities.Building.create(data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['buildings'] });
      setLocationForm({ ...locationForm, building_id: data.id });
      setCurrentStep(2);
      toast.success('Building added successfully!');
    },
  });

  const createLocationMutation = useMutation({
    mutationFn: (data) => base44.entities.Location.create(data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['locations'] });
      setAssetForm({ ...assetForm, location_id: data.id });
      setCurrentStep(3);
      toast.success('Location added successfully!');
    },
  });

  const createAssetMutation = useMutation({
    mutationFn: (data) => base44.entities.Asset.create(data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['assets'] });
      setCurrentStep(4);
      toast.success('Asset added successfully!');
    },
  });



  const handleBuildingSubmit = (e) => {
    e.preventDefault();
    createBuildingMutation.mutate(buildingForm);
  };

  const handleLocationSubmit = (e) => {
    e.preventDefault();
    createLocationMutation.mutate(locationForm);
  };

  const handleAssetSubmit = (e) => {
    e.preventDefault();
    createAssetMutation.mutate(assetForm);
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingRegister(true);
    try {
      // Upload file
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      
      toast.success('File uploaded! Processing with AI...');
      
      // Process with AI to extract assets
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Extract all assets from this asset register document. For each asset, provide: name, category, type, location, manufacturer, model, serial number, installation date, and any compliance/service information. Return as a structured JSON array.`,
        file_urls: [file_url],
        response_json_schema: {
          type: "object",
          properties: {
            assets: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  asset_main_category: { type: "string" },
                  asset_type: { type: "string" },
                  location: { type: "string" },
                  manufacturer: { type: "string" },
                  model: { type: "string" },
                  serial_number: { type: "string" },
                  installation_date: { type: "string" }
                }
              }
            }
          }
        }
      });

      setUploadedRegister({ file_url, extracted_data: result });
      toast.success(`Successfully extracted ${result.assets?.length || 0} assets!`);
    } catch (error) {
      toast.error('Failed to process document: ' + error.message);
    } finally {
      setUploadingRegister(false);
    }
  };

  const generateQRCode = (type) => {
    const code = `VBM-${type.toUpperCase()}-${Date.now().toString(36).toUpperCase()}`;
    if (type === 'location') {
      setLocationForm({ ...locationForm, qr_code: code });
    } else if (type === 'asset') {
      setAssetForm({ ...assetForm, barcode: code });
    }
    toast.success('QR code generated!');
  };

  const completedSteps = [
    true, // Registration always completed
    buildings.length > 0 || buildingIdFromUrl,
    locations.length > 0 || (buildingIdFromUrl && locations.filter(l => l.building_id === buildingIdFromUrl).length > 0),
    assets.length > 0 || (buildingIdFromUrl && assets.filter(a => a.building_id === buildingIdFromUrl).length > 0),
    uploadedRegister !== null, // Asset register uploaded
    false, // Invite Team
    false, // Share Request Portal
  ];

  const progressPercentage = (completedSteps.filter(Boolean).length / SETUP_STEPS.length) * 100;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Getting Started</h1>
            <p className="text-slate-600 mt-1">Complete the following steps to kickstart your building management.</p>
          </div>
          <Button variant="outline" onClick={() => setShowHelp(!showHelp)}>
            <HelpCircle className="h-4 w-4 mr-2" />
            Questions? Contact Support
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Sidebar - Steps */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Basic Setup - 5 min</CardTitle>
                <div className="mt-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm text-slate-600">
                      {completedSteps.filter(Boolean).length} of {SETUP_STEPS.length}
                    </span>
                    <span className="text-sm font-semibold text-slate-900">
                      {Math.round(progressPercentage)}%
                    </span>
                  </div>
                  <Progress value={progressPercentage} className="h-2" />
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                {SETUP_STEPS.map((step, index) => {
                  const StepIcon = step.icon || CheckCircle;
                  const isCompleted = completedSteps[index];
                  const isCurrent = currentStep === index;

                  return (
                    <button
                      key={step.id}
                      onClick={() => !isCompleted && setCurrentStep(index)}
                      className={cn(
                        "w-full flex items-start gap-3 p-3 rounded-lg text-left transition-all",
                        isCurrent && "bg-blue-50 border-2 border-blue-200",
                        isCompleted && "bg-green-50",
                        !isCurrent && !isCompleted && "hover:bg-slate-50"
                      )}
                    >
                      <div className={cn(
                        "h-6 w-6 rounded-full flex items-center justify-center flex-shrink-0",
                        isCompleted && "bg-green-500 text-white",
                        isCurrent && "bg-blue-500 text-white",
                        !isCompleted && !isCurrent && "bg-slate-200 text-slate-600"
                      )}>
                        {isCompleted ? (
                          <CheckCircle className="h-4 w-4" />
                        ) : (
                          <StepIcon className="h-4 w-4" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={cn(
                          "text-sm font-medium",
                          isCompleted && "line-through text-slate-500",
                          isCurrent && "text-blue-900",
                          !isCompleted && !isCurrent && "text-slate-900"
                        )}>
                          {step.title}
                        </p>
                        <p className="text-xs text-slate-500 mt-0.5">{step.description}</p>
                      </div>
                      {!isCompleted && <ChevronRight className="h-5 w-5 text-slate-400 flex-shrink-0" />}
                    </button>
                  );
                })}
              </CardContent>
            </Card>
          </div>

          {/* Right Content - Forms */}
          <div className="lg:col-span-2">
            <Card>
              <CardContent className="pt-6">
                {/* Step 1: Building (only if no buildingId from URL) */}
                {currentStep === 1 && !buildingIdFromUrl && (
                  <div>
                    <h2 className="text-2xl font-bold mb-2">Add Your Building</h2>
                    <p className="text-slate-600 mb-6">
                      Your building or property. For example "123 Main Street" or "Building 1, Level 2"
                    </p>
                    <form onSubmit={handleBuildingSubmit} className="space-y-4">
                      <div className="flex items-center space-x-2">
                        <Switch
                          id="is_bmc"
                          checked={buildingForm.is_bmc}
                          onCheckedChange={(checked) => setBuildingForm({ ...buildingForm, is_bmc: checked })}
                        />
                        <Label htmlFor="is_bmc" className="text-sm font-medium">
                          This building is part of a Building Management Committee (BMC) scheme
                        </Label>
                      </div>

                      {!buildingForm.is_bmc && (
                        <div>
                          <Label>Strata Plan Number</Label>
                          <Input
                            value={buildingForm.strata_plan_number}
                            onChange={(e) => setBuildingForm({ ...buildingForm, strata_plan_number: e.target.value })}
                            placeholder="e.g., SP60919"
                          />
                        </div>
                      )}

                      {buildingForm.is_bmc && (
                        <div className="border border-blue-200 rounded-lg p-4 bg-blue-50/50">
                          <div className="flex justify-between items-center mb-3">
                            <Label className="text-sm font-semibold text-blue-900">Strata Plans under BMC</Label>
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                const plans = buildingForm.bmc_strata_plans || [];
                                setBuildingForm({
                                  ...buildingForm,
                                  bmc_strata_plans: [...plans, { plan_number: '', name: '', type: 'residential', buildings: [] }]
                                });
                              }}
                            >
                              <Plus className="h-4 w-4 mr-1" />
                              Add Strata Plan
                            </Button>
                          </div>
                          
                          {buildingForm.bmc_strata_plans?.length === 0 && (
                            <p className="text-sm text-slate-500 text-center py-4">
                              Add strata plans that are part of this BMC (e.g., commercial units, residential towers, parking areas)
                            </p>
                          )}

                          <div className="space-y-3">
                            {buildingForm.bmc_strata_plans?.map((plan, planIndex) => (
                              <div key={planIndex} className="bg-white border border-slate-200 rounded-lg p-3">
                                <div className="flex items-start gap-2 mb-3">
                                  <div className="flex-1 space-y-2">
                                    <div className="grid grid-cols-2 gap-2">
                                      <Input
                                        placeholder="SP Number (e.g., SP60919)"
                                        value={plan.plan_number}
                                        onChange={(e) => {
                                          const updated = [...buildingForm.bmc_strata_plans];
                                          updated[planIndex].plan_number = e.target.value;
                                          setBuildingForm({ ...buildingForm, bmc_strata_plans: updated });
                                        }}
                                      />
                                      <Input
                                        placeholder="Name (e.g., Residential Component)"
                                        value={plan.name}
                                        onChange={(e) => {
                                          const updated = [...buildingForm.bmc_strata_plans];
                                          updated[planIndex].name = e.target.value;
                                          setBuildingForm({ ...buildingForm, bmc_strata_plans: updated });
                                        }}
                                      />
                                    </div>
                                    <Select
                                      value={plan.type}
                                      onValueChange={(value) => {
                                        const updated = [...buildingForm.bmc_strata_plans];
                                        updated[planIndex].type = value;
                                        setBuildingForm({ ...buildingForm, bmc_strata_plans: updated });
                                      }}
                                    >
                                      <SelectTrigger>
                                        <SelectValue placeholder="Type" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="residential">Residential</SelectItem>
                                        <SelectItem value="commercial">Commercial</SelectItem>
                                        <SelectItem value="parking">Parking</SelectItem>
                                        <SelectItem value="retail">Retail</SelectItem>
                                        <SelectItem value="mixed_use">Mixed Use</SelectItem>
                                        <SelectItem value="other">Other</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </div>
                                  <Button
                                    type="button"
                                    size="icon"
                                    variant="ghost"
                                    onClick={() => {
                                      const updated = buildingForm.bmc_strata_plans.filter((_, i) => i !== planIndex);
                                      setBuildingForm({ ...buildingForm, bmc_strata_plans: updated });
                                    }}
                                  >
                                    <Trash2 className="h-4 w-4 text-red-500" />
                                  </Button>
                                </div>

                                {/* Buildings within this strata plan */}
                                <div className="ml-4 mt-3 border-l-2 border-blue-200 pl-3">
                                  <div className="flex justify-between items-center mb-2">
                                    <Label className="text-xs font-medium text-slate-600">Buildings in this Strata Plan</Label>
                                    <Button
                                      type="button"
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => {
                                        const updated = [...buildingForm.bmc_strata_plans];
                                        if (!updated[planIndex].buildings) updated[planIndex].buildings = [];
                                        updated[planIndex].buildings.push({ name: '', address: '', floors: '', total_units: '' });
                                        setBuildingForm({ ...buildingForm, bmc_strata_plans: updated });
                                      }}
                                    >
                                      <Plus className="h-3 w-3 mr-1" />
                                      Add Building
                                    </Button>
                                  </div>

                                  {plan.buildings?.length === 0 && (
                                    <p className="text-xs text-slate-400 text-center py-2">
                                      Add buildings (e.g., Firenze, Napoli, Palermo)
                                    </p>
                                  )}

                                  <div className="space-y-2">
                                    {plan.buildings?.map((building, buildingIndex) => (
                                      <div key={buildingIndex} className="bg-slate-50 border border-slate-200 rounded p-2 space-y-2">
                                        <div className="flex items-start gap-2">
                                          <div className="flex-1 space-y-2">
                                            <Input
                                              placeholder="Building name (e.g., Firenze)"
                                              value={building.name}
                                              onChange={(e) => {
                                                const updated = [...buildingForm.bmc_strata_plans];
                                                updated[planIndex].buildings[buildingIndex].name = e.target.value;
                                                setBuildingForm({ ...buildingForm, bmc_strata_plans: updated });
                                              }}
                                            />
                                            <Input
                                              placeholder="Address"
                                              value={building.address}
                                              onChange={(e) => {
                                                const updated = [...buildingForm.bmc_strata_plans];
                                                updated[planIndex].buildings[buildingIndex].address = e.target.value;
                                                setBuildingForm({ ...buildingForm, bmc_strata_plans: updated });
                                              }}
                                            />
                                            <div className="grid grid-cols-2 gap-2">
                                              <Input
                                                type="number"
                                                placeholder="Floors"
                                                value={building.floors}
                                                onChange={(e) => {
                                                  const updated = [...buildingForm.bmc_strata_plans];
                                                  updated[planIndex].buildings[buildingIndex].floors = e.target.value;
                                                  setBuildingForm({ ...buildingForm, bmc_strata_plans: updated });
                                                }}
                                              />
                                              <Input
                                                type="number"
                                                placeholder="Units"
                                                value={building.total_units}
                                                onChange={(e) => {
                                                  const updated = [...buildingForm.bmc_strata_plans];
                                                  updated[planIndex].buildings[buildingIndex].total_units = e.target.value;
                                                  setBuildingForm({ ...buildingForm, bmc_strata_plans: updated });
                                                }}
                                              />
                                            </div>
                                          </div>
                                          <Button
                                            type="button"
                                            size="icon"
                                            variant="ghost"
                                            onClick={() => {
                                              const updated = [...buildingForm.bmc_strata_plans];
                                              updated[planIndex].buildings = updated[planIndex].buildings.filter((_, i) => i !== buildingIndex);
                                              setBuildingForm({ ...buildingForm, bmc_strata_plans: updated });
                                            }}
                                          >
                                            <Trash2 className="h-3 w-3 text-red-500" />
                                          </Button>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      <div>
                        <Label>Building Name *</Label>
                        <Input
                          value={buildingForm.name}
                          onChange={(e) => setBuildingForm({ ...buildingForm, name: e.target.value })}
                          placeholder="e.g., Norton Towers"
                          required
                        />
                      </div>

                      <div>
                        <Label>Address *</Label>
                        <Input
                          value={buildingForm.address}
                          onChange={(e) => setBuildingForm({ ...buildingForm, address: e.target.value })}
                          placeholder="123 Norton Street Leichhardt"
                          required
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label>City</Label>
                          <Input
                            value={buildingForm.city}
                            onChange={(e) => setBuildingForm({ ...buildingForm, city: e.target.value })}
                            placeholder="Sydney"
                          />
                        </div>
                        <div>
                          <Label>State</Label>
                          <Input
                            value={buildingForm.state}
                            onChange={(e) => setBuildingForm({ ...buildingForm, state: e.target.value })}
                            placeholder="NSW"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label>Total Floors</Label>
                          <Input
                            type="number"
                            value={buildingForm.floors}
                            onChange={(e) => setBuildingForm({ ...buildingForm, floors: parseInt(e.target.value) })}
                            placeholder="10"
                          />
                        </div>
                        <div>
                          <Label>Total Units</Label>
                          <Input
                            type="number"
                            value={buildingForm.total_units}
                            onChange={(e) => setBuildingForm({ ...buildingForm, total_units: parseInt(e.target.value) })}
                            placeholder="50"
                          />
                        </div>
                      </div>

                      <div className="flex justify-end gap-3 pt-4">
                        <Button type="submit" disabled={createBuildingMutation.isPending}>
                          Create Building
                        </Button>
                      </div>
                    </form>
                  </div>
                )}

                {/* Step 2: Location */}
                {currentStep === 2 && (
                  <div>
                    <h2 className="text-2xl font-bold mb-2">Add a Location</h2>
                    <p className="text-slate-600 mb-6">
                      A specific area within your building. For example "Level 2" or "Basement Car Park"
                    </p>
                    <form onSubmit={handleLocationSubmit} className="space-y-4">
                      <div>
                        <Label>Location Name *</Label>
                        <Input
                          value={locationForm.name}
                          onChange={(e) => setLocationForm({ ...locationForm, name: e.target.value })}
                          placeholder="e.g., Level 2, Basement"
                          required
                        />
                      </div>

                      <div>
                        <Label>Floor/Level</Label>
                        <Input
                          value={locationForm.floor}
                          onChange={(e) => setLocationForm({ ...locationForm, floor: e.target.value })}
                          placeholder="e.g., 2, B1, Ground"
                        />
                      </div>

                      <div>
                        <Label>Description</Label>
                        <Textarea
                          value={locationForm.description}
                          onChange={(e) => setLocationForm({ ...locationForm, description: e.target.value })}
                          placeholder="Add a description..."
                          rows={3}
                        />
                      </div>

                      <div>
                        <Label>QR Code/Barcode</Label>
                        <div className="flex gap-2">
                          <Input
                            value={locationForm.qr_code}
                            onChange={(e) => setLocationForm({ ...locationForm, qr_code: e.target.value })}
                            placeholder="Enter or generate code"
                          />
                          <Button type="button" variant="outline" onClick={() => generateQRCode('location')}>
                            <QrCode className="h-4 w-4 mr-2" />
                            Generate
                          </Button>
                        </div>
                      </div>

                      <div className="flex justify-end gap-3 pt-4">
                        <Button type="button" variant="outline" onClick={() => buildingIdFromUrl ? navigate(createPageUrl('Buildings')) : setCurrentStep(1)}>
                          Back
                        </Button>
                        <Button type="submit" disabled={createLocationMutation.isPending}>
                          Create Location
                        </Button>
                      </div>
                    </form>
                  </div>
                )}

                {/* Step 3: Asset */}
                {currentStep === 3 && (
                  <div>
                    <h2 className="text-2xl font-bold mb-2">Add an Asset</h2>
                    <p className="text-slate-600 mb-6">
                      Something your team maintains, like a unit or room, equipment, or a building amenity.
                    </p>
                    <form onSubmit={handleAssetSubmit} className="space-y-4">
                      <div>
                        <Label>Asset Name *</Label>
                        <Input
                          value={assetForm.name}
                          onChange={(e) => setAssetForm({ ...assetForm, name: e.target.value })}
                          placeholder="e.g., Fire Extinguisher, HVAC Unit 1"
                          required
                        />
                      </div>

                      <div>
                        <Label>Category *</Label>
                        <Select 
                          value={assetForm.asset_main_category} 
                          onValueChange={(v) => setAssetForm({ ...assetForm, asset_main_category: v })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select category" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="mechanical_services">Mechanical Services</SelectItem>
                            <SelectItem value="electrical_services">Electrical Services</SelectItem>
                            <SelectItem value="fire_life_safety">Fire & Life Safety</SelectItem>
                            <SelectItem value="hydraulic_plumbing">Hydraulic & Plumbing</SelectItem>
                            <SelectItem value="vertical_transportation">Vertical Transportation</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label>Location</Label>
                        <Select 
                          value={assetForm.location_id} 
                          onValueChange={(v) => setAssetForm({ ...assetForm, location_id: v })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select location" />
                          </SelectTrigger>
                          <SelectContent>
                            {locations.map(loc => (
                              <SelectItem key={loc.id} value={loc.id}>{loc.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label>Manufacturer</Label>
                          <Input
                            value={assetForm.manufacturer}
                            onChange={(e) => setAssetForm({ ...assetForm, manufacturer: e.target.value })}
                            placeholder="e.g., Honeywell"
                          />
                        </div>
                        <div>
                          <Label>Model</Label>
                          <Input
                            value={assetForm.model}
                            onChange={(e) => setAssetForm({ ...assetForm, model: e.target.value })}
                            placeholder="e.g., TH8000"
                          />
                        </div>
                      </div>

                      <div>
                        <Label>Criticality</Label>
                        <Select 
                          value={assetForm.criticality} 
                          onValueChange={(v) => setAssetForm({ ...assetForm, criticality: v })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="low">Low</SelectItem>
                            <SelectItem value="medium">Medium</SelectItem>
                            <SelectItem value="high">High</SelectItem>
                            <SelectItem value="critical">Critical</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="flex justify-end gap-3 pt-4">
                        <Button type="button" variant="outline" onClick={() => setCurrentStep(2)}>
                          Back
                        </Button>
                        <Button type="submit" disabled={createAssetMutation.isPending}>
                          Create Asset
                        </Button>
                      </div>
                    </form>
                  </div>
                )}

                {/* Step 4: Upload Asset Register */}
                {currentStep === 4 && (
                  <div>
                    <h2 className="text-2xl font-bold mb-2">Upload Asset Register</h2>
                    <p className="text-slate-600 mb-6">
                      Upload your existing asset register (PDF or Excel) and let AI extract the assets automatically.
                    </p>

                    {!uploadedRegister ? (
                      <div className="space-y-6">
                        <div className="border-2 border-dashed border-slate-300 rounded-lg p-8 text-center hover:border-blue-400 transition-colors">
                          <div className="flex flex-col items-center gap-4">
                            <div className="w-16 h-16 rounded-full bg-blue-50 flex items-center justify-center">
                              <Upload className="h-8 w-8 text-blue-600" />
                            </div>
                            <div>
                              <h3 className="text-lg font-semibold mb-1">Upload Asset Register</h3>
                              <p className="text-sm text-slate-500 mb-4">
                                PDF or Excel files accepted. AI will automatically extract all assets.
                              </p>
                              <label htmlFor="asset-register-upload">
                                <Button type="button" disabled={uploadingRegister} asChild>
                                  <span>
                                    <FileText className="h-4 w-4 mr-2" />
                                    {uploadingRegister ? 'Processing...' : 'Choose File'}
                                  </span>
                                </Button>
                                <input
                                  id="asset-register-upload"
                                  type="file"
                                  accept=".pdf,.xlsx,.xls"
                                  onChange={handleFileUpload}
                                  className="hidden"
                                  disabled={uploadingRegister}
                                />
                              </label>
                            </div>
                          </div>
                        </div>

                        <Alert>
                          <AlertDescription>
                            You can also manage assets manually in the Asset Register page after setup.
                          </AlertDescription>
                        </Alert>

                        <div className="flex justify-end gap-3 pt-4">
                          <Button type="button" variant="outline" onClick={() => setCurrentStep(3)}>
                            Back
                          </Button>
                          <Button 
                            type="button"
                            variant="outline"
                            onClick={() => navigate(createPageUrl('AssetRegister'))}
                          >
                            <ExternalLink className="h-4 w-4 mr-2" />
                            Go to Asset Register
                          </Button>
                          <Button onClick={() => setCurrentStep(5)}>
                            Skip for now
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <Alert className="bg-green-50 border-green-200">
                          <CheckCircle className="h-4 w-4 text-green-600" />
                          <AlertDescription className="text-green-800">
                            Asset register uploaded successfully! Extracted {uploadedRegister.extracted_data?.assets?.length || 0} assets.
                          </AlertDescription>
                        </Alert>

                        <div className="bg-slate-50 rounded-lg p-4">
                          <h4 className="font-semibold mb-2">Preview of extracted assets:</h4>
                          <div className="space-y-2 max-h-60 overflow-y-auto">
                            {uploadedRegister.extracted_data?.assets?.slice(0, 5).map((asset, idx) => (
                              <div key={idx} className="bg-white p-3 rounded border border-slate-200">
                                <p className="font-medium">{asset.name}</p>
                                <p className="text-xs text-slate-500">
                                  {asset.asset_main_category} • {asset.location}
                                </p>
                              </div>
                            ))}
                            {uploadedRegister.extracted_data?.assets?.length > 5 && (
                              <p className="text-sm text-slate-500 text-center py-2">
                                ... and {uploadedRegister.extracted_data.assets.length - 5} more assets
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="flex justify-end gap-3 pt-4">
                          <Button type="button" variant="outline" onClick={() => setCurrentStep(3)}>
                            Back
                          </Button>
                          <Button 
                            type="button"
                            onClick={() => navigate(createPageUrl('AssetRegister'))}
                          >
                            <ExternalLink className="h-4 w-4 mr-2" />
                            View in Asset Register
                          </Button>
                          <Button onClick={() => setCurrentStep(5)}>
                            Continue
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Step 5: Invite Team */}
                {currentStep === 5 && (
                  <div>
                    <h2 className="text-2xl font-bold mb-2">Invite the whole team</h2>
                    <p className="text-slate-600 mb-6">
                      Add team members, contractors, and other users who need access to the system.
                    </p>
                    <Alert className="mb-6">
                      <AlertDescription>
                        You can invite team members later from the Staff Management section.
                      </AlertDescription>
                    </Alert>
                    <div className="flex justify-end gap-3 pt-4">
                      <Button type="button" variant="outline" onClick={() => setCurrentStep(4)}>
                        Back
                      </Button>
                      <Button onClick={() => setCurrentStep(6)}>
                        Skip for now
                      </Button>
                    </div>
                  </div>
                )}

                {/* Step 6: Share Request Portal */}
                {currentStep === 6 && (
                  <div>
                    <h2 className="text-2xl font-bold mb-2">Share Request Portal</h2>
                    <p className="text-slate-600 mb-6">
                      Enable residents or tenants to submit maintenance requests directly through a portal.
                    </p>
                    <Alert className="mb-6">
                      <AlertDescription>
                        This can be configured later in the Communications settings.
                      </AlertDescription>
                    </Alert>
                    <div className="flex justify-end gap-3 pt-4">
                      <Button type="button" variant="outline" onClick={() => setCurrentStep(5)}>
                        Back
                      </Button>
                      <Button onClick={() => navigate(createPageUrl('Dashboard'))}>
                        Complete Setup
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}