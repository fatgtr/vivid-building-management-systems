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
import { Badge } from "@/components/ui/badge";
import PageHeader from '@/components/common/PageHeader';
import EmptyState from '@/components/common/EmptyState';
import StatusBadge from '@/components/common/StatusBadge';
import { HardHat, Search, MoreVertical, Pencil, Trash2, Phone, Mail, MapPin, Star, DollarSign, Shield, Upload, FileText, X } from 'lucide-react';
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

const specialties = [
  { value: 'plumbing', label: 'Plumbing' },
  { value: 'electrical', label: 'Electrical' },
  { value: 'hvac', label: 'HVAC' },
  { value: 'appliance', label: 'Appliance' },
  { value: 'structural', label: 'Structural' },
  { value: 'pest_control', label: 'Pest Control' },
  { value: 'cleaning', label: 'Cleaning' },
  { value: 'landscaping', label: 'Landscaping' },
  { value: 'security', label: 'Security' },
  { value: 'general', label: 'General' },
];

const initialFormState = {
  company_name: '',
  abn: '',
  acn: '',
  contact_name: '',
  email: '',
  phone: '',
  address: '',
  specialty: [],
  license_number: '',
  license_expiry_date: '',
  insurance_details: '',
  insurance_expiry: '',
  work_cover_details: '',
  work_cover_expiry_date: '',
  public_liability_details: '',
  public_liability_expiry_date: '',
  hourly_rate: '',
  status: 'active',
  notes: '',
  documents: [],
};

