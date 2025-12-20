import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useBuildingContext } from '@/components/BuildingContext';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import EmptyState from '@/components/common/EmptyState';
import { DoorOpen, Search, Building2, LogIn, LogOut, User, Phone, MoreVertical, Trash2 } from 'lucide-react';
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
import { format } from 'date-fns';

const visitorTypes = [
  { value: 'guest', label: 'Guest', color: 'bg-blue-100 text-blue-700' },
  { value: 'delivery', label: 'Delivery', color: 'bg-orange-100 text-orange-700' },
  { value: 'contractor', label: 'Contractor', color: 'bg-purple-100 text-purple-700' },
  { value: 'service', label: 'Service', color: 'bg-green-100 text-green-700' },
  { value: 'other', label: 'Other', color: 'bg-slate-100 text-slate-700' },
];

const initialFormState = {
  building_id: '',
  unit_id: '',
  unit_number: '',
  visitor_name: '',
  visitor_phone: '',
  visitor_type: 'guest',
  purpose: '',
  vehicle_plate: '',
  host_name: '',
  pre_authorized: false,
  id_verified: false,
  notes: '',
};

export default function VisitorsTab() {
  const { selectedBuildingId } = useBuildingContext();
  const [showDialog, setShowDialog] = useState(false);
  const [formData, setFormData] = useState(initialFormState);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [deleteVisitor, setDeleteVisitor] = useState(null);

  const queryClient = useQueryClient();

  const { data: visitors = [], isLoading } = useQuery({
    queryKey: ['visitors'],
    queryFn: () => base44.entities.VisitorLog.list('-check_in_time', 100),
  });

  const { data: buildings = [] } = useQuery({
    queryKey: ['buildings'],
    queryFn: () => base44.entities.Building.list(),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.VisitorLog.create({
      ...data,
      check_in_time: new Date().toISOString(),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['visitors'] });
      handleCloseDialog();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.VisitorLog.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['visitors'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.VisitorLog.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['visitors'] });
      setDeleteVisitor(null);
    },
  });

  const handleCloseDialog = () => {
    setShowDialog(false);
    setFormData(initialFormState);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    createMutation.mutate(formData);
  };

  const handleCheckOut = (visitor) => {
    updateMutation.mutate({
      id: visitor.id,
      data: { ...visitor, check_out_time: new Date().toISOString() },
    });
  };

  const getBuildingName = (buildingId) => buildings.find(b => b.id === buildingId)?.name || 'Unknown';
  const getVisitorTypeStyle = (type) => visitorTypes.find(t => t.value === type)?.color || 'bg-slate-100 text-slate-700';

  const filteredVisitors = visitors.filter(v => {
    const matchesSearch = v.visitor_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         v.host_name?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesBuilding = !selectedBuildingId || v.building_id === selectedBuildingId;
    const matchesType = filterType === 'all' || v.visitor_type === filterType;
    return matchesSearch && matchesBuilding && matchesType;
  });

  const activeVisitors = visitors.filter(v => !v.check_out_time).length;

  if (isLoading) {
    return <Skeleton className="h-96 rounded-xl" />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-600">
          <span className="font-semibold text-green-600">{activeVisitors}</span> currently on-site
        </p>
        <Button onClick={() => setShowDialog(true)} className="bg-blue-600 hover:bg-blue-700">
          <LogIn className="h-4 w-4 mr-2" />
          Check In Visitor
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search visitors..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="All Types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {visitorTypes.map(t => (
              <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {filteredVisitors.length === 0 ? (
        <EmptyState
          icon={DoorOpen}
          title="No visitor logs"
          description="Check in visitors to track access to your buildings"
          action={() => setShowDialog(true)}
          actionLabel="Check In Visitor"
        />
      ) : (
        <Card className="border-0 shadow-sm overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50">
                <TableHead>Visitor</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Building / Unit</TableHead>
                <TableHead>Host</TableHead>
                <TableHead>Check In</TableHead>
                <TableHead>Check Out</TableHead>
                <TableHead className="w-24">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredVisitors.map((visitor) => (
                <TableRow key={visitor.id} className="hover:bg-slate-50/50">
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-slate-100 rounded-lg">
                        <User className="h-4 w-4 text-slate-600" />
                      </div>
                      <div>
                        <p className="font-medium text-slate-900">{visitor.visitor_name}</p>
                        {visitor.visitor_phone && (
                          <p className="text-xs text-slate-500 flex items-center gap-1">
                            <Phone className="h-3 w-3" /> {visitor.visitor_phone}
                          </p>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getVisitorTypeStyle(visitor.visitor_type)}`}>
                      {visitor.visitor_type}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="text-sm text-slate-900">{getBuildingName(visitor.building_id)}</p>
                      {visitor.unit_number && <p className="text-xs text-slate-500">Unit {visitor.unit_number}</p>}
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="text-slate-600">{visitor.host_name || '-'}</span>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5 text-sm text-slate-600">
                      <LogIn className="h-3.5 w-3.5 text-emerald-500" />
                      {visitor.check_in_time && format(new Date(visitor.check_in_time), 'MMM d, h:mm a')}
                    </div>
                  </TableCell>
                  <TableCell>
                    {visitor.check_out_time ? (
                      <div className="flex items-center gap-1.5 text-sm text-slate-600">
                        <LogOut className="h-3.5 w-3.5 text-slate-400" />
                        {format(new Date(visitor.check_out_time), 'h:mm a')}
                      </div>
                    ) : (
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="h-7 text-xs"
                        onClick={() => handleCheckOut(visitor)}
                      >
                        <LogOut className="h-3 w-3 mr-1" /> Check Out
                      </Button>
                    )}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setDeleteVisitor(visitor)} className="text-red-600">
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

      {/* Check In Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Check In Visitor</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="building_id">Building *</Label>
              <Select value={formData.building_id} onValueChange={(v) => setFormData({ ...formData, building_id: v, unit_id: '' })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select building" />
                </SelectTrigger>
                <SelectContent>
                  {buildings.map(b => (
                    <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="unit_number">Unit Number</Label>
              <Input
                id="unit_number"
                value={formData.unit_number}
                onChange={(e) => setFormData({ ...formData, unit_number: e.target.value })}
                placeholder="e.g., 101"
              />
            </div>
            <div>
              <Label htmlFor="visitor_name">Visitor Name *</Label>
              <Input
                id="visitor_name"
                value={formData.visitor_name}
                onChange={(e) => setFormData({ ...formData, visitor_name: e.target.value })}
                required
              />
            </div>
            <div>
              <Label htmlFor="visitor_phone">Phone</Label>
              <Input
                id="visitor_phone"
                value={formData.visitor_phone}
                onChange={(e) => setFormData({ ...formData, visitor_phone: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="visitor_type">Visitor Type *</Label>
              <Select value={formData.visitor_type} onValueChange={(v) => setFormData({ ...formData, visitor_type: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {visitorTypes.map(t => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="host_name">Host Name</Label>
              <Input
                id="host_name"
                value={formData.host_name}
                onChange={(e) => setFormData({ ...formData, host_name: e.target.value })}
                placeholder="Resident being visited"
              />
            </div>
            <div>
              <Label htmlFor="purpose">Purpose of Visit</Label>
              <Input
                id="purpose"
                value={formData.purpose}
                onChange={(e) => setFormData({ ...formData, purpose: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="vehicle_plate">Vehicle Plate</Label>
              <Input
                id="vehicle_plate"
                value={formData.vehicle_plate}
                onChange={(e) => setFormData({ ...formData, vehicle_plate: e.target.value })}
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Switch
                  id="id_verified"
                  checked={formData.id_verified}
                  onCheckedChange={(v) => setFormData({ ...formData, id_verified: v })}
                />
                <Label htmlFor="id_verified">ID Verified</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  id="pre_authorized"
                  checked={formData.pre_authorized}
                  onCheckedChange={(v) => setFormData({ ...formData, pre_authorized: v })}
                />
                <Label htmlFor="pre_authorized">Pre-Authorized</Label>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleCloseDialog}>Cancel</Button>
              <Button type="submit" className="bg-blue-600 hover:bg-blue-700" disabled={createMutation.isPending}>
                {createMutation.isPending ? 'Checking In...' : 'Check In'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteVisitor} onOpenChange={() => setDeleteVisitor(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Visitor Log</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this visitor record?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteMutation.mutate(deleteVisitor.id)} className="bg-red-600 hover:bg-red-700">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}