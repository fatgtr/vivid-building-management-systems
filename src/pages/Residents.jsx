import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from "@/components/ui/card";
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
import { createPageUrl } from '@/utils';
import { Users, Search, Pencil, Trash2, Building2, Home, Phone, Mail, MoreVertical, Calendar, Upload, FileText, X, ExternalLink, Send, User, Plus, Bed, Bath, Square, Edit, MapPin, BriefcaseBusiness, UserPlus } from 'lucide-react';
import { toast } from 'sonner';
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
  const [filterFloor, setFilterFloor] = useState('all');
  const [deleteResident, setDeleteResident] = useState(null);
  const [uploadingFiles, setUploadingFiles] = useState(false);
  const [user, setUser] = useState(null);
  const [showUnitDialog, setShowUnitDialog] = useState(false);
  const [editingUnit, setEditingUnit] = useState(null);
  const [unitFormData, setUnitFormData] = useState({
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
  });
  const [deleteUnit, setDeleteUnit] = useState(null);
  const [viewUnitsForBuilding, setViewUnitsForBuilding] = useState(null);
  const [activeTab, setActiveTab] = useState('residents');
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [inviteFormData, setInviteFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    building_id: '',
    unit_id: '',
  });

  const queryClient = useQueryClient();

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

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

  const sendInviteMutation = useMutation({
    mutationFn: async (residentId) => {
      const { data } = await base44.functions.invoke('sendManagingAgentInvite', { residentId });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['residents'] });
    },
  });

  const createUnitMutation = useMutation({
    mutationFn: (data) => base44.entities.Unit.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['units'] });
      handleCloseUnitDialog();
      toast.success('Unit created successfully');
    },
  });

  const updateUnitMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Unit.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['units'] });
      handleCloseUnitDialog();
      toast.success('Unit updated successfully');
    },
  });

  const deleteUnitMutation = useMutation({
    mutationFn: (id) => base44.entities.Unit.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['units'] });
      setDeleteUnit(null);
      toast.success('Unit deleted successfully');
    },
  });

  const inviteManagingAgentMutation = useMutation({
    mutationFn: async (data) => {
      // Create a resident record for the managing agent
      const newResident = await base44.entities.Resident.create({
        building_id: data.building_id,
        unit_id: data.unit_id,
        first_name: data.first_name,
        last_name: data.last_name,
        email: data.email,
        resident_type: 'tenant',
        status: 'pending',
        managing_agent_email: data.email,
        managing_agent_contact_name: `${data.first_name} ${data.last_name}`,
      });
      // Send portal invite
      await base44.functions.invoke('sendManagingAgentInvite', { residentId: newResident.id });
      return newResident;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['residents'] });
      toast.success('Managing agent invited successfully!');
      setShowInviteDialog(false);
      setInviteFormData({
        first_name: '',
        last_name: '',
        email: '',
        building_id: '',
        unit_id: '',
      });
    },
    onError: (error) => {
      toast.error('Failed to invite managing agent: ' + error.message);
    },
  });

  const handleCloseDialog = () => {
    setShowDialog(false);
    setEditingResident(null);
    setFormData(initialFormState);
  };

  const handleCloseUnitDialog = () => {
    setShowUnitDialog(false);
    setEditingUnit(null);
    setUnitFormData({
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
    });
  };

  const handleEditUnit = (unit) => {
    setEditingUnit(unit);
    setUnitFormData({
      building_id: unit.building_id || '',
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
    setShowUnitDialog(true);
  };

  const handleUnitSubmit = (e) => {
    e.preventDefault();
    const data = {
      ...unitFormData,
      floor: unitFormData.floor ? Number(unitFormData.floor) : null,
      bedrooms: unitFormData.bedrooms ? Number(unitFormData.bedrooms) : null,
      bathrooms: unitFormData.bathrooms ? Number(unitFormData.bathrooms) : null,
      square_feet: unitFormData.square_feet ? Number(unitFormData.square_feet) : null,
      monthly_rent: unitFormData.monthly_rent ? Number(unitFormData.monthly_rent) : null,
    };

    if (editingUnit) {
      updateUnitMutation.mutate({ id: editingUnit.id, data });
    } else {
      createUnitMutation.mutate(data);
    }
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
        title="Residents & Units" 
        subtitle={`${residents.filter(r => r.status === 'active').length} active residents • ${units.length} units`}
      >
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button className="bg-blue-600 hover:bg-blue-700">
              <Plus className="h-4 w-4 mr-2" />
              Add New
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setShowDialog(true)}>
              <UserPlus className="mr-2 h-4 w-4" /> Add Resident
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setShowUnitDialog(true)}>
              <Home className="mr-2 h-4 w-4" /> Add Unit
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setShowInviteDialog(true)}>
              <BriefcaseBusiness className="mr-2 h-4 w-4" /> Invite Managing Agent
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <Link to={createPageUrl('ResidentPortal')}>
          <Button variant="outline">
            <ExternalLink className="h-4 w-4 mr-2" />
            Resident Portal
          </Button>
        </Link>
      </PageHeader>

      {/* Tabs */}
      <div className="border-b border-slate-200 mb-6">
        <div className="flex gap-6">
          <button
            onClick={() => setActiveTab('residents')}
            className={`pb-3 px-1 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'residents'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            Residents
          </button>
          <button
            onClick={() => setActiveTab('units')}
            className={`pb-3 px-1 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'units'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            Units
          </button>
          <button
            onClick={() => setActiveTab('managing-agents')}
            className={`pb-3 px-1 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'managing-agents'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            Managing Agents
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder={activeTab === 'residents' ? "Search residents..." : "Search units..."}
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
        {activeTab === 'units' && (
          <Select value={filterFloor} onValueChange={setFilterFloor}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="All Floors" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Floors</SelectItem>
              {Array.from(new Set(units.map(u => u.floor).filter(f => f != null)))
                .sort((a, b) => a - b)
                .map(floor => (
                  <SelectItem key={floor} value={String(floor)}>Floor {floor}</SelectItem>
                ))}
            </SelectContent>
          </Select>
        )}
        {activeTab === 'residents' && (
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
        )}
      </div>

      {activeTab === 'residents' ? (
        filteredResidents.length === 0 ? (
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
                  <TableHead>Building</TableHead>
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
                        <div className="space-y-1">
                          <p className="font-medium text-slate-900">{resident.first_name} {resident.last_name}</p>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-slate-500 capitalize">{resident.resident_type}</span>
                            <span className="h-3 w-px bg-slate-200" />
                            <StatusBadge status={resident.status} />
                          </div>
                          {(() => {
                            const unit = units.find(u => u.id === resident.unit_id);
                            if (!unit) return null;
                            return (
                              <div className="space-y-0.5 pt-1">
                                <div className="flex items-center gap-1.5 text-xs text-slate-600">
                                  <Home className="h-3 w-3 text-blue-600" />
                                  <span>Unit {unit.unit_number}</span>
                                  {unit.lot_number && <span className="text-slate-400">(Lot {unit.lot_number})</span>}
                                </div>
                                <div className="flex items-center gap-2 text-xs text-slate-500">
                                  {unit.bedrooms && (
                                    <span className="flex items-center gap-1">
                                      <Bed className="h-3 w-3" /> {unit.bedrooms}
                                    </span>
                                  )}
                                  {unit.bathrooms && (
                                    <span className="flex items-center gap-1">
                                      <Bath className="h-3 w-3" /> {unit.bathrooms}
                                    </span>
                                  )}
                                  {unit.square_feet && (
                                    <span className="flex items-center gap-1">
                                      <Square className="h-3 w-3" /> {unit.square_feet} sqft
                                    </span>
                                  )}
                                </div>
                              </div>
                            );
                          })()}
                          {resident.move_in_date && (
                            <div className="flex items-center gap-1.5 text-xs text-slate-500 pt-0.5">
                              <Calendar className="h-3 w-3" />
                              Move in: {format(new Date(resident.move_in_date), 'MMM d, yyyy')}
                            </div>
                          )}
                          {resident.move_out_date && (
                            <div className="flex items-center gap-1.5 text-xs text-slate-500">
                              <Calendar className="h-3 w-3" />
                              Move out: {format(new Date(resident.move_out_date), 'MMM d, yyyy')}
                            </div>
                          )}
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
                      </div>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem asChild>
                            <Link to={createPageUrl(`ResidentProfile?id=${resident.id}`)}>
                              <User className="mr-2 h-4 w-4" /> View Profile
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleEdit(resident)}>
                            <Pencil className="mr-2 h-4 w-4" /> Quick Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            <Link to={createPageUrl(`ResidentPortal?residentId=${resident.id}`)}>
                              <ExternalLink className="mr-2 h-4 w-4" /> View Portal
                            </Link>
                          </DropdownMenuItem>
                          {resident.managing_agent_email && (
                            <>
                              <DropdownMenuItem asChild>
                                <Link to={createPageUrl('ManagingAgentPortal')}>
                                  <BriefcaseBusiness className="mr-2 h-4 w-4" /> View Managing Agent Portal
                                </Link>
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => sendInviteMutation.mutate(resident.id)}>
                                <Send className="mr-2 h-4 w-4" /> Send Portal Invite
                              </DropdownMenuItem>
                            </>
                          )}
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
        )
      ) : activeTab === 'units' ? (
        units.length === 0 ? (
          <EmptyState
            icon={Home}
            title="No units found"
            description="Add units to your buildings to manage them"
            action={() => setShowUnitDialog(true)}
            actionLabel="Add Unit"
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {units
              .filter(u => {
                const buildingMatch = filterBuilding === 'all' || u.building_id === filterBuilding;
                const floorMatch = filterFloor === 'all' || String(u.floor) === filterFloor;
                const searchMatch = !searchQuery || 
                  u.unit_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                  u.lot_number?.toLowerCase().includes(searchQuery.toLowerCase());
                return buildingMatch && floorMatch && searchMatch;
              })
              .map((unit) => {
                const unitResidents = residents.filter(r => r.unit_id === unit.id && r.status === 'active');
                const building = buildings.find(b => b.id === unit.building_id);
                return (
                  <Card 
                    key={unit.id} 
                    className="border-0 shadow-sm hover:shadow-md transition-all overflow-hidden group"
                  >
                    <div className={`h-2 ${unit.status === 'occupied' ? 'bg-green-500' : unit.status === 'maintenance' ? 'bg-orange-500' : 'bg-blue-500'}`} />
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="text-lg font-bold text-slate-900">{unit.unit_number}</h3>
                            {building && (
                              <span className="text-xs text-slate-500">• {building.name}</span>
                            )}
                          </div>
                          {unit.lot_number && (
                            <p className="text-xs text-slate-500">Lot {unit.lot_number}</p>
                          )}
                          {unit.floor != null && (
                            <p className="text-xs text-slate-500">Floor {unit.floor}</p>
                          )}
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleEditUnit(unit)}>
                              <Pencil className="mr-2 h-4 w-4" /> Edit Unit
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setDeleteUnit(unit)} className="text-red-600">
                              <Trash2 className="mr-2 h-4 w-4" /> Delete Unit
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                      
                      <div className="space-y-2 mb-3">
                        <div className="flex items-center gap-3 text-xs text-slate-500">
                          {unit.bedrooms && (
                            <span className="flex items-center gap-1">
                              <Bed className="h-3.5 w-3.5" /> {unit.bedrooms} bed
                            </span>
                          )}
                          {unit.bathrooms && (
                            <span className="flex items-center gap-1">
                              <Bath className="h-3.5 w-3.5" /> {unit.bathrooms} bath
                            </span>
                          )}
                        </div>
                        {unit.square_feet && (
                          <div className="flex items-center gap-1.5 text-xs text-slate-500">
                            <Square className="h-3.5 w-3.5" /> {unit.square_feet} sqft
                          </div>
                        )}
                      </div>

                      <div className="pt-3 border-t border-slate-100">
                        {unitResidents.length > 0 ? (
                          <div className="space-y-2">
                            {unitResidents.map((resident) => (
                              <div key={resident.id} className="flex items-center gap-2">
                                <Avatar className="h-6 w-6">
                                  <AvatarImage src={resident.avatar_url} />
                                  <AvatarFallback className="bg-blue-100 text-blue-600 text-xs">
                                    {resident.first_name?.[0]}{resident.last_name?.[0]}
                                  </AvatarFallback>
                                </Avatar>
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs font-medium text-slate-900 truncate">
                                    {resident.first_name} {resident.last_name}
                                  </p>
                                  <p className="text-xs text-slate-500 capitalize">{resident.resident_type}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="flex items-center justify-center py-2">
                            <p className="text-xs text-slate-400">No residents</p>
                          </div>
                        )}
                      </div>

                      <div className="mt-3 pt-3 border-t border-slate-100">
                        <StatusBadge status={unit.status} />
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
          </div>
        )
      ) : (
        // Managing Agents Tab
        <Card className="border-0 shadow-sm">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50">
                <TableHead>Managing Agent</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Managed Properties</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {residents
                .filter(r => r.managing_agent_email)
                .reduce((agents, resident) => {
                  const existing = agents.find(a => a.email === resident.managing_agent_email);
                  if (existing) {
                    existing.properties.push(resident);
                  } else {
                    agents.push({
                      email: resident.managing_agent_email,
                      name: resident.managing_agent_contact_name || 'Unknown',
                      phone: resident.managing_agent_phone,
                      company: resident.managing_agent_company,
                      properties: [resident]
                    });
                  }
                  return agents;
                }, [])
                .map((agent, idx) => (
                  <TableRow key={idx}>
                    <TableCell>
                      <div className="space-y-1">
                        <p className="font-medium text-slate-900">{agent.name}</p>
                        {agent.company && (
                          <p className="text-xs text-slate-500">{agent.company}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5 text-sm text-slate-600">
                          <Mail className="h-3.5 w-3.5 text-slate-400" />
                          {agent.email}
                        </div>
                        {agent.phone && (
                          <div className="flex items-center gap-1.5 text-sm text-slate-600">
                            <Phone className="h-3.5 w-3.5 text-slate-400" />
                            {agent.phone}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        {agent.properties.map((prop, pIdx) => (
                          <div key={pIdx} className="text-sm text-slate-600 flex items-center gap-2">
                            <Building2 className="h-3.5 w-3.5 text-slate-400" />
                            {getBuildingName(prop.building_id)}
                            <Home className="h-3.5 w-3.5 text-slate-400 ml-2" />
                            Unit {getUnitNumber(prop.unit_id)}
                          </div>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem asChild>
                            <Link to={createPageUrl('ManagingAgentPortal')}>
                              <ExternalLink className="mr-2 h-4 w-4" /> View Portal
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => sendInviteMutation.mutate(agent.properties[0].id)}>
                            <Send className="mr-2 h-4 w-4" /> Resend Invite
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
          {residents.filter(r => r.managing_agent_email).length === 0 && (
            <div className="text-center py-12">
              <BriefcaseBusiness className="h-12 w-12 text-slate-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-slate-900 mb-2">No Managing Agents</h3>
              <p className="text-slate-500 mb-4">Invite managing agents to access their portal</p>
              <Button onClick={() => setShowInviteDialog(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Invite Managing Agent
              </Button>
            </div>
          )}
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
                    placeholder="Managing agent will receive portal access"
                  />
                  {formData.managing_agent_email && (
                    <p className="text-xs text-slate-500 mt-1">
                      After saving, use "Send Portal Invite" to grant access
                    </p>
                  )}
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

      {/* Unit Add/Edit Dialog */}
      <Dialog open={showUnitDialog} onOpenChange={setShowUnitDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingUnit ? 'Edit Unit' : 'Add New Unit'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleUnitSubmit} className="space-y-6">
            <Card className="border-2 border-blue-100 bg-blue-50/50">
              <CardContent className="pt-4">
                <Label htmlFor="unit_building_id" className="text-base font-semibold mb-2 block">Building *</Label>
                <Select value={unitFormData.building_id} onValueChange={(v) => setUnitFormData({ ...unitFormData, building_id: v })} required>
                  <SelectTrigger className="bg-white h-11">
                    <Building2 className="h-4 w-4 mr-2 text-blue-600" />
                    <SelectValue placeholder="Select the building for this unit" />
                  </SelectTrigger>
                  <SelectContent>
                    {buildings.map(b => (
                      <SelectItem key={b.id} value={b.id}>
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4 text-blue-600" />
                          {b.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-slate-600 mt-2">Select which building this unit belongs to</p>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="unit_number">Unit Number *</Label>
                <Input
                  id="unit_number"
                  value={unitFormData.unit_number}
                  onChange={(e) => setUnitFormData({ ...unitFormData, unit_number: e.target.value })}
                  placeholder="e.g., 101, A1"
                  required
                />
              </div>
              <div>
                <Label htmlFor="lot_number">Lot Number</Label>
                <Input
                  id="lot_number"
                  value={unitFormData.lot_number}
                  onChange={(e) => setUnitFormData({ ...unitFormData, lot_number: e.target.value })}
                  placeholder="e.g., PT 58"
                />
              </div>
              <div>
                <Label htmlFor="unit_floor">Floor</Label>
                <Input
                  id="unit_floor"
                  type="number"
                  value={unitFormData.floor}
                  onChange={(e) => setUnitFormData({ ...unitFormData, floor: e.target.value })}
                  placeholder="Floor number"
                />
              </div>
              <div>
                <Label htmlFor="unit_type">Unit Type</Label>
                <Select value={unitFormData.unit_type} onValueChange={(v) => setUnitFormData({ ...unitFormData, unit_type: v })}>
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
                <Label htmlFor="unit_status">Status</Label>
                <Select value={unitFormData.status} onValueChange={(v) => setUnitFormData({ ...unitFormData, status: v })}>
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
                <Label htmlFor="unit_bedrooms">Bedrooms</Label>
                <Input
                  id="unit_bedrooms"
                  type="number"
                  value={unitFormData.bedrooms}
                  onChange={(e) => setUnitFormData({ ...unitFormData, bedrooms: e.target.value })}
                  placeholder="0"
                />
              </div>
              <div>
                <Label htmlFor="unit_bathrooms">Bathrooms</Label>
                <Input
                  id="unit_bathrooms"
                  type="number"
                  step="0.5"
                  value={unitFormData.bathrooms}
                  onChange={(e) => setUnitFormData({ ...unitFormData, bathrooms: e.target.value })}
                  placeholder="0"
                />
              </div>
              <div>
                <Label htmlFor="unit_square_feet">Square Feet</Label>
                <Input
                  id="unit_square_feet"
                  type="number"
                  value={unitFormData.square_feet}
                  onChange={(e) => setUnitFormData({ ...unitFormData, square_feet: e.target.value })}
                  placeholder="Area in sq ft"
                />
              </div>
              <div>
                <Label htmlFor="unit_monthly_rent">Monthly Rent</Label>
                <Input
                  id="unit_monthly_rent"
                  type="number"
                  value={unitFormData.monthly_rent}
                  onChange={(e) => setUnitFormData({ ...unitFormData, monthly_rent: e.target.value })}
                  placeholder="0.00"
                />
              </div>
            </div>

            <div className="border-t pt-4">
              <h4 className="font-medium text-slate-900 mb-4">Owner Information</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="unit_owner_name">Name</Label>
                  <Input
                    id="unit_owner_name"
                    value={unitFormData.owner_name}
                    onChange={(e) => setUnitFormData({ ...unitFormData, owner_name: e.target.value })}
                    placeholder="Owner name"
                  />
                </div>
                <div>
                  <Label htmlFor="unit_owner_email">Email</Label>
                  <Input
                    id="unit_owner_email"
                    type="email"
                    value={unitFormData.owner_email}
                    onChange={(e) => setUnitFormData({ ...unitFormData, owner_email: e.target.value })}
                    placeholder="Email"
                  />
                </div>
                <div>
                  <Label htmlFor="unit_owner_phone">Phone</Label>
                  <Input
                    id="unit_owner_phone"
                    value={unitFormData.owner_phone}
                    onChange={(e) => setUnitFormData({ ...unitFormData, owner_phone: e.target.value })}
                    placeholder="Phone"
                  />
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleCloseUnitDialog}>Cancel</Button>
              <Button type="submit" className="bg-blue-600 hover:bg-blue-700" disabled={createUnitMutation.isPending || updateUnitMutation.isPending}>
                {createUnitMutation.isPending || updateUnitMutation.isPending ? 'Saving...' : (editingUnit ? 'Update' : 'Create')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Units List Dialog */}
      <Dialog open={!!viewUnitsForBuilding} onOpenChange={() => setViewUnitsForBuilding(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {viewUnitsForBuilding && getBuildingName(viewUnitsForBuilding)} - Units
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex justify-end">
              <Button onClick={() => {
                setUnitFormData({ ...unitFormData, building_id: viewUnitsForBuilding });
                setShowUnitDialog(true);
              }} size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add Unit
              </Button>
            </div>
            <Card className="border-0 shadow-sm">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50">
                    <TableHead>Unit</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Details</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {units.filter(u => u.building_id === viewUnitsForBuilding).map((unit) => (
                    <TableRow key={unit.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-blue-50 rounded-lg">
                            <Home className="h-4 w-4 text-blue-600" />
                          </div>
                          <div>
                            <p className="font-medium text-slate-900">{unit.unit_number}</p>
                            {unit.lot_number && <p className="text-xs text-slate-500">Lot {unit.lot_number}</p>}
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
                            <DropdownMenuItem onClick={() => handleEditUnit(unit)}>
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
          </div>
        </DialogContent>
      </Dialog>

      {/* Invite Managing Agent Dialog */}
      <Dialog open={showInviteDialog} onOpenChange={setShowInviteDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Invite Managing Agent</DialogTitle>
          </DialogHeader>
          <form onSubmit={(e) => {
            e.preventDefault();
            inviteManagingAgentMutation.mutate(inviteFormData);
          }} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="invite_first_name">First Name *</Label>
                <Input
                  id="invite_first_name"
                  value={inviteFormData.first_name}
                  onChange={(e) => setInviteFormData({ ...inviteFormData, first_name: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="invite_last_name">Last Name *</Label>
                <Input
                  id="invite_last_name"
                  value={inviteFormData.last_name}
                  onChange={(e) => setInviteFormData({ ...inviteFormData, last_name: e.target.value })}
                  required
                />
              </div>
            </div>
            <div>
              <Label htmlFor="invite_email">Email *</Label>
              <Input
                id="invite_email"
                type="email"
                value={inviteFormData.email}
                onChange={(e) => setInviteFormData({ ...inviteFormData, email: e.target.value })}
                placeholder="agent@example.com"
                required
              />
            </div>
            <div>
              <Label htmlFor="invite_building">Building *</Label>
              <Select 
                value={inviteFormData.building_id} 
                onValueChange={(v) => setInviteFormData({ ...inviteFormData, building_id: v, unit_id: '' })}
              >
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
              <Label htmlFor="invite_unit">Unit *</Label>
              <Select 
                value={inviteFormData.unit_id} 
                onValueChange={(v) => setInviteFormData({ ...inviteFormData, unit_id: v })}
                disabled={!inviteFormData.building_id}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select unit" />
                </SelectTrigger>
                <SelectContent>
                  {units
                    .filter(u => u.building_id === inviteFormData.building_id)
                    .map(u => (
                      <SelectItem key={u.id} value={u.id}>Unit {u.unit_number}</SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowInviteDialog(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={inviteManagingAgentMutation.isPending}>
                {inviteManagingAgentMutation.isPending ? 'Sending...' : 'Send Invite'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Unit Confirmation */}
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
            <AlertDialogAction onClick={() => deleteUnitMutation.mutate(deleteUnit.id)} className="bg-red-600 hover:bg-red-700">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}