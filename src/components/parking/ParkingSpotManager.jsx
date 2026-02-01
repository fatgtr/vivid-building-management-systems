import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, Trash2, Car } from 'lucide-react';
import { toast } from 'sonner';

export default function ParkingSpotManager({ zone }) {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSpot, setEditingSpot] = useState(null);
  const [formData, setFormData] = useState({
    spot_number: '',
    spot_type: 'standard',
    status: 'available',
    notes: ''
  });

  // Fetch spots for this zone
  const { data: spots = [] } = useQuery({
    queryKey: ['parkingSpots', zone.id],
    queryFn: () => base44.entities.ParkingSpot.filter({ parking_zone_id: zone.id })
  });

  // Create/Update spot mutation
  const saveMutation = useMutation({
    mutationFn: async (data) => {
      if (editingSpot) {
        return base44.entities.ParkingSpot.update(editingSpot.id, data);
      } else {
        return base44.entities.ParkingSpot.create({
          ...data,
          parking_zone_id: zone.id,
          building_id: zone.building_id
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['parkingSpots'] });
      toast.success(editingSpot ? 'Spot updated' : 'Spot created');
      handleCloseDialog();
    }
  });

  // Delete spot mutation
  const deleteMutation = useMutation({
    mutationFn: (spotId) => base44.entities.ParkingSpot.delete(spotId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['parkingSpots'] });
      toast.success('Spot deleted');
    }
  });

  const handleOpenDialog = (spot = null) => {
    if (spot) {
      setEditingSpot(spot);
      setFormData({
        spot_number: spot.spot_number || '',
        spot_type: spot.spot_type || 'standard',
        status: spot.status || 'available',
        notes: spot.notes || ''
      });
    } else {
      setEditingSpot(null);
      setFormData({
        spot_number: '',
        spot_type: 'standard',
        status: 'available',
        notes: ''
      });
    }
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingSpot(null);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    saveMutation.mutate(formData);
  };

  const handleDelete = (spotId) => {
    if (confirm('Delete this parking spot?')) {
      deleteMutation.mutate(spotId);
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      available: 'bg-green-100 text-green-800',
      occupied: 'bg-red-100 text-red-800',
      reserved: 'bg-blue-100 text-blue-800',
      maintenance: 'bg-yellow-100 text-yellow-800',
      blocked: 'bg-gray-100 text-gray-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-medium">Parking Spots ({spots.length}/{zone.capacity})</h3>
        <Button size="sm" onClick={() => handleOpenDialog()}>
          <Plus className="h-4 w-4 mr-1" />
          Add Spot
        </Button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
        {spots.map((spot) => (
          <div
            key={spot.id}
            className="border rounded-lg p-3 hover:shadow-md transition-shadow relative group"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Car className="h-4 w-4 text-slate-400" />
                <span className="font-medium">{spot.spot_number}</span>
              </div>
              <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => handleOpenDialog(spot)}
                >
                  <Edit className="h-3 w-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => handleDelete(spot.id)}
                >
                  <Trash2 className="h-3 w-3 text-red-500" />
                </Button>
              </div>
            </div>
            <div className="space-y-1">
              <Badge variant="outline" className="text-xs">{spot.spot_type}</Badge>
              <Badge className={`text-xs ${getStatusColor(spot.status)}`}>
                {spot.status}
              </Badge>
            </div>
          </div>
        ))}
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingSpot ? 'Edit Spot' : 'Add Parking Spot'}</DialogTitle>
            <DialogDescription>
              Configure individual parking spot
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="spot_number">Spot Number *</Label>
              <Input
                id="spot_number"
                value={formData.spot_number}
                onChange={(e) => setFormData({ ...formData, spot_number: e.target.value })}
                placeholder="e.g., A1, V-01"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="spot_type">Spot Type</Label>
              <Select value={formData.spot_type} onValueChange={(value) => setFormData({ ...formData, spot_type: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="standard">Standard</SelectItem>
                  <SelectItem value="compact">Compact</SelectItem>
                  <SelectItem value="handicap">Handicap</SelectItem>
                  <SelectItem value="electric">Electric/EV</SelectItem>
                  <SelectItem value="motorcycle">Motorcycle</SelectItem>
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
                  <SelectItem value="available">Available</SelectItem>
                  <SelectItem value="occupied">Occupied</SelectItem>
                  <SelectItem value="reserved">Reserved</SelectItem>
                  <SelectItem value="maintenance">Maintenance</SelectItem>
                  <SelectItem value="blocked">Blocked</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Input
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Optional notes..."
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleCloseDialog}>
                Cancel
              </Button>
              <Button type="submit" disabled={saveMutation.isPending}>
                {saveMutation.isPending ? 'Saving...' : editingSpot ? 'Update' : 'Create'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}