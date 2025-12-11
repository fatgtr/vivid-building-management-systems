import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import PageHeader from '@/components/common/PageHeader';
import EmptyState from '@/components/common/EmptyState';
import StatusBadge from '@/components/common/StatusBadge';
import { Building2, MapPin, Home, Users, Pencil, Trash2, Search, MoreVertical } from 'lucide-react';
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

const initialFormState = {
  name: '',
  address: '',
  city: '',
  state: '',
  postal_code: '',
  country: '',
  total_units: '',
  floors: '',
  year_built: '',
  building_type: 'residential',
  manager_name: '',
  manager_email: '',
  manager_phone: '',
  status: 'active',
  strata_plan_number: '',
  strata_managing_agent_name: '',
  strata_managing_agent_license: '',
  strata_lots: '',
};

export default function Buildings() {
  const [showDialog, setShowDialog] = useState(false);
  const [editingBuilding, setEditingBuilding] = useState(null);
  const [formData, setFormData] = useState(initialFormState);
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteBuilding, setDeleteBuilding] = useState(null);

  const queryClient = useQueryClient();

  const { data: buildings = [], isLoading } = useQuery({
    queryKey: ['buildings'],
    queryFn: () => base44.entities.Building.list(),
  });

  const { data: units = [] } = useQuery({
    queryKey: ['units'],
    queryFn: () => base44.entities.Unit.list(),
  });

  const { data: residents = [] } = useQuery({
    queryKey: ['residents'],
    queryFn: () => base44.entities.Resident.list(),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Building.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['buildings'] });
      handleCloseDialog();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Building.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['buildings'] });
      handleCloseDialog();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Building.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['buildings'] });
      setDeleteBuilding(null);
    },
  });

  const handleCloseDialog = () => {
    setShowDialog(false);
    setEditingBuilding(null);
    setFormData(initialFormState);
  };

  const handleEdit = (building) => {
    setEditingBuilding(building);
    setFormData({
      name: building.name || '',
      address: building.address || '',
      city: building.city || '',
      state: building.state || '',
      postal_code: building.postal_code || '',
      country: building.country || '',
      total_units: building.total_units || '',
      floors: building.floors || '',
      year_built: building.year_built || '',
      building_type: building.building_type || 'residential',
      manager_name: building.manager_name || '',
      manager_email: building.manager_email || '',
      manager_phone: building.manager_phone || '',
      status: building.status || 'active',
      strata_plan_number: building.strata_plan_number || '',
      strata_managing_agent_name: building.strata_managing_agent_name || '',
      strata_managing_agent_license: building.strata_managing_agent_license || '',
      strata_lots: building.strata_lots || '',
    });
    setShowDialog(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const data = {
      ...formData,
      total_units: formData.total_units ? Number(formData.total_units) : null,
      floors: formData.floors ? Number(formData.floors) : null,
      year_built: formData.year_built ? Number(formData.year_built) : null,
      strata_lots: formData.strata_lots ? Number(formData.strata_lots) : null,
    };

    if (editingBuilding) {
      updateMutation.mutate({ id: editingBuilding.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const filteredBuildings = buildings.filter(b => 
    b.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    b.address?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    b.city?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getUnitCount = (buildingId) => units.filter(u => u.building_id === buildingId).length;
  const getResidentCount = (buildingId) => residents.filter(r => r.building_id === buildingId && r.status === 'active').length;

  if (isLoading) {
    return (
      <div className="space-y-8">
        <PageHeader title="Buildings" subtitle="Manage your property portfolio" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-64 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Buildings" 
        subtitle={`${buildings.length} properties in your portfolio`}
        action={() => setShowDialog(true)}
        actionLabel="Add Building"
      >
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search buildings..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 w-64"
          />
        </div>
      </PageHeader>

      {filteredBuildings.length === 0 ? (
        <EmptyState
          icon={Building2}
          title="No buildings yet"
          description="Add your first building to start managing your properties"
          action={() => setShowDialog(true)}
          actionLabel="Add Building"
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredBuildings.map((building) => (
            <Card key={building.id} className="group border-0 shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden">
              <div className="relative h-40 bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center">
                {building.image_url ? (
                  <img src={building.image_url} alt={building.name} className="w-full h-full object-cover" />
                ) : (
                  <Building2 className="h-16 w-16 text-slate-300" />
                )}
                <div className="absolute top-3 right-3">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="secondary" size="icon" className="h-8 w-8 bg-white/90 hover:bg-white">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleEdit(building)}>
                        <Pencil className="mr-2 h-4 w-4" /> Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => setDeleteBuilding(building)}
                        className="text-red-600"
                      >
                        <Trash2 className="mr-2 h-4 w-4" /> Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <div className="absolute bottom-3 left-3">
                  <StatusBadge status={building.status} />
                </div>
              </div>
              <CardContent className="p-5">
                <h3 className="font-semibold text-lg text-slate-900 mb-1">{building.name}</h3>
                {building.strata_plan_number && (
                  <p className="text-xs text-blue-600 font-medium mb-2">SP: {building.strata_plan_number}</p>
                )}
                <div className="flex items-center text-slate-500 text-sm mb-4">
                  <MapPin className="h-4 w-4 mr-1 flex-shrink-0" />
                  <span className="truncate">{building.address}{building.city && `, ${building.city}`}</span>
                </div>
                <div className="flex items-center gap-4 text-sm">
                  <div className="flex items-center gap-1.5">
                    <Home className="h-4 w-4 text-blue-500" />
                    <span className="font-medium text-slate-700">{getUnitCount(building.id)}</span>
                    <span className="text-slate-500">units</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Users className="h-4 w-4 text-emerald-500" />
                    <span className="font-medium text-slate-700">{getResidentCount(building.id)}</span>
                    <span className="text-slate-500">residents</span>
                  </div>
                </div>
                {building.building_type && (
                  <div className="mt-3 pt-3 border-t border-slate-100">
                    <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                      {building.building_type.replace(/_/g, ' ')}
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingBuilding ? 'Edit Building' : 'Add New Building'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <Label htmlFor="name">Building Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Enter building name"
                  required
                />
              </div>
              <div className="md:col-span-2">
                <Label htmlFor="address">Address *</Label>
                <Input
                  id="address"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="Street address"
                  required
                />
              </div>
              <div>
                <Label htmlFor="city">City</Label>
                <Input
                  id="city"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  placeholder="City"
                />
              </div>
              <div>
                <Label htmlFor="state">State/Province</Label>
                <Input
                  id="state"
                  value={formData.state}
                  onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                  placeholder="State"
                />
              </div>
              <div>
                <Label htmlFor="postal_code">Postal Code</Label>
                <Input
                  id="postal_code"
                  value={formData.postal_code}
                  onChange={(e) => setFormData({ ...formData, postal_code: e.target.value })}
                  placeholder="Postal code"
                />
              </div>
              <div>
                <Label htmlFor="country">Country</Label>
                <Input
                  id="country"
                  value={formData.country}
                  onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                  placeholder="Country"
                />
              </div>
              <div>
                <Label htmlFor="building_type">Building Type</Label>
                <Select value={formData.building_type} onValueChange={(v) => setFormData({ ...formData, building_type: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="residential">Residential</SelectItem>
                    <SelectItem value="commercial">Commercial</SelectItem>
                    <SelectItem value="mixed_use">Mixed Use</SelectItem>
                    <SelectItem value="hoa">HOA</SelectItem>
                    <SelectItem value="condo">Condo</SelectItem>
                    <SelectItem value="co_op">Co-op</SelectItem>
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
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="total_units">Total Units</Label>
                <Input
                  id="total_units"
                  type="number"
                  value={formData.total_units}
                  onChange={(e) => setFormData({ ...formData, total_units: e.target.value })}
                  placeholder="Number of units"
                />
              </div>
              <div>
                <Label htmlFor="floors">Floors</Label>
                <Input
                  id="floors"
                  type="number"
                  value={formData.floors}
                  onChange={(e) => setFormData({ ...formData, floors: e.target.value })}
                  placeholder="Number of floors"
                />
              </div>
              <div>
                <Label htmlFor="year_built">Year Built</Label>
                <Input
                  id="year_built"
                  type="number"
                  value={formData.year_built}
                  onChange={(e) => setFormData({ ...formData, year_built: e.target.value })}
                  placeholder="Year built"
                />
              </div>
            </div>

            <div className="border-t pt-4">
              <h4 className="font-medium text-slate-900 mb-4">Building Manager</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="manager_name">Name</Label>
                  <Input
                    id="manager_name"
                    value={formData.manager_name}
                    onChange={(e) => setFormData({ ...formData, manager_name: e.target.value })}
                    placeholder="Manager name"
                  />
                </div>
                <div>
                  <Label htmlFor="manager_email">Email</Label>
                  <Input
                    id="manager_email"
                    type="email"
                    value={formData.manager_email}
                    onChange={(e) => setFormData({ ...formData, manager_email: e.target.value })}
                    placeholder="Email address"
                  />
                </div>
                <div>
                  <Label htmlFor="manager_phone">Phone</Label>
                  <Input
                    id="manager_phone"
                    value={formData.manager_phone}
                    onChange={(e) => setFormData({ ...formData, manager_phone: e.target.value })}
                    placeholder="Phone number"
                  />
                </div>
              </div>
            </div>

            <div className="border-t pt-4">
              <h4 className="font-medium text-slate-900 mb-4">Strata Information</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="strata_plan_number">Strata Plan Number</Label>
                  <Input
                    id="strata_plan_number"
                    value={formData.strata_plan_number}
                    onChange={(e) => setFormData({ ...formData, strata_plan_number: e.target.value })}
                    placeholder="e.g., SP60919"
                  />
                </div>
                <div>
                  <Label htmlFor="strata_lots">Number of Lots</Label>
                  <Input
                    id="strata_lots"
                    type="number"
                    value={formData.strata_lots}
                    onChange={(e) => setFormData({ ...formData, strata_lots: e.target.value })}
                    placeholder="e.g., 71"
                  />
                </div>
                <div>
                  <Label htmlFor="strata_managing_agent_name">Managing Agent Name</Label>
                  <Input
                    id="strata_managing_agent_name"
                    value={formData.strata_managing_agent_name}
                    onChange={(e) => setFormData({ ...formData, strata_managing_agent_name: e.target.value })}
                    placeholder="e.g., Premium Strata Pty Ltd"
                  />
                </div>
                <div>
                  <Label htmlFor="strata_managing_agent_license">Agent License Number</Label>
                  <Input
                    id="strata_managing_agent_license"
                    value={formData.strata_managing_agent_license}
                    onChange={(e) => setFormData({ ...formData, strata_managing_agent_license: e.target.value })}
                    placeholder="e.g., 1449556"
                  />
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleCloseDialog}>
                Cancel
              </Button>
              <Button 
                type="submit" 
                className="bg-blue-600 hover:bg-blue-700"
                disabled={createMutation.isPending || updateMutation.isPending}
              >
                {createMutation.isPending || updateMutation.isPending ? 'Saving...' : (editingBuilding ? 'Update' : 'Create')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteBuilding} onOpenChange={() => setDeleteBuilding(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Building</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deleteBuilding?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteMutation.mutate(deleteBuilding.id)}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}