import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, Trash2, Car, MapPin } from 'lucide-react';
import { toast } from 'sonner';
import EmptyState from '@/components/common/EmptyState';

export default function ParkingAllocationList({ parkingSpaces, units, buildingId }) {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSpace, setEditingSpace] = useState(null);
  const [formData, setFormData] = useState({
    unit_id: '',
    lot_number: '',
    bay_number: '',
    level: '',
    section: '',
    space_type: 'car',
    size: 'standard',
    on_title: true,
    status: 'allocated',
    notes: ''
  });

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      if (editingSpace) {
        return base44.entities.ResidentParking.update(editingSpace.id, data);
      } else {
        return base44.entities.ResidentParking.create({
          ...data,
          building_id: buildingId
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['residentParking'] });
      toast.success(editingSpace ? 'Parking space updated' : 'Parking space created');
      handleCloseDialog();
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (spaceId) => base44.entities.ResidentParking.delete(spaceId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['residentParking'] });
      toast.success('Parking space deleted');
    }
  });

  const handleOpenDialog = (space = null) => {
    if (space) {
      setEditingSpace(space);
      setFormData({
        unit_id: space.unit_id || '',
        lot_number: space.lot_number || '',
        bay_number: space.bay_number || '',
        level: space.level || '',
        section: space.section || '',
        space_type: space.space_type || 'car',
        size: space.size || 'standard',
        on_title: space.on_title !== false,
        status: space.status || 'allocated',
        notes: space.notes || ''
      });
    } else {
      setEditingSpace(null);
      setFormData({
        unit_id: '',
        lot_number: '',
        bay_number: '',
        level: '',
        section: '',
        space_type: 'car',
        size: 'standard',
        on_title: true,
        status: 'allocated',
        notes: ''
      });
    }
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingSpace(null);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    saveMutation.mutate(formData);
  };

  const handleDelete = (spaceId) => {
    if (confirm('Delete this parking allocation?')) {
      deleteMutation.mutate(spaceId);
    }
  };

  const getUnitInfo = (unitId) => {
    const unit = units.find(u => u.id === unitId);
    return unit ? `${unit.unit_number}${unit.lot_number ? ` (Lot ${unit.lot_number})` : ''}` : 'Unallocated';
  };

  if (parkingSpaces.length === 0) {
    return (
      <EmptyState
        icon={Car}
        title="No Parking Spaces"
        description="Add your first parking space allocation to start tracking resident parking"
        actionLabel="Add Parking Space"
        onAction={() => handleOpenDialog()}
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => handleOpenDialog()}>
          <Plus className="h-4 w-4 mr-2" />
          Add Parking Space
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {parkingSpaces.map((space) => (
          <Card key={space.id} className="hover:shadow-lg transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Car className="h-4 w-4" />
                    {space.bay_number}
                  </CardTitle>
                  <div className="flex gap-2 flex-wrap">
                    <Badge variant="outline" className="text-xs">
                      {space.space_type}
                    </Badge>
                    {space.on_title && (
                      <Badge className="text-xs bg-blue-100 text-blue-800">
                        On Title
                      </Badge>
                    )}
                  </div>
                </div>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => handleOpenDialog(space)}
                  >
                    <Edit className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => handleDelete(space.id)}
                  >
                    <Trash2 className="h-3 w-3 text-red-500" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {space.unit_id && (
                <div className="text-sm">
                  <span className="text-slate-500">Unit: </span>
                  <span className="font-medium">{getUnitInfo(space.unit_id)}</span>
                </div>
              )}
              {space.lot_number && (
                <div className="text-sm">
                  <span className="text-slate-500">Lot: </span>
                  <span>{space.lot_number}</span>
                </div>
              )}
              {(space.level || space.section) && (
                <div className="flex items-center gap-1 text-sm text-slate-600">
                  <MapPin className="h-3 w-3" />
                  <span>
                    {space.level && space.level}
                    {space.level && space.section && ' - '}
                    {space.section && space.section}
                  </span>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingSpace ? 'Edit Parking Space' : 'Add Parking Space'}</DialogTitle>
            <DialogDescription>
              Configure parking allocation details
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="bay_number">Bay Number *</Label>
                <Input
                  id="bay_number"
                  value={formData.bay_number}
                  onChange={(e) => setFormData({ ...formData, bay_number: e.target.value })}
                  placeholder="e.g., P-045, Bay 12"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lot_number">Lot Number</Label>
                <Input
                  id="lot_number"
                  value={formData.lot_number}
                  onChange={(e) => setFormData({ ...formData, lot_number: e.target.value })}
                  placeholder="Strata lot number"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="unit_id">Allocated to Unit</Label>
              <Select value={formData.unit_id} onValueChange={(value) => setFormData({ ...formData, unit_id: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select unit..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={null}>Unallocated</SelectItem>
                  {units.map((unit) => (
                    <SelectItem key={unit.id} value={unit.id}>
                      {unit.unit_number} {unit.lot_number && `(Lot ${unit.lot_number})`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="level">Level</Label>
                <Input
                  id="level"
                  value={formData.level}
                  onChange={(e) => setFormData({ ...formData, level: e.target.value })}
                  placeholder="e.g., B1, B2, Ground"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="section">Section</Label>
                <Input
                  id="section"
                  value={formData.section}
                  onChange={(e) => setFormData({ ...formData, section: e.target.value })}
                  placeholder="e.g., North Wing, Section A"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="space_type">Type</Label>
                <Select value={formData.space_type} onValueChange={(value) => setFormData({ ...formData, space_type: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="car">Car</SelectItem>
                    <SelectItem value="motorcycle">Motorcycle</SelectItem>
                    <SelectItem value="bicycle">Bicycle</SelectItem>
                    <SelectItem value="storage">Storage</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="size">Size</Label>
                <Select value={formData.size} onValueChange={(value) => setFormData({ ...formData, size: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="standard">Standard</SelectItem>
                    <SelectItem value="large">Large</SelectItem>
                    <SelectItem value="compact">Compact</SelectItem>
                    <SelectItem value="tandem">Tandem</SelectItem>
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
                    <SelectItem value="allocated">Allocated</SelectItem>
                    <SelectItem value="vacant">Vacant</SelectItem>
                    <SelectItem value="disputed">Disputed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Input
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Additional information..."
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleCloseDialog}>
                Cancel
              </Button>
              <Button type="submit" disabled={saveMutation.isPending}>
                {saveMutation.isPending ? 'Saving...' : editingSpace ? 'Update' : 'Create'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}