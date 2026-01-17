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
import {
  Building2,
  CheckCircle,
  ChevronRight,
  Package,
  Users,
  Wrench,
  FileText,
  HelpCircle,
  Upload,
  QrCode,
  Calendar
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from './utils';

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
    title: 'Add Locations',
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
    id: 'work_order',
    title: 'Create a Work Order',
    description: 'Track maintenance work for your assets',
    icon: Wrench,
  },
  {
    id: 'team',
    title: 'Invite Your Team',
    description: 'Add staff members and contractors',
    icon: Users,
  },
  {
    id: 'documents',
    title: 'Upload Documents',
    description: 'Add important building documents',
    icon: FileText,
  },
];

export default function SetupCenter() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [currentStep, setCurrentStep] = useState(1);
  const [showHelp, setShowHelp] = useState(false);

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

  const { data: workOrders = [] } = useQuery({
    queryKey: ['workOrders'],
    queryFn: () => base44.entities.WorkOrder.list(),
    enabled: buildings.length > 0,
  });

  // Determine which step to show
  useEffect(() => {
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
    } else if (workOrders.length === 0) {
      setCurrentStep(4);
    } else {
      setCurrentStep(5);
    }
  }, [buildings, locations, assets, workOrders]);

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
    onSuccess: () => {
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
    buildings.length > 0,
    locations.length > 0,
    assets.length > 0,
    workOrders.length > 0,
    false, // Team invite
    false, // Documents
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
                {/* Step 1: Building */}
                {currentStep === 1 && (
                  <div>
                    <h2 className="text-2xl font-bold mb-2">Add Your Building</h2>
                    <p className="text-slate-600 mb-6">
                      Your building or property. For example "123 Main Street" or "Building 1, Level 2"
                    </p>
                    <form onSubmit={handleBuildingSubmit} className="space-y-4">
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
                        <Button type="button" variant="outline" onClick={() => setCurrentStep(1)}>
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

                {/* Step 4: Work Order Templates */}
                {currentStep === 4 && (
                  <div>
                    <h2 className="text-2xl font-bold mb-2">Create a Work Order</h2>
                    <p className="text-slate-600 mb-6">Get started with pre-built templates or create from scratch</p>

                    <Alert className="mb-6">
                      <AlertDescription>
                        Create a work order first, then you can add an Asset to it
                      </AlertDescription>
                    </Alert>

                    <div className="space-y-3">
                      <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate(createPageUrl('WorkOrders'))}>
                        <CardContent className="pt-6">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <Calendar className="h-8 w-8 text-blue-600" />
                              <div>
                                <h3 className="font-semibold">Daily Inspection</h3>
                                <Badge variant="outline" className="mt-1">Daily</Badge>
                              </div>
                            </div>
                            <Button>Start here</Button>
                          </div>
                        </CardContent>
                      </Card>

                      <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate(createPageUrl('WorkOrders'))}>
                        <CardContent className="pt-6">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <Wrench className="h-8 w-8 text-green-600" />
                              <div>
                                <h3 className="font-semibold">Weekly Preventive Maintenance</h3>
                                <Badge variant="outline" className="mt-1">Weekly on Mondays</Badge>
                              </div>
                            </div>
                            <Button>Start here</Button>
                          </div>
                        </CardContent>
                      </Card>

                      <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate(createPageUrl('WorkOrders'))}>
                        <CardContent className="pt-6">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <Package className="h-8 w-8 text-orange-600" />
                              <div>
                                <h3 className="font-semibold">Repair Asset</h3>
                                <Badge variant="outline" className="mt-1">Just once</Badge>
                              </div>
                            </div>
                            <Button>Start here</Button>
                          </div>
                        </CardContent>
                      </Card>

                      <div className="text-center py-4">
                        <span className="text-slate-500">or</span>
                      </div>

                      <Button 
                        variant="outline" 
                        className="w-full" 
                        onClick={() => navigate(createPageUrl('WorkOrders'))}
                      >
                        + Start with a blank Work Order
                      </Button>
                    </div>
                  </div>
                )}

                {/* Step 5: Complete */}
                {currentStep >= 5 && (
                  <div className="text-center py-12">
                    <div className="h-20 w-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
                      <CheckCircle className="h-10 w-10 text-green-600" />
                    </div>
                    <h2 className="text-2xl font-bold mb-2">Setup Complete!</h2>
                    <p className="text-slate-600 mb-6">
                      You're all set. Explore your dashboard to manage your buildings.
                    </p>
                    <Button onClick={() => navigate(createPageUrl('Dashboard'))}>
                      Go to Dashboard
                    </Button>
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