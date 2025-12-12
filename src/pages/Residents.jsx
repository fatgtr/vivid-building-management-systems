import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import PageHeader from '@/components/common/PageHeader';
import EmptyState from '@/components/common/EmptyState';
import StatusBadge from '@/components/common/StatusBadge';
import { Link } from 'react-router-dom';
import { createPageUrl } from './utils';
import { Users, Search, Pencil, Trash2, Building2, Home, Phone, Mail, MoreVertical, Calendar, Upload, FileText, X, ExternalLink } from 'lucide-react';
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

const initialFormState = {
  building_id: '',
  unit_id: '',
  first_name: '',
  last_name: '',
  email: '',
  phone: '',
  resident_type: 'tenant',
  move_in_date: '',
  move_out_date: '',
  emergency_contact_name: '',
  emergency_contact_phone: '',
  vehicle_info: '',
  parking_spot: '',
  status: 'active',
  notes: '',
  investor_name: '',
  investor_home_phone: '',
  investor_mobile: '',
  investor_second_phone: '',
  investor_email: '',
  investor_strata_committee_member: false,
  investor_address: '',
  managing_agent_company: '',
  managing_agent_contact_name: '',
  managing_agent_phone: '',
  managing_agent_email: '',
  managing_agent_address: '',
  has_pet: false,
  documents: [],
  hot_water_meter_number: '',
  electrical_meter_number: '',
  gas_meter_number: '',
};