export default function Contractors() {
  const [showDialog, setShowDialog] = useState(false);
  const [editingContractor, setEditingContractor] = useState(null);
  const [formData, setFormData] = useState(initialFormState);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterSpecialty, setFilterSpecialty] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [deleteContractor, setDeleteContractor] = useState(null);
  const [uploadingDocument, setUploadingDocument] = useState(false);

  const queryClient = useQueryClient();

  const { data: contractors = [], isLoading } = useQuery({
    queryKey: ['contractors'],
    queryFn: () => base44.entities.Contractor.list(),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Contractor.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contractors'] });
      handleCloseDialog();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Contractor.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contractors'] });
      handleCloseDialog();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Contractor.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contractors'] });
      setDeleteContractor(null);
    },
  });

  const handleCloseDialog = () => {
    setShowDialog(false);
    setEditingContractor(null);
    setFormData(initialFormState);
  };

  const handleEdit = (contractor) => {
    setEditingContractor(contractor);
    setFormData({
      company_name: contractor.company_name || '',
      abn: contractor.abn || '',
      acn: contractor.acn || '',
      contact_name: contractor.contact_name || '',
      email: contractor.email || '',
      phone: contractor.phone || '',
      address: contractor.address || '',
      specialty: contractor.specialty || [],
      license_number: contractor.license_number || '',
      license_expiry_date: contractor.license_expiry_date || '',
      insurance_details: contractor.insurance_details || '',
      insurance_expiry: contractor.insurance_expiry || '',
      work_cover_details: contractor.work_cover_details || '',
      work_cover_expiry_date: contractor.work_cover_expiry_date || '',
      public_liability_details: contractor.public_liability_details || '',
      public_liability_expiry_date: contractor.public_liability_expiry_date || '',
      hourly_rate: contractor.hourly_rate || '',
      status: contractor.status || 'active',
      notes: contractor.notes || '',
      documents: contractor.documents || [],
    });
    setShowDialog(true);
  };

  const handleDocumentUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingDocument(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setFormData({
        ...formData,
        documents: [...(formData.documents || []), { url: file_url, name: file.name, uploadedAt: new Date().toISOString() }]
      });
    } catch (error) {
      console.error('Document upload failed:', error);
    } finally {
      setUploadingDocument(false);
    }
  };

  const handleRemoveDocument = (index) => {
    const updatedDocuments = [...(formData.documents || [])];
    updatedDocuments.splice(index, 1);
    setFormData({ ...formData, documents: updatedDocuments });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const data = {
      ...formData,
      hourly_rate: formData.hourly_rate ? Number(formData.hourly_rate) : null,
    };

    if (editingContractor) {
      updateMutation.mutate({ id: editingContractor.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const toggleSpecialty = (spec) => {
    const current = formData.specialty || [];
    if (current.includes(spec)) {
      setFormData({ ...formData, specialty: current.filter(s => s !== spec) });
    } else {
      setFormData({ ...formData, specialty: [...current, spec] });
    }
  };

  const filteredContractors = contractors.filter(c => {
    const matchesSearch = c.company_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         c.contact_name?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSpecialty = filterSpecialty === 'all' || c.specialty?.includes(filterSpecialty);
    const matchesStatus = filterStatus === 'all' || c.status === filterStatus;
    return matchesSearch && matchesSpecialty && matchesStatus;
  });

  if (isLoading) {
    return (
      <div className="space-y-8">
        <PageHeader title="Contractors" subtitle="Manage contractor directory" />
        <Skeleton className="h-96 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Contractors" 
        subtitle={`${contractors.filter(c => c.status === 'active').length} active contractors`}
        action={() => setShowDialog(true)}
        actionLabel="Add Contractor"
      />

      {/* Filters */}
      <div className="flex flex-wrap gap-4">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search contractors..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={filterSpecialty} onValueChange={setFilterSpecialty}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="All Specialties" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Specialties</SelectItem>
            {specialties.map(s => (
              <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="All Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
            <SelectItem value="pending_approval">Pending</SelectItem>
            <SelectItem value="pending_compliance_review">Compliance Review</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {filteredContractors.length === 0 ? (
        <EmptyState
          icon={HardHat}
          title="No contractors"
          description="Add contractors to your directory for work order assignments"
          action={() => setShowDialog(true)}
          actionLabel="Add Contractor"
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredContractors.map((contractor) => (
            <Card key={contractor.id} className="border-0 shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-500 flex items-center justify-center text-white font-bold text-lg">
                      {contractor.company_name?.[0]?.toUpperCase() || 'C'}
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-900">{contractor.company_name}</h3>
                      <p className="text-sm text-slate-500">{contractor.contact_name}</p>
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleEdit(contractor)}>
                        <Pencil className="mr-2 h-4 w-4" /> Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setDeleteContractor(contractor)} className="text-red-600">
                        <Trash2 className="mr-2 h-4 w-4" /> Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                <div className="space-y-2 text-sm mb-4">
                  {contractor.email && (
                    <div className="flex items-center gap-2 text-slate-600">
                      <Mail className="h-4 w-4 text-slate-400" />
                      <span className="truncate">{contractor.email}</span>
                    </div>
                  )}
                  {contractor.phone && (
                    <div className="flex items-center gap-2 text-slate-600">
                      <Phone className="h-4 w-4 text-slate-400" />
                      <span>{contractor.phone}</span>
                    </div>
                  )}
                  {contractor.hourly_rate && (
                    <div className="flex items-center gap-2 text-slate-600">
                      <DollarSign className="h-4 w-4 text-slate-400" />
                      <span>${contractor.hourly_rate}/hr</span>
                    </div>
                  )}
                  {contractor.license_number && (
                   <div className="flex items-center gap-2 text-slate-600">
                     <Shield className="h-4 w-4 text-slate-400" />
                     <span>License: {contractor.license_number}</span>
                   </div>
                  )}
                  {contractor.insurance_expiry && (
                    <div className="flex items-center gap-2 text-slate-600">
                      <Shield className="h-4 w-4 text-slate-400" />
                      <span className={new Date(contractor.insurance_expiry) < new Date() ? 'text-red-600 font-medium' : ''}>
                        Insurance: {format(new Date(contractor.insurance_expiry), 'MMM d, yyyy')}
                      </span>
                    </div>
                  )}
                  {contractor.documents?.length > 0 && (
                    <div className="flex items-center gap-2 text-slate-600">
                      <FileText className="h-4 w-4 text-slate-400" />
                      <span>{contractor.documents.length} document{contractor.documents.length !== 1 ? 's' : ''}</span>
                    </div>
                  )}
                  </div>

                {contractor.specialty?.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-3">
                    {contractor.specialty.slice(0, 3).map(spec => (
                      <Badge key={spec} variant="secondary" className="text-xs capitalize">
                        {spec.replace(/_/g, ' ')}
                      </Badge>
                    ))}
                    {contractor.specialty.length > 3 && (
                      <Badge variant="secondary" className="text-xs">
                        +{contractor.specialty.length - 3}
                      </Badge>
                    )}
                  </div>
                )}

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                  <StatusBadge status={contractor.status} />
                  {contractor.rating && (
                    <div className="flex items-center gap-1 text-sm">
                      <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                      <span className="font-medium">{contractor.rating}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingContractor ? 'Edit Contractor' : 'Add New Contractor'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="company_name">Company Name *</Label>
                <Input
                  id="company_name"
                  value={formData.company_name}
                  onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="contact_name">Contact Name *</Label>
                <Input
                  id="contact_name"
                  value={formData.contact_name}
                  onChange={(e) => setFormData({ ...formData, contact_name: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="abn">ABN (Australian Business Number)</Label>
                <Input
                  id="abn"
                  value={formData.abn}
                  onChange={(e) => setFormData({ ...formData, abn: e.target.value })}
                  placeholder="XX XXX XXX XXX"
                />
              </div>
              <div>
                <Label htmlFor="acn">ACN (Australian Company Number)</Label>
                <Input
                  id="acn"
                  value={formData.acn}
                  onChange={(e) => setFormData({ ...formData, acn: e.target.value })}
                  placeholder="XXX XXX XXX"
                />
              </div>
              <div>
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
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
              <div className="md:col-span-2">
                <Label htmlFor="address">Address</Label>
                <Input
                  id="address"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                />
              </div>
              <div className="md:col-span-2">
                <h4 className="font-medium text-slate-900 mb-3 mt-2">Compliance Information</h4>
              </div>
              <div>
                <Label htmlFor="license_number">License Number</Label>
                <Input
                  id="license_number"
                  value={formData.license_number}
                  onChange={(e) => setFormData({ ...formData, license_number: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="license_expiry_date">License Expiry Date</Label>
                <Input
                  id="license_expiry_date"
                  type="date"
                  value={formData.license_expiry_date}
                  onChange={(e) => setFormData({ ...formData, license_expiry_date: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="insurance_details">Insurance Policy Details</Label>
                <Input
                  id="insurance_details"
                  value={formData.insurance_details}
                  onChange={(e) => setFormData({ ...formData, insurance_details: e.target.value })}
                  placeholder="Policy number, provider"
                />
              </div>
              <div>
                <Label htmlFor="insurance_expiry">Insurance Expiry Date</Label>
                <Input
                  id="insurance_expiry"
                  type="date"
                  value={formData.insurance_expiry}
                  onChange={(e) => setFormData({ ...formData, insurance_expiry: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="work_cover_details">Work Cover Details</Label>
                <Input
                  id="work_cover_details"
                  value={formData.work_cover_details}
                  onChange={(e) => setFormData({ ...formData, work_cover_details: e.target.value })}
                  placeholder="Policy number, provider"
                />
              </div>
              <div>
                <Label htmlFor="work_cover_expiry_date">Work Cover Expiry Date</Label>
                <Input
                  id="work_cover_expiry_date"
                  type="date"
                  value={formData.work_cover_expiry_date}
                  onChange={(e) => setFormData({ ...formData, work_cover_expiry_date: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="public_liability_details">Public Liability Details</Label>
                <Input
                  id="public_liability_details"
                  value={formData.public_liability_details}
                  onChange={(e) => setFormData({ ...formData, public_liability_details: e.target.value })}
                  placeholder="Policy number, provider"
                />
              </div>
              <div>
                <Label htmlFor="public_liability_expiry_date">Public Liability Expiry Date</Label>
                <Input
                  id="public_liability_expiry_date"
                  type="date"
                  value={formData.public_liability_expiry_date}
                  onChange={(e) => setFormData({ ...formData, public_liability_expiry_date: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="hourly_rate">Hourly Rate ($)</Label>
                <Input
                  id="hourly_rate"
                  type="number"
                  value={formData.hourly_rate}
                  onChange={(e) => setFormData({ ...formData, hourly_rate: e.target.value })}
                />
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
                    <SelectItem value="pending_approval">Pending Approval</SelectItem>
                    <SelectItem value="pending_compliance_review">Pending Compliance Review</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="md:col-span-2">
                <Label>Specialties</Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {specialties.map(spec => (
                    <Badge
                      key={spec.value}
                      variant={formData.specialty?.includes(spec.value) ? "default" : "outline"}
                      className="cursor-pointer"
                      onClick={() => toggleSpecialty(spec.value)}
                    >
                      {spec.label}
                    </Badge>
                  ))}
                </div>
              </div>
              <div className="md:col-span-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={2}
                />
              </div>
              <div className="md:col-span-2">
                <Label>Compliance Documents</Label>
                <p className="text-xs text-slate-500 mb-2">Upload insurance certificates, licenses, work cover, and public liability documents</p>
                <div className="space-y-2">
                  {formData.documents?.map((doc, index) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-slate-50 rounded-lg border">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-slate-400" />
                        <a href={doc.url} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:underline">
                          {doc.name || 'Document'}
                        </a>
                        <span className="text-xs text-slate-400">
                          {doc.uploadedAt && format(new Date(doc.uploadedAt), 'MMM d, yyyy')}
                        </span>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => handleRemoveDocument(index)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                  <div>
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full"
                      disabled={uploadingDocument}
                      asChild
                    >
                      <label className="cursor-pointer">
                        <Upload className="h-4 w-4 mr-2" />
                        {uploadingDocument ? 'Uploading...' : 'Upload Document'}
                        <input
                          type="file"
                          className="hidden"
                          onChange={handleDocumentUpload}
                          accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                        />
                      </label>
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleCloseDialog}>Cancel</Button>
              <Button type="submit" className="bg-blue-600 hover:bg-blue-700" disabled={createMutation.isPending || updateMutation.isPending}>
                {createMutation.isPending || updateMutation.isPending ? 'Saving...' : (editingContractor ? 'Update' : 'Create')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteContractor} onOpenChange={() => setDeleteContractor(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Contractor</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deleteContractor?.company_name}"?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteMutation.mutate(deleteContractor.id)} className="bg-red-600 hover:bg-red-700">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}