import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useBuildingContext } from '@/components/BuildingContext';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import StatusBadge from '@/components/common/StatusBadge';
import EmptyState from '@/components/common/EmptyState';
import {
  Search,
  Home,
  Plus,
  Edit2,
  Trash2,
  Upload,
  AlertCircle
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function LotsTab() {
  const { selectedBuildingId } = useBuildingContext();
  const [searchQuery, setSearchQuery] = useState('');
  const [editingUnit, setEditingUnit] = useState(null);
  const [deleteUnit, setDeleteUnit] = useState(null);
  const [openDialog, setOpenDialog] = useState(false);
  const queryClient = useQueryClient();

  const { data: units = [], isLoading } = useQuery({
    queryKey: ['units', selectedBuildingId],
    queryFn: () => base44.entities.Unit.filter({ building_id: selectedBuildingId }),
    enabled: !!selectedBuildingId,
  });

  const { data: residents = [] } = useQuery({
    queryKey: ['residents', selectedBuildingId],
    queryFn: () => base44.entities.Resident.filter({ building_id: selectedBuildingId }),
    enabled: !!selectedBuildingId,
  });

  const { data: buildings = [] } = useQuery({
    queryKey: ['buildings'],
    queryFn: () => base44.entities.Building.list(),
  });

  const updateUnitMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Unit.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['units'] });
      setOpenDialog(false);
      setEditingUnit(null);
    },
  });

  const deleteUnitMutation = useMutation({
    mutationFn: (id) => base44.entities.Unit.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['units'] });
      setDeleteUnit(null);
    },
  });

  const currentBuilding = buildings.find(b => b.id === selectedBuildingId);
  const isBMC = currentBuilding?.is_bmc;

  const filteredUnits = units.filter(u => {
    const matchesSearch =
      u.unit_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.lot_number?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  const getResidentsForUnit = (unitId) => {
    return residents.filter(r => r.unit_id === unitId);
  };

  const handleSaveUnit = (formData) => {
    if (editingUnit) {
      updateUnitMutation.mutate({ id: editingUnit.id, data: formData });
    }
  };

  if (isLoading) {
    return <Skeleton className="h-96 rounded-xl" />;
  }

  if (!selectedBuildingId) {
    return (
      <EmptyState
        icon={AlertCircle}
        title="Select a Building"
        description="Please select a building from the dropdown to view lots"
      />
    );
  }

  return (
    <div className="space-y-6">
      {units.length === 0 && (
        <Alert className="bg-blue-50 border-blue-200">
          <AlertCircle className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-900">
            No lots have been auto-populated yet. Complete the building setup to create lot records.
          </AlertDescription>
        </Alert>
      )}

      {/* Header Actions */}
      <div className="flex flex-wrap gap-4 items-center justify-between">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search lots..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Lots Grid */}
      {filteredUnits.length === 0 ? (
        <EmptyState
          icon={Home}
          title="No lots found"
          description="Lots will be auto-populated when you complete the building setup"
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredUnits.map((unit) => {
            const unitResidents = getResidentsForUnit(unit.id);
            return (
              <Card key={unit.id} className="p-4 hover:shadow-lg transition-shadow border-2 hover:border-blue-300">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center">
                      <Home className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-semibold text-slate-900">{unit.unit_number}</p>
                      {unit.lot_number && (
                        <p className="text-xs text-slate-500">Lot {unit.lot_number}</p>
                      )}
                    </div>
                  </div>
                  <Dialog open={openDialog && editingUnit?.id === unit.id} onOpenChange={(open) => {
                    setOpenDialog(open);
                    if (!open) setEditingUnit(null);
                  }}>
                    <DialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setEditingUnit(unit)}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Edit Lot Details</DialogTitle>
                        <DialogDescription>
                          Update lot number and other details
                        </DialogDescription>
                      </DialogHeader>
                      <UnitEditForm unit={unit} onSave={handleSaveUnit} onCancel={() => setOpenDialog(false)} />
                    </DialogContent>
                  </Dialog>
                </div>

                <div className="space-y-2 mb-3">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      {unit.status || 'vacant'}
                    </Badge>
                    {unitResidents.length > 0 && (
                      <Badge className="bg-green-100 text-green-800 text-xs">
                        {unitResidents.length} resident{unitResidents.length !== 1 ? 's' : ''}
                      </Badge>
                    )}
                  </div>

                  {unitResidents.length > 0 && (
                    <div className="text-xs text-slate-600 space-y-1">
                      {unitResidents.map((resident) => (
                        <p key={resident.id}>
                          {resident.first_name} {resident.last_name}
                        </p>
                      ))}
                    </div>
                  )}
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  className="w-full text-xs"
                  onClick={() => setDeleteUnit(unit)}
                >
                  <Trash2 className="h-3 w-3 mr-1" />
                  Delete
                </Button>
              </Card>
            );
          })}
        </div>
      )}

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteUnit} onOpenChange={() => setDeleteUnit(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Lot</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {deleteUnit?.unit_number}?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteUnitMutation.mutate(deleteUnit.id)} className="bg-red-600 hover:bg-red-700">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function UnitEditForm({ unit, onSave, onCancel }) {
  const [formData, setFormData] = React.useState({
    lot_number: unit.lot_number || '',
    unit_number: unit.unit_number || '',
    floor: unit.floor || '',
    status: unit.status || 'vacant',
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="text-sm font-medium">Unit Number</label>
        <Input
          value={formData.unit_number}
          onChange={(e) => setFormData({ ...formData, unit_number: e.target.value })}
          placeholder="e.g., Unit 101"
        />
      </div>

      <div>
        <label className="text-sm font-medium">Lot Number</label>
        <Input
          value={formData.lot_number}
          onChange={(e) => setFormData({ ...formData, lot_number: e.target.value })}
          placeholder="e.g., 42"
        />
      </div>

      <div>
        <label className="text-sm font-medium">Floor</label>
        <Input
          value={formData.floor}
          onChange={(e) => setFormData({ ...formData, floor: e.target.value })}
          placeholder="e.g., 1, Ground, B1"
        />
      </div>

      <div>
        <label className="text-sm font-medium">Status</label>
        <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value })}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="vacant">Vacant</SelectItem>
            <SelectItem value="occupied">Occupied</SelectItem>
            <SelectItem value="maintenance">Maintenance</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex justify-end gap-3">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">
          Save Changes
        </Button>
      </div>
    </form>
  );
}