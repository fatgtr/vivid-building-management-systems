import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useBuildingContext } from '@/components/BuildingContext';
import PageHeader from '@/components/common/PageHeader';
import StatusBadge from '@/components/common/StatusBadge';
import EmptyState from '@/components/common/EmptyState';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MapPin, Plus, Edit2, Trash2, Upload, FileBarChart, Search, Calendar } from 'lucide-react';
import { toast } from 'sonner';
import LocationExtractor from '@/components/buildings/LocationExtractor';
import SFSDocumentAnalyzer from '@/components/buildings/SFSDocumentAnalyzer';

export default function LocationsPage() {
  const { selectedBuildingId } = useBuildingContext();
  const [showExtractor, setShowExtractor] = useState(false);
  const [showAnalyzer, setShowAnalyzer] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingLocation, setEditingLocation] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterResponsibility, setFilterResponsibility] = useState('all');
  const queryClient = useQueryClient();

  const { data: locations = [], isLoading } = useQuery({
    queryKey: ['locations', selectedBuildingId],
    queryFn: () => selectedBuildingId 
      ? base44.entities.Location.filter({ building_id: selectedBuildingId })
      : base44.entities.Location.list(),
    enabled: true,
  });

  const { data: buildings = [] } = useQuery({
    queryKey: ['buildings'],
    queryFn: () => base44.entities.Building.list(),
  });

  const deleteLocationMutation = useMutation({
    mutationFn: (id) => base44.entities.Location.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['locations'] });
      toast.success('Location deleted');
    },
  });

  const updateLocationMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Location.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['locations'] });
      toast.success('Location updated');
      setShowEditDialog(false);
      setEditingLocation(null);
    },
  });

  const handleEdit = (location) => {
    setEditingLocation(location);
    setShowEditDialog(true);
  };

  const handleSaveEdit = (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = {
      name: formData.get('name'),
      floor_level: formData.get('floor_level'),
      area_type: formData.get('area_type'),
      responsibility: formData.get('responsibility'),
      common_property: formData.get('common_property') === 'true',
      inspection_required: formData.get('inspection_required') === 'true',
      inspection_frequency: formData.get('inspection_frequency'),
      description: formData.get('description'),
      notes: formData.get('notes'),
    };
    updateLocationMutation.mutate({ id: editingLocation.id, data });
  };

  const handleDelete = (id) => {
    if (confirm('Are you sure you want to delete this location?')) {
      deleteLocationMutation.mutate(id);
    }
  };

  const getBuildingName = (buildingId) => {
    const building = buildings.find(b => b.id === buildingId);
    return building?.name || 'Unknown';
  };

  const filteredLocations = locations.filter(loc => {
    const matchesSearch = loc.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         loc.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'all' || loc.area_type === filterType;
    const matchesResponsibility = filterResponsibility === 'all' || loc.responsibility === filterResponsibility;
    return matchesSearch && matchesType && matchesResponsibility;
  });

  const groupedByFloor = filteredLocations.reduce((acc, loc) => {
    const floor = loc.floor_level || 'Unknown';
    if (!acc[floor]) acc[floor] = [];
    acc[floor].push(loc);
    return acc;
  }, {});

  const pendingReviewCount = locations.filter(l => l.responsibility === 'pending_review').length;

  if (isLoading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-slate-200 rounded w-1/4" />
          <div className="h-64 bg-slate-200 rounded" />
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Locations & Areas"
        subtitle="Manage building locations, common areas, and parking spaces"
      >
        <Button
          variant="outline"
          onClick={() => setShowAnalyzer(true)}
          className="gap-2"
        >
          <FileBarChart className="h-4 w-4" />
          Analyze SFS
        </Button>
        <Button onClick={() => setShowExtractor(true)} className="bg-blue-600 hover:bg-blue-700 gap-2">
          <Upload className="h-4 w-4" />
          Extract from Plan
        </Button>
      </PageHeader>

      {pendingReviewCount > 0 && (
        <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-yellow-800">
              {pendingReviewCount} location{pendingReviewCount !== 1 ? 's' : ''} pending responsibility review
            </p>
            <p className="text-xs text-yellow-700 mt-1">
              Upload SFS documents to automatically assign responsibilities
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowAnalyzer(true)}
            className="border-yellow-300 text-yellow-800 hover:bg-yellow-100"
          >
            Review Now
          </Button>
        </div>
      )}

      <div className="mb-6 flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search locations..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filter by type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="storage_cage">Storage Cage</SelectItem>
            <SelectItem value="parking_space">Parking Space</SelectItem>
            <SelectItem value="car_park">Car Park</SelectItem>
            <SelectItem value="mechanical_room">Mechanical Room</SelectItem>
            <SelectItem value="electrical_room">Electrical Room</SelectItem>
            <SelectItem value="common_area">Common Area</SelectItem>
            <SelectItem value="lift_lobby">Lift Lobby</SelectItem>
            <SelectItem value="other">Other</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterResponsibility} onValueChange={setFilterResponsibility}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filter by responsibility" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Responsibilities</SelectItem>
            <SelectItem value="bmc">BMC</SelectItem>
            <SelectItem value="residential_strata">Residential Strata</SelectItem>
            <SelectItem value="owner">Owner</SelectItem>
            <SelectItem value="pending_review">Pending Review</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {filteredLocations.length === 0 ? (
        <EmptyState
          icon={MapPin}
          title="No locations found"
          description="Extract locations from building plans or create them manually"
          action={() => setShowExtractor(true)}
          actionLabel="Extract Locations"
        />
      ) : (
        <Tabs defaultValue="grouped" className="space-y-4">
          <TabsList>
            <TabsTrigger value="grouped">By Floor</TabsTrigger>
            <TabsTrigger value="table">Table View</TabsTrigger>
          </TabsList>

          <TabsContent value="grouped" className="space-y-4">
            {Object.entries(groupedByFloor).sort().map(([floor, locs]) => (
              <Card key={floor} className="p-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-blue-600" />
                  {floor}
                  <Badge variant="outline" className="ml-2">{locs.length}</Badge>
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {locs.map((location) => (
                    <Card key={location.id} className="p-4 hover:shadow-md transition-shadow">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h4 className="font-medium">{location.name}</h4>
                          <p className="text-xs text-slate-500">{getBuildingName(location.building_id)}</p>
                        </div>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" onClick={() => handleEdit(location)} className="h-8 w-8">
                            <Edit2 className="h-3 w-3" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDelete(location.id)} className="h-8 w-8">
                            <Trash2 className="h-3 w-3 text-red-600" />
                          </Button>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div className="flex gap-2 flex-wrap">
                          <Badge variant="outline">{location.area_type?.replace(/_/g, ' ')}</Badge>
                          <Badge className={
                            location.responsibility === 'bmc' ? 'bg-blue-100 text-blue-800' :
                            location.responsibility === 'residential_strata' ? 'bg-purple-100 text-purple-800' :
                            location.responsibility === 'owner' ? 'bg-green-100 text-green-800' :
                            'bg-slate-100 text-slate-800'
                          }>
                            {location.responsibility?.replace(/_/g, ' ')}
                          </Badge>
                          {location.common_property && (
                            <Badge variant="outline" className="bg-amber-50 text-amber-800">Common Property</Badge>
                          )}
                        </div>
                        {location.description && (
                          <p className="text-xs text-slate-600">{location.description}</p>
                        )}
                        {location.inspection_required && (
                          <div className="flex items-center gap-1 text-xs text-slate-500">
                            <Calendar className="h-3 w-3" />
                            Inspections: {location.inspection_frequency?.replace(/_/g, ' ')}
                          </div>
                        )}
                      </div>
                    </Card>
                  ))}
                </div>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="table">
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Floor</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Responsibility</TableHead>
                    <TableHead>Common Property</TableHead>
                    <TableHead>Building</TableHead>
                    <TableHead className="w-20">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLocations.map((location) => (
                    <TableRow key={location.id}>
                      <TableCell className="font-medium">{location.name}</TableCell>
                      <TableCell>{location.floor_level || '—'}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{location.area_type?.replace(/_/g, ' ')}</Badge>
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={location.responsibility} />
                      </TableCell>
                      <TableCell>
                        {location.common_property ? (
                          <Badge className="bg-amber-100 text-amber-800">Yes</Badge>
                        ) : (
                          <span className="text-slate-400">No</span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-slate-600">
                        {getBuildingName(location.building_id)}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" onClick={() => handleEdit(location)} className="h-8 w-8">
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDelete(location.id)} className="h-8 w-8">
                            <Trash2 className="h-4 w-4 text-red-600" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          </TabsContent>
        </Tabs>
      )}

      {/* Location Extractor Dialog */}
      <Dialog open={showExtractor} onOpenChange={setShowExtractor}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Extract Locations from Plan</DialogTitle>
          </DialogHeader>
          <LocationExtractor
            buildingId={selectedBuildingId}
            onComplete={() => {
              setShowExtractor(false);
              queryClient.invalidateQueries({ queryKey: ['locations'] });
            }}
          />
        </DialogContent>
      </Dialog>

      {/* SFS Analyzer Dialog */}
      <Dialog open={showAnalyzer} onOpenChange={setShowAnalyzer}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Analyze SFS Document</DialogTitle>
          </DialogHeader>
          <SFSDocumentAnalyzer
            buildingId={selectedBuildingId}
            locations={filteredLocations}
            onAnalysisComplete={() => {
              setShowAnalyzer(false);
              queryClient.invalidateQueries({ queryKey: ['locations'] });
            }}
          />
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Location</DialogTitle>
          </DialogHeader>
          {editingLocation && (
            <form onSubmit={handleSaveEdit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Name</Label>
                  <Input id="name" name="name" defaultValue={editingLocation.name} required />
                </div>
                <div>
                  <Label htmlFor="floor_level">Floor Level</Label>
                  <Input id="floor_level" name="floor_level" defaultValue={editingLocation.floor_level} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="area_type">Area Type</Label>
                  <Select name="area_type" defaultValue={editingLocation.area_type}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="storage_cage">Storage Cage</SelectItem>
                      <SelectItem value="parking_space">Parking Space</SelectItem>
                      <SelectItem value="car_park">Car Park</SelectItem>
                      <SelectItem value="mechanical_room">Mechanical Room</SelectItem>
                      <SelectItem value="electrical_room">Electrical Room</SelectItem>
                      <SelectItem value="common_area">Common Area</SelectItem>
                      <SelectItem value="lift_lobby">Lift Lobby</SelectItem>
                      <SelectItem value="fire_stair">Fire Stair</SelectItem>
                      <SelectItem value="roof_access">Roof Access</SelectItem>
                      <SelectItem value="plant_room">Plant Room</SelectItem>
                      <SelectItem value="bin_room">Bin Room</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="responsibility">Responsibility</Label>
                  <Select name="responsibility" defaultValue={editingLocation.responsibility}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="bmc">BMC</SelectItem>
                      <SelectItem value="residential_strata">Residential Strata</SelectItem>
                      <SelectItem value="owner">Owner</SelectItem>
                      <SelectItem value="pending_review">Pending Review</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="common_property">Common Property</Label>
                  <Select name="common_property" defaultValue={editingLocation.common_property?.toString()}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="true">Yes</SelectItem>
                      <SelectItem value="false">No</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="inspection_required">Inspection Required</Label>
                  <Select name="inspection_required" defaultValue={editingLocation.inspection_required?.toString()}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="true">Yes</SelectItem>
                      <SelectItem value="false">No</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="inspection_frequency">Inspection Frequency</Label>
                <Select name="inspection_frequency" defaultValue={editingLocation.inspection_frequency}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="quarterly">Quarterly</SelectItem>
                    <SelectItem value="semi_annually">Semi-Annually</SelectItem>
                    <SelectItem value="annually">Annually</SelectItem>
                    <SelectItem value="as_needed">As Needed</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Input id="description" name="description" defaultValue={editingLocation.description} />
              </div>

              <div>
                <Label htmlFor="notes">Notes</Label>
                <Textarea id="notes" name="notes" defaultValue={editingLocation.notes} rows={3} />
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setShowEditDialog(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={updateLocationMutation.isPending}>
                  {updateLocationMutation.isPending ? 'Saving...' : 'Save Changes'}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}