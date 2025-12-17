import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import StatusBadge from '@/components/common/StatusBadge';
import { ArrowLeft, Pencil, Mail, Phone, Home, Building2, Calendar, Car, FileText, User, Users, Briefcase, Upload, X, Send } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { format } from 'date-fns';
import { toast } from 'sonner';

export default function ResidentProfile() {
  const urlParams = new URLSearchParams(window.location.search);
  const residentId = urlParams.get('id');
  
  const [editingSection, setEditingSection] = useState(null);
  const [formData, setFormData] = useState({});
  const [uploadingFiles, setUploadingFiles] = useState(false);

  const queryClient = useQueryClient();

  const { data: resident, isLoading } = useQuery({
    queryKey: ['resident', residentId],
    queryFn: async () => {
      const residents = await base44.entities.Resident.list();
      return residents.find(r => r.id === residentId);
    },
    enabled: !!residentId,
  });

  const { data: buildings = [] } = useQuery({
    queryKey: ['buildings'],
    queryFn: () => base44.entities.Building.list(),
  });

  const { data: units = [] } = useQuery({
    queryKey: ['units'],
    queryFn: () => base44.entities.Unit.list(),
  });

  const updateMutation = useMutation({
    mutationFn: (data) => base44.entities.Resident.update(residentId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resident', residentId] });
      setEditingSection(null);
      toast.success('Updated successfully');
    },
  });

  const sendInviteMutation = useMutation({
    mutationFn: async () => {
      const { data } = await base44.functions.invoke('sendManagingAgentInvite', { residentId });
      return data;
    },
    onSuccess: () => {
      toast.success('Invite sent successfully');
    },
  });

  const handleEdit = (section) => {
    setEditingSection(section);
    setFormData(resident);
  };

  const handleSave = () => {
    updateMutation.mutate(formData);
  };

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

    setFormData(prev => ({ ...prev, documents: [...(prev.documents || []), ...uploadedUrls] }));
    setUploadingFiles(false);
  };

  const removeFile = (indexToRemove) => {
    setFormData(prev => ({
      ...prev,
      documents: prev.documents.filter((_, index) => index !== indexToRemove)
    }));
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-32 rounded-xl" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-64 rounded-xl" />
          <Skeleton className="h-64 rounded-xl" />
        </div>
      </div>
    );
  }

  if (!resident) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <User className="h-16 w-16 text-slate-300 mb-4" />
        <h2 className="text-xl font-semibold text-slate-900 mb-2">Resident not found</h2>
        <Link to={createPageUrl('Residents')}>
          <Button variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Residents
          </Button>
        </Link>
      </div>
    );
  }

  const unit = units.find(u => u.id === resident.unit_id);
  const building = buildings.find(b => b.id === resident.building_id);

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link to={createPageUrl('Residents')}>
          <Button variant="outline" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-slate-900">Resident Profile</h1>
          <p className="text-slate-500 text-sm">View and manage resident information</p>
        </div>
        <Link to={createPageUrl(`ResidentPortal?residentId=${resident.id}`)}>
          <Button variant="outline">View Portal</Button>
        </Link>
      </div>

      {/* Profile Header Card */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-6">
          <div className="flex items-start gap-6">
            <Avatar className="h-24 w-24">
              <AvatarImage src={resident.avatar_url} />
              <AvatarFallback className="bg-blue-100 text-blue-600 text-2xl font-medium">
                {resident.first_name?.[0]}{resident.last_name?.[0]}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h2 className="text-2xl font-bold text-slate-900">
                  {resident.first_name} {resident.last_name}
                </h2>
                <StatusBadge status={resident.status} />
                <span className="px-2.5 py-1 bg-slate-100 text-slate-700 text-xs font-medium rounded-md capitalize">
                  {resident.resident_type?.replace(/_/g, ' ')}
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
                {resident.email && (
                  <div className="flex items-center gap-2 text-slate-600">
                    <Mail className="h-4 w-4 text-slate-400" />
                    <span className="text-sm">{resident.email}</span>
                  </div>
                )}
                {resident.phone && (
                  <div className="flex items-center gap-2 text-slate-600">
                    <Phone className="h-4 w-4 text-slate-400" />
                    <span className="text-sm">{resident.phone}</span>
                  </div>
                )}
                {building && (
                  <div className="flex items-center gap-2 text-slate-600">
                    <Building2 className="h-4 w-4 text-slate-400" />
                    <span className="text-sm">{building.name}</span>
                  </div>
                )}
                {unit && (
                  <div className="flex items-center gap-2 text-slate-600">
                    <Home className="h-4 w-4 text-slate-400" />
                    <span className="text-sm">Unit {unit.unit_number}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Personal Information */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-lg">Personal Information</CardTitle>
            <Button variant="ghost" size="icon" onClick={() => handleEdit('personal')}>
              <Pencil className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label className="text-xs text-slate-500">Move-in Date</Label>
              <p className="text-sm font-medium text-slate-900">
                {resident.move_in_date ? format(new Date(resident.move_in_date), 'MMM d, yyyy') : 'Not set'}
              </p>
            </div>
            {resident.move_out_date && (
              <div>
                <Label className="text-xs text-slate-500">Move-out Date</Label>
                <p className="text-sm font-medium text-slate-900">
                  {format(new Date(resident.move_out_date), 'MMM d, yyyy')}
                </p>
              </div>
            )}
            <div>
              <Label className="text-xs text-slate-500">Parking Spot</Label>
              <p className="text-sm font-medium text-slate-900">{resident.parking_spot || 'Not assigned'}</p>
            </div>
            <div>
              <Label className="text-xs text-slate-500">Has Pet</Label>
              <p className="text-sm font-medium text-slate-900">{resident.has_pet ? 'Yes' : 'No'}</p>
            </div>
          </CardContent>
        </Card>

        {/* Emergency Contact */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-lg">Emergency Contact</CardTitle>
            <Button variant="ghost" size="icon" onClick={() => handleEdit('emergency')}>
              <Pencil className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label className="text-xs text-slate-500">Name</Label>
              <p className="text-sm font-medium text-slate-900">{resident.emergency_contact_name || 'Not set'}</p>
            </div>
            <div>
              <Label className="text-xs text-slate-500">Phone</Label>
              <p className="text-sm font-medium text-slate-900">{resident.emergency_contact_phone || 'Not set'}</p>
            </div>
          </CardContent>
        </Card>

        {/* Vehicle Information */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Car className="h-5 w-5 text-blue-600" />
              Vehicle Information
            </CardTitle>
            <Button variant="ghost" size="icon" onClick={() => handleEdit('vehicle')}>
              <Pencil className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-slate-700">{resident.vehicle_info || 'No vehicle information'}</p>
          </CardContent>
        </Card>

        {/* Meter Numbers */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-lg">Meter Numbers</CardTitle>
            <Button variant="ghost" size="icon" onClick={() => handleEdit('meters')}>
              <Pencil className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label className="text-xs text-slate-500">Hot Water</Label>
              <p className="text-sm font-medium text-slate-900">{resident.hot_water_meter_number || 'Not set'}</p>
            </div>
            <div>
              <Label className="text-xs text-slate-500">Electrical</Label>
              <p className="text-sm font-medium text-slate-900">{resident.electrical_meter_number || 'Not set'}</p>
            </div>
            <div>
              <Label className="text-xs text-slate-500">Gas</Label>
              <p className="text-sm font-medium text-slate-900">{resident.gas_meter_number || 'Not set'}</p>
            </div>
          </CardContent>
        </Card>

        {/* Investor Information */}
        <Card className="border-0 shadow-sm lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Briefcase className="h-5 w-5 text-blue-600" />
              Investor Information
            </CardTitle>
            <Button variant="ghost" size="icon" onClick={() => handleEdit('investor')}>
              <Pencil className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent>
            {resident.investor_name ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label className="text-xs text-slate-500">Name</Label>
                  <p className="text-sm font-medium text-slate-900">{resident.investor_name}</p>
                </div>
                <div>
                  <Label className="text-xs text-slate-500">Email</Label>
                  <p className="text-sm font-medium text-slate-900">{resident.investor_email || '-'}</p>
                </div>
                <div>
                  <Label className="text-xs text-slate-500">Mobile</Label>
                  <p className="text-sm font-medium text-slate-900">{resident.investor_mobile || '-'}</p>
                </div>
                <div>
                  <Label className="text-xs text-slate-500">Home Phone</Label>
                  <p className="text-sm font-medium text-slate-900">{resident.investor_home_phone || '-'}</p>
                </div>
                <div>
                  <Label className="text-xs text-slate-500">Second Phone</Label>
                  <p className="text-sm font-medium text-slate-900">{resident.investor_second_phone || '-'}</p>
                </div>
                <div>
                  <Label className="text-xs text-slate-500">Strata Committee Member</Label>
                  <p className="text-sm font-medium text-slate-900">{resident.investor_strata_committee_member ? 'Yes' : 'No'}</p>
                </div>
                {resident.investor_address && (
                  <div className="md:col-span-3">
                    <Label className="text-xs text-slate-500">Address</Label>
                    <p className="text-sm font-medium text-slate-900">{resident.investor_address}</p>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-slate-500">No investor information</p>
            )}
          </CardContent>
        </Card>

        {/* Managing Agent */}
        <Card className="border-0 shadow-sm lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Users className="h-5 w-5 text-blue-600" />
              Managing Agent
            </CardTitle>
            <div className="flex items-center gap-2">
              {resident.managing_agent_email && (
                <Button variant="outline" size="sm" onClick={() => sendInviteMutation.mutate()}>
                  <Send className="h-4 w-4 mr-2" />
                  Send Portal Invite
                </Button>
              )}
              <Button variant="ghost" size="icon" onClick={() => handleEdit('agent')}>
                <Pencil className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {resident.managing_agent_company ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label className="text-xs text-slate-500">Company</Label>
                  <p className="text-sm font-medium text-slate-900">{resident.managing_agent_company}</p>
                </div>
                <div>
                  <Label className="text-xs text-slate-500">Contact Name</Label>
                  <p className="text-sm font-medium text-slate-900">{resident.managing_agent_contact_name || '-'}</p>
                </div>
                <div>
                  <Label className="text-xs text-slate-500">Phone</Label>
                  <p className="text-sm font-medium text-slate-900">{resident.managing_agent_phone || '-'}</p>
                </div>
                <div>
                  <Label className="text-xs text-slate-500">Email</Label>
                  <p className="text-sm font-medium text-slate-900">{resident.managing_agent_email || '-'}</p>
                </div>
                {resident.managing_agent_address && (
                  <div className="md:col-span-3">
                    <Label className="text-xs text-slate-500">Address</Label>
                    <p className="text-sm font-medium text-slate-900">{resident.managing_agent_address}</p>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-slate-500">No managing agent information</p>
            )}
          </CardContent>
        </Card>

        {/* Documents */}
        <Card className="border-0 shadow-sm lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <FileText className="h-5 w-5 text-blue-600" />
              Documents
            </CardTitle>
            <Button variant="ghost" size="icon" onClick={() => handleEdit('documents')}>
              <Pencil className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent>
            {resident.documents && resident.documents.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {resident.documents.map((docUrl, index) => (
                  <a
                    key={index}
                    href={docUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 p-3 bg-slate-50 hover:bg-slate-100 rounded-lg transition-colors"
                  >
                    <FileText className="h-4 w-4 text-blue-600 flex-shrink-0" />
                    <span className="text-sm text-slate-700 truncate">Document {index + 1}</span>
                  </a>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-500">No documents uploaded</p>
            )}
          </CardContent>
        </Card>

        {/* Notes */}
        <Card className="border-0 shadow-sm lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-lg">Notes</CardTitle>
            <Button variant="ghost" size="icon" onClick={() => handleEdit('notes')}>
              <Pencil className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-slate-700 whitespace-pre-wrap">{resident.notes || 'No notes'}</p>
          </CardContent>
        </Card>
      </div>

      {/* Edit Dialog */}
      <Dialog open={!!editingSection} onOpenChange={() => setEditingSection(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit {editingSection?.charAt(0).toUpperCase() + editingSection?.slice(1)}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {editingSection === 'personal' && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>First Name</Label>
                    <Input
                      value={formData.first_name || ''}
                      onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Last Name</Label>
                    <Input
                      value={formData.last_name || ''}
                      onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Email</Label>
                    <Input
                      type="email"
                      value={formData.email || ''}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Phone</Label>
                    <Input
                      value={formData.phone || ''}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Move-in Date</Label>
                    <Input
                      type="date"
                      value={formData.move_in_date || ''}
                      onChange={(e) => setFormData({ ...formData, move_in_date: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Move-out Date</Label>
                    <Input
                      type="date"
                      value={formData.move_out_date || ''}
                      onChange={(e) => setFormData({ ...formData, move_out_date: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Parking Spot</Label>
                    <Input
                      value={formData.parking_spot || ''}
                      onChange={(e) => setFormData({ ...formData, parking_spot: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Status</Label>
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
                  <div className="col-span-2">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="has_pet"
                        checked={formData.has_pet || false}
                        onChange={(e) => setFormData({ ...formData, has_pet: e.target.checked })}
                        className="rounded"
                      />
                      <Label htmlFor="has_pet" className="cursor-pointer">Has Pet</Label>
                    </div>
                  </div>
                </div>
              </>
            )}

            {editingSection === 'emergency' && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Name</Label>
                  <Input
                    value={formData.emergency_contact_name || ''}
                    onChange={(e) => setFormData({ ...formData, emergency_contact_name: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Phone</Label>
                  <Input
                    value={formData.emergency_contact_phone || ''}
                    onChange={(e) => setFormData({ ...formData, emergency_contact_phone: e.target.value })}
                  />
                </div>
              </div>
            )}

            {editingSection === 'vehicle' && (
              <div>
                <Label>Vehicle Information</Label>
                <Textarea
                  value={formData.vehicle_info || ''}
                  onChange={(e) => setFormData({ ...formData, vehicle_info: e.target.value })}
                  placeholder="Make, model, plate number, color, etc."
                  rows={3}
                />
              </div>
            )}

            {editingSection === 'meters' && (
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label>Hot Water Meter</Label>
                  <Input
                    value={formData.hot_water_meter_number || ''}
                    onChange={(e) => setFormData({ ...formData, hot_water_meter_number: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Electrical Meter</Label>
                  <Input
                    value={formData.electrical_meter_number || ''}
                    onChange={(e) => setFormData({ ...formData, electrical_meter_number: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Gas Meter</Label>
                  <Input
                    value={formData.gas_meter_number || ''}
                    onChange={(e) => setFormData({ ...formData, gas_meter_number: e.target.value })}
                  />
                </div>
              </div>
            )}

            {editingSection === 'investor' && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <Label>Name</Label>
                    <Input
                      value={formData.investor_name || ''}
                      onChange={(e) => setFormData({ ...formData, investor_name: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Email</Label>
                    <Input
                      type="email"
                      value={formData.investor_email || ''}
                      onChange={(e) => setFormData({ ...formData, investor_email: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Mobile</Label>
                    <Input
                      value={formData.investor_mobile || ''}
                      onChange={(e) => setFormData({ ...formData, investor_mobile: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Home Phone</Label>
                    <Input
                      value={formData.investor_home_phone || ''}
                      onChange={(e) => setFormData({ ...formData, investor_home_phone: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Second Phone</Label>
                    <Input
                      value={formData.investor_second_phone || ''}
                      onChange={(e) => setFormData({ ...formData, investor_second_phone: e.target.value })}
                    />
                  </div>
                  <div className="col-span-2">
                    <Label>Address</Label>
                    <Textarea
                      value={formData.investor_address || ''}
                      onChange={(e) => setFormData({ ...formData, investor_address: e.target.value })}
                      rows={2}
                    />
                  </div>
                  <div className="col-span-2">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="strata_committee"
                        checked={formData.investor_strata_committee_member || false}
                        onChange={(e) => setFormData({ ...formData, investor_strata_committee_member: e.target.checked })}
                        className="rounded"
                      />
                      <Label htmlFor="strata_committee" className="cursor-pointer">Strata Committee Member</Label>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {editingSection === 'agent' && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <Label>Company</Label>
                    <Input
                      value={formData.managing_agent_company || ''}
                      onChange={(e) => setFormData({ ...formData, managing_agent_company: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Contact Name</Label>
                    <Input
                      value={formData.managing_agent_contact_name || ''}
                      onChange={(e) => setFormData({ ...formData, managing_agent_contact_name: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Phone</Label>
                    <Input
                      value={formData.managing_agent_phone || ''}
                      onChange={(e) => setFormData({ ...formData, managing_agent_phone: e.target.value })}
                    />
                  </div>
                  <div className="col-span-2">
                    <Label>Email</Label>
                    <Input
                      type="email"
                      value={formData.managing_agent_email || ''}
                      onChange={(e) => setFormData({ ...formData, managing_agent_email: e.target.value })}
                    />
                  </div>
                  <div className="col-span-2">
                    <Label>Address</Label>
                    <Textarea
                      value={formData.managing_agent_address || ''}
                      onChange={(e) => setFormData({ ...formData, managing_agent_address: e.target.value })}
                      rows={2}
                    />
                  </div>
                </div>
              </div>
            )}

            {editingSection === 'documents' && (
              <div className="space-y-4">
                <Button type="button" variant="outline" className="w-full" asChild disabled={uploadingFiles}>
                  <label>
                    <Upload className="h-4 w-4 mr-2" />
                    {uploadingFiles ? "Uploading..." : "Upload Documents"}
                    <input type="file" multiple className="hidden" onChange={handleFileSelect} />
                  </label>
                </Button>
                {formData.documents && formData.documents.length > 0 && (
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
            )}

            {editingSection === 'notes' && (
              <div>
                <Label>Notes</Label>
                <Textarea
                  value={formData.notes || ''}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={6}
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingSection(null)}>Cancel</Button>
            <Button onClick={handleSave} disabled={updateMutation.isPending}>
              {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}