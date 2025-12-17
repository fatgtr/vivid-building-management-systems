import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import StatusBadge from '@/components/common/StatusBadge';
import { Home, Pencil, Trash2, Bed, Bath, Square, MoreVertical, Edit, Plus } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { toast } from 'sonner';

const initialFormState = {
  building_id: '',
  unit_number: '',
  lot_number: '',
  floor: '',
  bedrooms: '',
  bathrooms: '',
  square_feet: '',
  unit_type: 'apartment',
  status: 'vacant',
  monthly_rent: '',
  owner_name: '',
  owner_email: '',
  owner_phone: '',
};

export default function UnitsManager({ buildingId }) {
  const [showDialog, setShowDialog] = useState(false);
  const [editingUnit, setEditingUnit] = useState(null);
  const [formData, setFormData] = useState({ ...initialFormState, building_id: buildingId });
  const [deleteUnit, setDeleteUnit] = useState(null);
  const [selectedUnits, setSelectedUnits] = useState([]);
  const [showBulkEditDialog, setShowBulkEditDialog] = useState(false);
  const [bulkEditData, setBulkEditData] = useState({ unit_type: '', status: '' });

  const queryClient = useQueryClient();

  const { data: units = [] } = useQuery({
    queryKey: ['units', buildingId],
    queryFn: () => base44.entities.Unit.list(),
    select: (data) => data.filter(u => u.building_id === buildingId),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Unit.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['units'] });
      handleCloseDialog();
      toast.success('Unit created successfully');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Unit.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['units'] });
      handleCloseDialog();
      toast.success('Unit updated successfully');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Unit.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['units'] });
      setDeleteUnit(null);
      toast.success('Unit deleted successfully');
    },
  });

  const bulkUpdateMutation = useMutation({
    mutationFn: async (updates) => {
      const promises = selectedUnits.map(unitId => {
        const unit = units.find(u => u.id === unitId);
        return base44.entities.Unit.update(unitId, { ...unit, ...updates });
      });
      return Promise.all(promises);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['units'] });
      setShowBulkEditDialog(false);
      setSelectedUnits([]);
      setBulkEditData({ unit_type: '', status: '' });
      toast.success('Units updated successfully');
    },
  });

  const handleCloseDialog = () => {
    setShowDialog(false);
    setEditingUnit(null);
    setFormData({ ...initialFormState, building_id: buildingId });
  };

  const toggleSelectUnit = (unitId) => {
    setSelectedUnits(prev => 
      prev.includes(unitId) 
        ? prev.filter(id => id !== unitId)
        : [...prev, unitId]
    );
  };

  const toggleSelectAll = () => {
    if (selectedUnits.length === units.length) {
      setSelectedUnits([]);
    } else {
      setSelectedUnits(units.map(u => u.id));
    }
  };

  const handleBulkEditSubmit = (e) => {
    e.preventDefault();
    const updates = {};
    if (bulkEditData.unit_type) updates.unit_type = bulkEditData.unit_type;
    if (bulkEditData.status) updates.status = bulkEditData.status;
    
    if (Object.keys(updates).length > 0) {
      bulkUpdateMutation.mutate(updates);
    }
  };

  const handleEdit = (unit) => {
    setEditingUnit(unit);
    setFormData({
      building_id: unit.building_id || buildingId,
      unit_number: unit.unit_number || '',
      lot_number: unit.lot_number || '',
      floor: unit.floor || '',
      bedrooms: unit.bedrooms || '',
      bathrooms: unit.bathrooms || '',
      square_feet: unit.square_feet || '',
      unit_type: unit.unit_type || 'apartment',
      status: unit.status || 'vacant',
      monthly_rent: unit.monthly_rent || '',
      owner_name: unit.owner_name || '',
      owner_email: unit.owner_email || '',
      owner_phone: unit.owner_phone || '',
    });
    setShowDialog(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const data = {
      ...formData,
      floor: formData.floor ? Number(formData.floor) : null,
      bedrooms: formData.bedrooms ? Number(formData.bedrooms) : null,
      bathrooms: formData.bathrooms ? Number(formData.bathrooms) : null,
      square_feet: formData.square_feet ? Number(formData.square_feet) : null,
      monthly_rent: formData.monthly_rent ? Number(formData.monthly_rent) : null,
    };

    if (editingUnit) {
      updateMutation.mutate({ id: editingUnit.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-slate-900">Units ({units.length})</h3>
        <Button onClick={() => setShowDialog(true)} size="sm" className="bg-blue-600 hover:bg-blue-700">
          <Plus className="h-4 w-4 mr-2" />
          Add Unit
        </Button>
      </div>

      {selectedUnits.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-center justify-between">
          <span className="text-sm font-medium text-blue-900">
            {selectedUnits.length} unit{selectedUnits.length > 1 ? 's' : ''} selected
          </span>
          <div className="flex gap-2">
            <Button onClick={() => setShowBulkEditDialog(true)} className="bg-blue-600 hover:bg-blue-700" size="sm">
              <Edit className="h-4 w-4 mr-2" />
              Bulk Edit
            </Button>
            <Button onClick={() => setSelectedUnits([])} variant="outline" size="sm">
              Clear
            </Button>
          </div>
        </div>
      )}

      {units.length === 0 ? (
        <div className="text-center py-12 border-2 border-dashed border-slate-200 rounded-lg">
          <Home className="h-12 w-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 mb-4">No units in this building yet</p>
          <Button onClick={() => setShowDialog(true)} size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Add First Unit
          </Button>
        </div>
      ) : (
        <Card className="border-0 shadow-sm overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50">
                <TableHead className="w-12">
                  <Checkbox
                    checked={selectedUnits.length === units.length && units.length > 0}
                    onCheckedChange={toggleSelectAll}
                  />
                </TableHead>
                <TableHead>Unit</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Details</TableHead>
                <TableHead>Rent</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {units.map((unit) => (
                <TableRow key={unit.id} className="hover:bg-slate-50/50">
                  <TableCell>
                    <Checkbox
                      checked={selectedUnits.includes(unit.id)}
                      onCheckedChange={() => toggleSelectUnit(unit.id)}
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-blue-50 rounded-lg">
                        <Home className="h-4 w-4 text-blue-600" />
                      </div>
                      <div>
                        <p className="font-medium text-slate-900">{unit.unit_number}</p>
                        {unit.lot_number && <p className="text-xs text-slate-500">Lot {unit.lot_number}</p>}
                        {unit.floor && <p className="text-xs text-slate-500">Floor {unit.floor}</p>}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="capitalize text-slate-600">{unit.unit_type?.replace(/_/g, ' ')}</span>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-3 text-sm text-slate-500">
                      {unit.bedrooms && (
                        <span className="flex items-center gap-1">
                          <Bed className="h-3.5 w-3.5" /> {unit.bedrooms}
                        </span>
                      )}
                      {unit.bathrooms && (
                        <span className="flex items-center gap-1">
                          <Bath className="h-3.5 w-3.5" /> {unit.bathrooms}
                        </span>
                      )}
                      {unit.square_feet && (
                        <span className="flex items-center gap-1">
                          <Square className="h-3.5 w-3.5" /> {unit.square_feet} sqft
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {unit.monthly_rent ? (
                      <span className="font-medium text-slate-900">${unit.monthly_rent.toLocaleString()}/mo</span>
                    ) : (
                      <span className="text-slate-400">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={unit.status} />
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleEdit(unit)}>
                          <Pencil className="mr-2 h-4 w-4" /> Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setDeleteUnit(unit)} className="text-red-600">
                          <Trash2 className="mr-2 h-4 w-4" /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingUnit ? 'Edit Unit' : 'Add New Unit'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="unit_number">Unit Number *</Label>
                <Input
                  id="unit_number"
                  value={formData.unit_number}
                  onChange={(e) => setFormData({ ...formData, unit_number: e.target.value })}
                  placeholder="e.g., 101, A1"
                  required
                />
              </div>
              <div>
                <Label htmlFor="lot_number">Lot Number</Label>
                <Input
                  id="lot_number"
                  value={formData.lot_number}
                  onChange={(e) => setFormData({ ...formData, lot_number: e.target.value })}
                  placeholder="e.g., PT 58"
                />
              </div>
              <div>
                <Label htmlFor="floor">Floor</Label>
                <Input
                  id="floor"
                  type="number"
                  value={formData.floor}
                  onChange={(e) => setFormData({ ...formData, floor: e.target.value })}
                  placeholder="Floor number"
                />
              </div>
              <div>
                <Label htmlFor="unit_type">Unit Type</Label>
                <Select value={formData.unit_type} onValueChange={(v) => setFormData({ ...formData, unit_type: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="studio">Studio</SelectItem>
                    <SelectItem value="apartment">Apartment</SelectItem>
                    <SelectItem value="penthouse">Penthouse</SelectItem>
                    <SelectItem value="townhouse">Townhouse</SelectItem>
                    <SelectItem value="commercial">Commercial</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="status">Status</Label>
                <Select value={formData.status} onValueChange={(v) => setFormData({ ...formData, status: v })}>
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
              <div>
                <Label htmlFor="bedrooms">Bedrooms</Label>
                <Input
                  id="bedrooms"
                  type="number"
                  value={formData.bedrooms}
                  onChange={(e) => setFormData({ ...formData, bedrooms: e.target.value })}
                  placeholder="0"
                />
              </div>
              <div>
                <Label htmlFor="bathrooms">Bathrooms</Label>
                <Input
                  id="bathrooms"
                  type="number"
                  step="0.5"
                  value={formData.bathrooms}
                  onChange={(e) => setFormData({ ...formData, bathrooms: e.target.value })}
                  placeholder="0"
                />
              </div>
              <div>
                <Label htmlFor="square_feet">Square Feet</Label>
                <Input
                  id="square_feet"
                  type="number"
                  value={formData.square_feet}
                  onChange={(e) => setFormData({ ...formData, square_feet: e.target.value })}
                  placeholder="Area in sq ft"
                />
              </div>
              <div>
                <Label htmlFor="monthly_rent">Monthly Rent</Label>
                <Input
                  id="monthly_rent"
                  type="number"
                  value={formData.monthly_rent}
                  onChange={(e) => setFormData({ ...formData, monthly_rent: e.target.value })}
                  placeholder="0.00"
                />
              </div>
            </div>

            <div className="border-t pt-4">
              <h4 className="font-medium text-slate-900 mb-4">Owner Information</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="owner_name">Name</Label>
                  <Input
                    id="owner_name"
                    value={formData.owner_name}
                    onChange={(e) => setFormData({ ...formData, owner_name: e.target.value })}
                    placeholder="Owner name"
                  />
                </div>
                <div>
                  <Label htmlFor="owner_email">Email</Label>
                  <Input
                    id="owner_email"
                    type="email"
                    value={formData.owner_email}
                    onChange={(e) => setFormData({ ...formData, owner_email: e.target.value })}
                    placeholder="Email"
                  />
                </div>
                <div>
                  <Label htmlFor="owner_phone">Phone</Label>
                  <Input
                    id="owner_phone"
                    value={formData.owner_phone}
                    onChange={(e) => setFormData({ ...formData, owner_phone: e.target.value })}
                    placeholder="Phone"
                  />
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleCloseDialog}>Cancel</Button>
              <Button type="submit" className="bg-blue-600 hover:bg-blue-700" disabled={createMutation.isPending || updateMutation.isPending}>
                {createMutation.isPending || updateMutation.isPending ? 'Saving...' : (editingUnit ? 'Update' : 'Create')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Bulk Edit Dialog */}
      <Dialog open={showBulkEditDialog} onOpenChange={setShowBulkEditDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Bulk Edit Units</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleBulkEditSubmit} className="space-y-4">
            <p className="text-sm text-slate-600">
              Editing {selectedUnits.length} unit{selectedUnits.length > 1 ? 's' : ''}. 
              Only fields you change will be updated.
            </p>
            <div>
              <Label htmlFor="bulk_unit_type">Unit Type</Label>
              <Select 
                value={bulkEditData.unit_type} 
                onValueChange={(v) => setBulkEditData({ ...bulkEditData, unit_type: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select to change..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={null}>Don't Change</SelectItem>
                  <SelectItem value="studio">Studio</SelectItem>
                  <SelectItem value="apartment">Apartment</SelectItem>
                  <SelectItem value="penthouse">Penthouse</SelectItem>
                  <SelectItem value="townhouse">Townhouse</SelectItem>
                  <SelectItem value="commercial">Commercial</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="bulk_status">Status</Label>
              <Select 
                value={bulkEditData.status} 
                onValueChange={(v) => setBulkEditData({ ...bulkEditData, status: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select to change..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={null}>Don't Change</SelectItem>
                  <SelectItem value="vacant">Vacant</SelectItem>
                  <SelectItem value="occupied">Occupied</SelectItem>
                  <SelectItem value="maintenance">Maintenance</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setShowBulkEditDialog(false)}
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                className="bg-blue-600 hover:bg-blue-700"
                disabled={bulkUpdateMutation.isPending || (!bulkEditData.unit_type && !bulkEditData.status)}
              >
                {bulkUpdateMutation.isPending ? 'Updating...' : 'Update Units'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteUnit} onOpenChange={() => setDeleteUnit(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Unit</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete unit "{deleteUnit?.unit_number}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteMutation.mutate(deleteUnit.id)} className="bg-red-600 hover:bg-red-700">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}