export default function Residents() {
  const [showDialog, setShowDialog] = useState(false);
  const [editingResident, setEditingResident] = useState(null);
  const [formData, setFormData] = useState(initialFormState);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterBuilding, setFilterBuilding] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [deleteResident, setDeleteResident] = useState(null);
  const [uploadingFiles, setUploadingFiles] = useState(false);

  const queryClient = useQueryClient();

  const { data: residents = [], isLoading } = useQuery({
    queryKey: ['residents'],
    queryFn: () => base44.entities.Resident.list(),
  });

  const { data: buildings = [] } = useQuery({
    queryKey: ['buildings'],
    queryFn: () => base44.entities.Building.list(),
  });

  const { data: units = [] } = useQuery({
    queryKey: ['units'],
    queryFn: () => base44.entities.Unit.list(),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Resident.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['residents'] });
      handleCloseDialog();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Resident.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['residents'] });
      handleCloseDialog();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Resident.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['residents'] });
      setDeleteResident(null);
    },
  });

  const handleCloseDialog = () => {
    setShowDialog(false);
    setEditingResident(null);
    setFormData(initialFormState);
  };

  const handleEdit = (resident) => {
    setEditingResident(resident);
    setFormData({
      building_id: resident.building_id || '',
      unit_id: resident.unit_id || '',
      first_name: resident.first_name || '',
      last_name: resident.last_name || '',
      email: resident.email || '',
      phone: resident.phone || '',
      resident_type: resident.resident_type || 'tenant',
      move_in_date: resident.move_in_date || '',
      move_out_date: resident.move_out_date || '',
      emergency_contact_name: resident.emergency_contact_name || '',
      emergency_contact_phone: resident.emergency_contact_phone || '',
      vehicle_info: resident.vehicle_info || '',
      parking_spot: resident.parking_spot || '',
      status: resident.status || 'active',
      notes: resident.notes || '',
      investor_name: resident.investor_name || '',
      investor_home_phone: resident.investor_home_phone || '',
      investor_mobile: resident.investor_mobile || '',
      investor_second_phone: resident.investor_second_phone || '',
      investor_email: resident.investor_email || '',
      investor_strata_committee_member: resident.investor_strata_committee_member || false,
      investor_address: resident.investor_address || '',
      managing_agent_company: resident.managing_agent_company || '',
      managing_agent_contact_name: resident.managing_agent_contact_name || '',
      managing_agent_phone: resident.managing_agent_phone || '',
      managing_agent_email: resident.managing_agent_email || '',
      managing_agent_address: resident.managing_agent_address || '',
      has_pet: resident.has_pet || false,
      documents: resident.documents || [],
      hot_water_meter_number: resident.hot_water_meter_number || '',
      electrical_meter_number: resident.electrical_meter_number || '',
      gas_meter_number: resident.gas_meter_number || '',
    });
    setShowDialog(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (editingResident) {
      updateMutation.mutate({ id: editingResident.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const getBuildingName = (buildingId) => buildings.find(b => b.id === buildingId)?.name || 'Unknown';
  const getUnitNumber = (unitId) => units.find(u => u.id === unitId)?.unit_number || 'Unknown';
  const getFilteredUnits = () => units.filter(u => u.building_id === formData.building_id);

  const handleFileSelect = async (e) => {
    setUploadingFiles(true);
    const files = Array.from(e.target.files);
    const uploadedUrls = [];

    for (const file of files) {
      try {
        const { file_url } = await base44.integrations.Core.UploadFile({ file });
        uploadedUrls.push(file_url);
      } catch (error) {
        console.error("Error uploading file:", error);
      }
    }

    setFormData(prev => ({ ...prev, documents: [...prev.documents, ...uploadedUrls] }));
    setUploadingFiles(false);
  };

  const removeFile = (indexToRemove) => {
    setFormData(prev => ({
      ...prev,
      documents: prev.documents.filter((_, index) => index !== indexToRemove)
    }));
  };

  const filteredResidents = residents.filter(r => {
    const fullName = `${r.first_name} ${r.last_name}`.toLowerCase();
    const matchesSearch = fullName.includes(searchQuery.toLowerCase()) ||
                         r.email?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesBuilding = filterBuilding === 'all' || r.building_id === filterBuilding;
    const matchesStatus = filterStatus === 'all' || r.status === filterStatus;
    return matchesSearch && matchesBuilding && matchesStatus;
  });

  if (isLoading) {
    return (
      <div className="space-y-8">
        <PageHeader title="Residents" subtitle="Manage property residents" />
        <Skeleton className="h-96 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Residents" 
        subtitle={`${residents.filter(r => r.status === 'active').length} active residents`}
        action={() => setShowDialog(true)}
        actionLabel="Add Resident"
      >
        <Link to={createPageUrl('ResidentPortal')}>
          <Button variant="outline">
            <ExternalLink className="h-4 w-4 mr-2" />
            Resident Portal
          </Button>
        </Link>
      </PageHeader>

      {/* Filters */}
      <div className="flex flex-wrap gap-4">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search residents..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={filterBuilding} onValueChange={setFilterBuilding}>
          <SelectTrigger className="w-[200px]">
            <Building2 className="h-4 w-4 mr-2 text-slate-400" />
            <SelectValue placeholder="All Buildings" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Buildings</SelectItem>
            {buildings.map(b => (
              <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="All Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {filteredResidents.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No residents found"
          description="Add residents to your properties to manage them"
          action={() => setShowDialog(true)}
          actionLabel="Add Resident"
        />
      ) : (
        <Card className="border-0 shadow-sm overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50">
                <TableHead>Resident</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Building / Unit</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Move In</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredResidents.map((resident) => (
                <TableRow key={resident.id} className="hover:bg-slate-50/50">
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={resident.avatar_url} />
                        <AvatarFallback className="bg-blue-100 text-blue-600 font-medium">
                          {resident.first_name?.[0]}{resident.last_name?.[0]}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium text-slate-900">{resident.first_name} {resident.last_name}</p>
                        <p className="text-xs text-slate-500 capitalize">{resident.resident_type}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      {resident.email && (
                        <div className="flex items-center gap-1.5 text-sm text-slate-600">
                          <Mail className="h-3.5 w-3.5 text-slate-400" />
                          <span className="truncate max-w-[180px]">{resident.email}</span>
                        </div>
                      )}
                      {resident.phone && (
                        <div className="flex items-center gap-1.5 text-sm text-slate-600">
                          <Phone className="h-3.5 w-3.5 text-slate-400" />
                          {resident.phone}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-0.5">
                      <p className="text-sm text-slate-900">{getBuildingName(resident.building_id)}</p>
                      <p className="text-xs text-slate-500 flex items-center gap-1">
                        <Home className="h-3 w-3" /> Unit {getUnitNumber(resident.unit_id)}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="capitalize text-slate-600">{resident.resident_type?.replace(/_/g, ' ')}</span>
                  </TableCell>
                  <TableCell>
                    {resident.move_in_date ? (
                      <div className="flex items-center gap-1.5 text-sm text-slate-600">
                        <Calendar className="h-3.5 w-3.5 text-slate-400" />
                        {format(new Date(resident.move_in_date), 'MMM d, yyyy')}
                      </div>
                    ) : (
                      <span className="text-slate-400">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={resident.status} />
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleEdit(resident)}>
                          <Pencil className="mr-2 h-4 w-4" /> Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setDeleteResident(resident)} className="text-red-600">
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
            <DialogTitle>{editingResident ? 'Edit Resident' : 'Add New Resident'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                <Label htmlFor="unit_id">Unit *</Label>
                <Select value={formData.unit_id} onValueChange={(v) => setFormData({ ...formData, unit_id: v })} disabled={!formData.building_id}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select unit" />
                  </SelectTrigger>
                  <SelectContent>
                    {getFilteredUnits().map(u => (
                      <SelectItem key={u.id} value={u.id}>Unit {u.unit_number}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="first_name">First Name *</Label>
                <Input
                  id="first_name"
                  value={formData.first_name}
                  onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="last_name">Last Name *</Label>
                <Input
                  id="last_name"
                  value={formData.last_name}
                  onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="resident_type">Resident Type</Label>
                <Select value={formData.resident_type} onValueChange={(v) => setFormData({ ...formData, resident_type: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="owner">Owner</SelectItem>
                    <SelectItem value="tenant">Tenant</SelectItem>
                    <SelectItem value="family_member">Family Member</SelectItem>
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
                    <SelectItem value="pending">Pending</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="move_in_date">Move In Date</Label>
                <Input
                  id="move_in_date"
                  type="date"
                  value={formData.move_in_date}
                  onChange={(e) => setFormData({ ...formData, move_in_date: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="move_out_date">Move Out Date</Label>
                <Input
                  id="move_out_date"
                  type="date"
                  value={formData.move_out_date}
                  onChange={(e) => setFormData({ ...formData, move_out_date: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="parking_spot">Parking Spot</Label>
                <Input
                  id="parking_spot"
                  value={formData.parking_spot}
                  onChange={(e) => setFormData({ ...formData, parking_spot: e.target.value })}
                />
              </div>
              <div className="md:col-span-2">
                <Label htmlFor="vehicle_info">Vehicle Info</Label>
                <Input
                  id="vehicle_info"
                  value={formData.vehicle_info}
                  onChange={(e) => setFormData({ ...formData, vehicle_info: e.target.value })}
                  placeholder="Make, model, plate number"
                />
              </div>
            </div>

            <div className="border-t pt-4">
              <h4 className="font-medium text-slate-900 mb-4">Emergency Contact</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="emergency_contact_name">Name</Label>
                  <Input
                    id="emergency_contact_name"
                    value={formData.emergency_contact_name}
                    onChange={(e) => setFormData({ ...formData, emergency_contact_name: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="emergency_contact_phone">Phone</Label>
                  <Input
                    id="emergency_contact_phone"
                    value={formData.emergency_contact_phone}
                    onChange={(e) => setFormData({ ...formData, emergency_contact_phone: e.target.value })}
                  />
                </div>
              </div>
            </div>

            <div>
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={3}
              />
            </div>

            <div className="border-t pt-4">
              <h4 className="font-medium text-slate-900 mb-4">Other Information</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2 flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="has_pet"
                    checked={formData.has_pet}
                    onChange={(e) => setFormData({ ...formData, has_pet: e.target.checked })}
                    className="rounded"
                  />
                  <Label htmlFor="has_pet" className="cursor-pointer">Has Pet</Label>
                </div>
                <div>
                  <Label htmlFor="hot_water_meter_number">Hot Water Meter Number</Label>
                  <Input
                    id="hot_water_meter_number"
                    value={formData.hot_water_meter_number}
                    onChange={(e) => setFormData({ ...formData, hot_water_meter_number: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="electrical_meter_number">Electrical Meter Number</Label>
                  <Input
                    id="electrical_meter_number"
                    value={formData.electrical_meter_number}
                    onChange={(e) => setFormData({ ...formData, electrical_meter_number: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="gas_meter_number">Gas Meter Number</Label>
                  <Input
                    id="gas_meter_number"
                    value={formData.gas_meter_number}
                    onChange={(e) => setFormData({ ...formData, gas_meter_number: e.target.value })}
                  />
                </div>
              </div>
            </div>

            <div className="border-t pt-4">
              <h4 className="font-medium text-slate-900 mb-4">Documents</h4>
              <div className="space-y-2">
                <Button type="button" variant="outline" className="w-full" asChild disabled={uploadingFiles}>
                  <label>
                    <Upload className="h-4 w-4 mr-2" />
                    {uploadingFiles ? "Uploading..." : "Upload Documents"}
                    <input type="file" multiple className="hidden" onChange={handleFileSelect} />
                  </label>
                </Button>
                {formData.documents.length > 0 && (
                  <div className="space-y-2">
                    {formData.documents.map((docUrl, index) => (
                      <div key={index} className="flex items-center justify-between p-2 bg-slate-50 rounded-md">
                        <a href={docUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-blue-600 hover:underline truncate">
                          <FileText className="h-4 w-4 flex-shrink-0" />
                          <span className="truncate">Document {index + 1}</span>
                        </a>
                        <Button type="button" variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0" onClick={() => removeFile(index)}>
                          <X className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="border-t pt-4">
              <h4 className="font-medium text-slate-900 mb-4">Investor Information</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <Label htmlFor="investor_name">Name</Label>
                  <Input
                    id="investor_name"
                    value={formData.investor_name}
                    onChange={(e) => setFormData({ ...formData, investor_name: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="investor_home_phone">Home Phone</Label>
                  <Input
                    id="investor_home_phone"
                    value={formData.investor_home_phone}
                    onChange={(e) => setFormData({ ...formData, investor_home_phone: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="investor_mobile">Mobile</Label>
                  <Input
                    id="investor_mobile"
                    value={formData.investor_mobile}
                    onChange={(e) => setFormData({ ...formData, investor_mobile: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="investor_second_phone">Second Phone</Label>
                  <Input
                    id="investor_second_phone"
                    value={formData.investor_second_phone}
                    onChange={(e) => setFormData({ ...formData, investor_second_phone: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="investor_email">Email</Label>
                  <Input
                    id="investor_email"
                    type="email"
                    value={formData.investor_email}
                    onChange={(e) => setFormData({ ...formData, investor_email: e.target.value })}
                  />
                </div>
                <div className="md:col-span-2">
                  <Label htmlFor="investor_address">Address</Label>
                  <Textarea
                    id="investor_address"
                    value={formData.investor_address}
                    onChange={(e) => setFormData({ ...formData, investor_address: e.target.value })}
                    rows={2}
                  />
                </div>
                <div className="md:col-span-2 flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="strata_committee"
                    checked={formData.investor_strata_committee_member}
                    onChange={(e) => setFormData({ ...formData, investor_strata_committee_member: e.target.checked })}
                    className="rounded"
                  />
                  <Label htmlFor="strata_committee" className="cursor-pointer">Strata Committee Member</Label>
                </div>
              </div>
            </div>

            <div className="border-t pt-4">
              <h4 className="font-medium text-slate-900 mb-4">Managing Agent</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <Label htmlFor="managing_agent_company">Company</Label>
                  <Input
                    id="managing_agent_company"
                    value={formData.managing_agent_company}
                    onChange={(e) => setFormData({ ...formData, managing_agent_company: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="managing_agent_contact_name">Contact Name</Label>
                  <Input
                    id="managing_agent_contact_name"
                    value={formData.managing_agent_contact_name}
                    onChange={(e) => setFormData({ ...formData, managing_agent_contact_name: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="managing_agent_phone">Phone</Label>
                  <Input
                    id="managing_agent_phone"
                    value={formData.managing_agent_phone}
                    onChange={(e) => setFormData({ ...formData, managing_agent_phone: e.target.value })}
                  />
                </div>
                <div className="md:col-span-2">
                  <Label htmlFor="managing_agent_email">Email</Label>
                  <Input
                    id="managing_agent_email"
                    type="email"
                    value={formData.managing_agent_email}
                    onChange={(e) => setFormData({ ...formData, managing_agent_email: e.target.value })}
                  />
                </div>
                <div className="md:col-span-2">
                  <Label htmlFor="managing_agent_address">Address</Label>
                  <Textarea
                    id="managing_agent_address"
                    value={formData.managing_agent_address}
                    onChange={(e) => setFormData({ ...formData, managing_agent_address: e.target.value })}
                    rows={2}
                  />
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleCloseDialog}>Cancel</Button>
              <Button type="submit" className="bg-blue-600 hover:bg-blue-700" disabled={createMutation.isPending || updateMutation.isPending}>
                {createMutation.isPending || updateMutation.isPending ? 'Saving...' : (editingResident ? 'Update' : 'Create')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteResident} onOpenChange={() => setDeleteResident(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Resident</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deleteResident?.first_name} {deleteResident?.last_name}"?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteMutation.mutate(deleteResident.id)} className="bg-red-600 hover:bg-red-700">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}