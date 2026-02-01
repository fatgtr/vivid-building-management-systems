import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useBuildingContext } from '@/components/BuildingContext';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, Trash2, Car, MapPin, Clock, Users, Settings } from 'lucide-react';
import { toast } from 'sonner';
import PageHeader from '@/components/common/PageHeader';
import EmptyState from '@/components/common/EmptyState';
import ParkingSpotManager from '@/components/parking/ParkingSpotManager';

export default function VisitorParkingSetup() {
  const { selectedBuildingId, managedBuildings } = useBuildingContext();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingZone, setEditingZone] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    capacity: '',
    zone_type: 'visitor',
    location_notes: '',
    available_from: '00:00',
    available_to: '23:59',
    auto_approve_bookings: false,
    shared_with_building_ids: [],
    status: 'active',
    notes: ''
  });

  // Fetch parking zones for the selected building
  const { data: parkingZones = [], isLoading } = useQuery({
    queryKey: ['parkingZones', selectedBuildingId],
    queryFn: () => selectedBuildingId 
      ? base44.entities.ParkingZone.filter({ building_id: selectedBuildingId })
      : Promise.resolve([]),
    enabled: !!selectedBuildingId
  });

  // Create/Update parking zone mutation
  const saveMutation = useMutation({
    mutationFn: async (data) => {
      if (editingZone) {
        return base44.entities.ParkingZone.update(editingZone.id, data);
      } else {
        return base44.entities.ParkingZone.create({
          ...data,
          building_id: selectedBuildingId
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['parkingZones'] });
      toast.success(editingZone ? 'Parking zone updated' : 'Parking zone created');
      handleCloseDialog();
    },
    onError: (error) => {
      toast.error('Failed to save parking zone');
      console.error(error);
    }
  });

  // Delete parking zone mutation
  const deleteMutation = useMutation({
    mutationFn: (zoneId) => base44.entities.ParkingZone.delete(zoneId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['parkingZones'] });
      toast.success('Parking zone deleted');
    },
    onError: (error) => {
      toast.error('Failed to delete parking zone');
      console.error(error);
    }
  });

  const handleOpenDialog = (zone = null) => {
    if (zone) {
      setEditingZone(zone);
      setFormData({
        name: zone.name || '',
        capacity: zone.capacity || '',
        zone_type: zone.zone_type || 'visitor',
        location_notes: zone.location_notes || '',
        available_from: zone.available_from || '00:00',
        available_to: zone.available_to || '23:59',
        auto_approve_bookings: zone.auto_approve_bookings || false,
        shared_with_building_ids: zone.shared_with_building_ids || [],
        status: zone.status || 'active',
        notes: zone.notes || ''
      });
    } else {
      setEditingZone(null);
      setFormData({
        name: '',
        capacity: '',
        zone_type: 'visitor',
        location_notes: '',
        available_from: '00:00',
        available_to: '23:59',
        auto_approve_bookings: false,
        shared_with_building_ids: [],
        status: 'active',
        notes: ''
      });
    }
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingZone(null);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    saveMutation.mutate({
      ...formData,
      capacity: parseInt(formData.capacity)
    });
  };

  const handleDelete = (zoneId) => {
    if (confirm('Are you sure you want to delete this parking zone?')) {
      deleteMutation.mutate(zoneId);
    }
  };

  const toggleSharedBuilding = (buildingId) => {
    setFormData(prev => ({
      ...prev,
      shared_with_building_ids: prev.shared_with_building_ids.includes(buildingId)
        ? prev.shared_with_building_ids.filter(id => id !== buildingId)
        : [...prev.shared_with_building_ids, buildingId]
    }));
  };

  if (!selectedBuildingId) {
    return (
      <div className="p-8">
        <EmptyState
          icon={Car}
          title="No Building Selected"
          description="Please select a building to manage visitor parking zones"
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Visitor Parking Setup"
        subtitle="Configure parking zones and booking settings"
        actionLabel="Add Parking Zone"
        actionIcon={Plus}
        onActionClick={() => handleOpenDialog()}
      />

      {isLoading ? (
        <div className="text-center py-12">Loading parking zones...</div>
      ) : parkingZones.length === 0 ? (
        <EmptyState
          icon={Car}
          title="No Parking Zones"
          description="Create your first parking zone to start managing visitor parking"
          actionLabel="Add Parking Zone"
          onAction={() => handleOpenDialog()}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {parkingZones.map((zone) => (
            <Card key={zone.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-lg">{zone.name}</CardTitle>
                    <div className="flex gap-2">
                      <Badge variant={zone.status === 'active' ? 'default' : 'secondary'}>
                        {zone.status}
                      </Badge>
                      <Badge variant="outline">{zone.zone_type}</Badge>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleOpenDialog(zone)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(zone.id)}
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <Users className="h-4 w-4" />
                  <span>Capacity: {zone.capacity} spots</span>
                </div>
                {zone.location_notes && (
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <MapPin className="h-4 w-4" />
                    <span>{zone.location_notes}</span>
                  </div>
                )}
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <Clock className="h-4 w-4" />
                  <span>{zone.available_from} - {zone.available_to}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Settings className="h-4 w-4" />
                  <span className={zone.auto_approve_bookings ? 'text-green-600' : 'text-slate-600'}>
                    {zone.auto_approve_bookings ? 'Auto-approve enabled' : 'Manual approval'}
                  </span>
                </div>
                {zone.shared_with_building_ids?.length > 0 && (
                  <div className="pt-2 border-t">
                    <p className="text-xs text-slate-500">
                      Shared with {zone.shared_with_building_ids.length} building(s)
                    </p>
                  </div>
                )}
                <div className="pt-3 border-t">
                  <ParkingSpotManager zone={zone} />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingZone ? 'Edit Parking Zone' : 'Add Parking Zone'}</DialogTitle>
            <DialogDescription>
              Configure parking zone details and booking settings
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Zone Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Visitor Parking A"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="capacity">Capacity (spots) *</Label>
                <Input
                  id="capacity"
                  type="number"
                  min="1"
                  value={formData.capacity}
                  onChange={(e) => setFormData({ ...formData, capacity: e.target.value })}
                  placeholder="10"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="zone_type">Zone Type</Label>
                <Select value={formData.zone_type} onValueChange={(value) => setFormData({ ...formData, zone_type: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="visitor">Visitor</SelectItem>
                    <SelectItem value="loading_bay">Loading Bay</SelectItem>
                    <SelectItem value="temporary">Temporary</SelectItem>
                    <SelectItem value="reserved">Reserved</SelectItem>
                    <SelectItem value="handicap">Handicap</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                    <SelectItem value="maintenance">Maintenance</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="location_notes">Location Notes</Label>
              <Input
                id="location_notes"
                value={formData.location_notes}
                onChange={(e) => setFormData({ ...formData, location_notes: e.target.value })}
                placeholder="e.g., Level 2, Section A"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="available_from">Available From</Label>
                <Input
                  id="available_from"
                  type="time"
                  value={formData.available_from}
                  onChange={(e) => setFormData({ ...formData, available_from: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="available_to">Available To</Label>
                <Input
                  id="available_to"
                  type="time"
                  value={formData.available_to}
                  onChange={(e) => setFormData({ ...formData, available_to: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Additional Notes</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Any additional information..."
                rows={3}
              />
            </div>

            <div className="space-y-4 pt-4 border-t">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="auto_approve">Auto Approve</Label>
                  <p className="text-sm text-slate-500">
                    Bookings for this zone are approved automatically, without requiring manual approval
                  </p>
                </div>
                <Switch
                  id="auto_approve"
                  checked={formData.auto_approve_bookings}
                  onCheckedChange={(checked) => setFormData({ ...formData, auto_approve_bookings: checked })}
                />
              </div>

              <div className="space-y-3">
                <Label>Share with Other Buildings</Label>
                <p className="text-sm text-slate-500">
                  Select buildings that can book parking in this zone
                </p>
                <div className="space-y-2 max-h-40 overflow-y-auto border rounded-md p-3">
                  {managedBuildings
                    .filter(b => b.id !== selectedBuildingId)
                    .map((building) => (
                      <div key={building.id} className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id={`building-${building.id}`}
                          checked={formData.shared_with_building_ids.includes(building.id)}
                          onChange={() => toggleSharedBuilding(building.id)}
                          className="rounded border-gray-300"
                        />
                        <label htmlFor={`building-${building.id}`} className="text-sm cursor-pointer">
                          {building.name}
                        </label>
                      </div>
                    ))}
                  {managedBuildings.filter(b => b.id !== selectedBuildingId).length === 0 && (
                    <p className="text-sm text-slate-500 italic">No other buildings available</p>
                  )}
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleCloseDialog}>
                Cancel
              </Button>
              <Button type="submit" disabled={saveMutation.isPending}>
                {saveMutation.isPending ? 'Saving...' : editingZone ? 'Update Zone' : 'Create Zone'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}