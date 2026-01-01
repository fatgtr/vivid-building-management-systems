import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import PageHeader from '@/components/common/PageHeader';
import EmptyState from '@/components/common/EmptyState';
import StatusBadge from '@/components/common/StatusBadge';
import ContractorPerformanceMetrics from '@/components/contractor/ContractorPerformanceMetrics';
import ContractorContractInfo from '@/components/contractor/ContractorContractInfo';
import ContractorApplicationReviewQueue from '@/components/contractor/ContractorApplicationReviewQueue';
import { HardHat, Search, MoreVertical, Pencil, Trash2, Phone, Mail, MapPin, Star, DollarSign, Shield, Upload, FileText, X, Send, Loader2, TrendingUp, Calendar, Sparkles, CheckCircle, Building2 } from 'lucide-react';
import { toast } from 'sonner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  { value: 'plumbing', label: 'Plumbing', icon: '🔧', color: 'from-blue-500 to-blue-600' },
  { value: 'electrical', label: 'Electrical', icon: '⚡', color: 'from-yellow-500 to-yellow-600' },
  { value: 'hvac', label: 'HVAC', icon: '❄️', color: 'from-cyan-500 to-cyan-600' },
  { value: 'appliance', label: 'Appliance', icon: '🔌', color: 'from-purple-500 to-purple-600' },
  { value: 'structural', label: 'Structural', icon: '🏗️', color: 'from-slate-500 to-slate-600' },
  { value: 'pest_control', label: 'Pest Control', icon: '🐛', color: 'from-green-500 to-green-600' },
  { value: 'cleaning', label: 'Cleaning', icon: '🧹', color: 'from-pink-500 to-pink-600' },
  { value: 'landscaping', label: 'Landscaping', icon: '🌳', color: 'from-emerald-500 to-emerald-600' },
  { value: 'security', label: 'Security', icon: '🔒', color: 'from-red-500 to-red-600' },
  { value: 'general', label: 'General', icon: '🛠️', color: 'from-indigo-500 to-indigo-600' },
];

const getComplianceStatus = (contractor) => {
  const today = new Date();
  const thirtyDaysFromNow = new Date(today);
  thirtyDaysFromNow.setDate(today.getDate() + 30);

  const expiryDates = [
    contractor.license_expiry_date,
    contractor.insurance_expiry,
    contractor.work_cover_expiry_date,
    contractor.public_liability_expiry_date,
  ].filter(Boolean);

  if (expiryDates.length === 0) {
    return { status: 'unknown', label: 'Unknown', color: 'bg-slate-100 text-slate-600 border-slate-200' };
  }

  const hasExpired = expiryDates.some(date => new Date(date) < today);
  if (hasExpired) {
    return { status: 'non_compliant', label: 'Non-Compliant', color: 'bg-red-100 text-red-700 border-red-200' };
  }

  const hasExpiringSoon = expiryDates.some(date => {
    const expiryDate = new Date(date);
    return expiryDate >= today && expiryDate <= thirtyDaysFromNow;
  });
  if (hasExpiringSoon) {
    return { status: 'expiring_soon', label: 'Expiring Soon', color: 'bg-yellow-100 text-yellow-700 border-yellow-200' };
  }

  return { status: 'compliant', label: 'Compliant', color: 'bg-green-100 text-green-700 border-green-200' };
};

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
  contract_type: '',
  contract_start_date: '',
  contract_end_date: '',
  contract_document_url: '',
  hourly_rate: '',
  status: 'active',
  notes: '',
  documents: [],
  building_ids: [],
};

export default function Contractors() {
  const [showDialog, setShowDialog] = useState(false);
  const [editingContractor, setEditingContractor] = useState(null);
  const [formData, setFormData] = useState(initialFormState);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterSpecialty, setFilterSpecialty] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterCompliance, setFilterCompliance] = useState('all');
  const [deleteContractor, setDeleteContractor] = useState(null);
  const [uploadingDocument, setUploadingDocument] = useState(false);
  const [sendingToStrata, setSendingToStrata] = useState(null);
  const [sendingInviteTo, setSendingInviteTo] = useState(null);
  const [viewingMetrics, setViewingMetrics] = useState(null);
  const [uploadingContract, setUploadingContract] = useState(false);
  const [extractingData, setExtractingData] = useState(false);
  const [currentDialogTab, setCurrentDialogTab] = useState('basic');

  const queryClient = useQueryClient();

  const { data: buildings = [] } = useQuery({
    queryKey: ['buildings'],
    queryFn: () => base44.entities.Building.list(),
  });

  const { data: contractors = [], isLoading } = useQuery({
    queryKey: ['contractors'],
    queryFn: () => base44.entities.Contractor.list(),
  });

  const { data: applications = [] } = useQuery({
    queryKey: ['contractorApplications'],
    queryFn: () => base44.entities.ContractorApplication.filter({ status: 'pending_review' }),
  });

  const createMutation = useMutation({
    mutationFn: async (data) => {
      const contractor = await base44.entities.Contractor.create(data);
      try {
        await base44.functions.invoke('createContractorUser', { 
          contractorId: contractor.id,
          email: data.email,
          name: data.contact_name
        });
      } catch (error) {
        console.error('Failed to create contractor user:', error);
      }
      return contractor;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contractors'] });
      handleCloseDialog();
      toast.success('Contractor created successfully!');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Contractor.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contractors'] });
      handleCloseDialog();
      toast.success('Contractor updated successfully!');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Contractor.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contractors'] });
      setDeleteContractor(null);
      toast.success('Contractor deleted!');
    },
  });

  const sendToStrataMutation = useMutation({
    mutationFn: (contractorId) => base44.functions.invoke('sendContractorToStrata', { contractor_id: contractorId }),
    onSuccess: () => {
      setSendingToStrata(null);
      toast.success('Sent to strata manager!');
    },
  });

  const sendInviteMutation = useMutation({
    mutationFn: async (contractor) => {
      setSendingInviteTo(contractor.id);
      const response = await base44.functions.invoke('sendContractorInvite', {
        contractorId: contractor.id,
        email: contractor.email,
        companyName: contractor.company_name,
        contactName: contractor.contact_name,
      });
      return response;
    },
    onSuccess: (data) => {
      setSendingInviteTo(null);
      toast.success('Portal invite sent!');
    },
    onError: (error) => {
      setSendingInviteTo(null);
      toast.error('Failed to send invite');
    },
  });

  const handleCloseDialog = () => {
    setShowDialog(false);
    setEditingContractor(null);
    setFormData(initialFormState);
    setCurrentDialogTab('basic');
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
      contract_type: contractor.contract_type || '',
      contract_start_date: contractor.contract_start_date || '',
      contract_end_date: contractor.contract_end_date || '',
      contract_document_url: contractor.contract_document_url || '',
      hourly_rate: contractor.hourly_rate || '',
      status: contractor.status || 'active',
      notes: contractor.notes || '',
      documents: contractor.documents || [],
      building_ids: contractor.building_ids || [],
    });
    setShowDialog(true);
  };

  const handleDocumentUploadWithAI = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingDocument(true);
    setExtractingData(true);
    
    try {
      // First, upload the file
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      
      toast.info('Analyzing document with AI...');
      
      // Extract data using AI
      const { data: extractResult } = await base44.functions.invoke('extractContractorDocumentDetails', {
        file_url
      });

      if (extractResult.success && extractResult.extracted_data) {
        const extracted = extractResult.extracted_data;
        
        // Merge extracted data with form data
        setFormData(prev => ({
          ...prev,
          license_number: extracted.license_number || prev.license_number,
          license_expiry_date: extracted.license_expiry_date || prev.license_expiry_date,
          insurance_details: extracted.insurance_details || prev.insurance_details,
          insurance_expiry: extracted.insurance_expiry || prev.insurance_expiry,
          work_cover_details: extracted.work_cover_details || prev.work_cover_details,
          work_cover_expiry_date: extracted.work_cover_expiry_date || prev.work_cover_expiry_date,
          public_liability_details: extracted.public_liability_details || prev.public_liability_details,
          public_liability_expiry_date: extracted.public_liability_expiry_date || prev.public_liability_expiry_date,
          abn: extracted.abn || prev.abn,
          acn: extracted.acn || prev.acn,
          documents: [...(prev.documents || []), { 
            url: file_url, 
            name: file.name, 
            uploadedAt: new Date().toISOString(),
            extractedData: extracted
          }]
        }));
        
        toast.success('Document uploaded and data extracted!');
      } else {
        // Even if extraction fails, still add the document
        setFormData(prev => ({
          ...prev,
          documents: [...(prev.documents || []), { 
            url: file_url, 
            name: file.name, 
            uploadedAt: new Date().toISOString() 
          }]
        }));
        toast.warning('Document uploaded, but could not extract data automatically');
      }
    } catch (error) {
      console.error('Document upload failed:', error);
      toast.error('Failed to upload document');
    } finally {
      setUploadingDocument(false);
      setExtractingData(false);
    }
  };

  const handleContractUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingContract(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setFormData({ ...formData, contract_document_url: file_url });
      toast.success('Contract uploaded!');
    } catch (error) {
      console.error('Contract upload failed:', error);
      toast.error('Failed to upload contract');
    } finally {
      setUploadingContract(false);
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
    const complianceStatus = getComplianceStatus(c).status;
    const matchesCompliance = filterCompliance === 'all' || complianceStatus === filterCompliance;
    return matchesSearch && matchesSpecialty && matchesStatus && matchesCompliance;
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
      >
        {applications.length > 0 && (
          <Badge variant="outline" className="text-orange-600 border-orange-200">
            {applications.length} pending review
          </Badge>
        )}
      </PageHeader>

      <Tabs defaultValue="contractors" className="space-y-6">
        <TabsList>
          <TabsTrigger value="contractors">
            Contractors ({filteredContractors.length})
          </TabsTrigger>
          <TabsTrigger value="applications">
            Applications
            {applications.length > 0 && (
              <Badge variant="secondary" className="ml-2">{applications.length}</Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="contractors" className="space-y-6">
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
            <Select value={filterCompliance} onValueChange={setFilterCompliance}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Compliance" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Compliance</SelectItem>
                <SelectItem value="compliant">Compliant</SelectItem>
                <SelectItem value="expiring_soon">Expiring Soon</SelectItem>
                <SelectItem value="non_compliant">Non-Compliant</SelectItem>
                <SelectItem value="unknown">Unknown</SelectItem>
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
              {filteredContractors.map((contractor) => {
                const compliance = getComplianceStatus(contractor);
                const specialty = specialties.find(s => contractor.specialty?.[0] === s.value);
                
                return (
                  <Card key={contractor.id} className="group border-0 shadow-md hover:shadow-2xl transition-all duration-300 overflow-hidden">
                    <div className={`h-2 w-full bg-gradient-to-r ${specialty?.color || 'from-slate-500 to-slate-600'}`} />
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${specialty?.color || 'from-purple-500 to-indigo-500'} flex items-center justify-center text-white font-bold text-2xl shadow-lg`}>
                            {specialty?.icon || contractor.company_name?.[0]?.toUpperCase() || 'C'}
                          </div>
                          <div>
                            <h3 className="font-bold text-slate-900 group-hover:text-blue-600 transition-colors">{contractor.company_name}</h3>
                            <p className="text-sm text-slate-500">{contractor.contact_name}</p>
                          </div>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 opacity-60 group-hover:opacity-100">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => setViewingMetrics(contractor)}>
                              <TrendingUp className="mr-2 h-4 w-4" /> View Metrics
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleEdit(contractor)}>
                              <Pencil className="mr-2 h-4 w-4" /> Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => sendInviteMutation.mutate(contractor)} 
                              disabled={sendInviteMutation.isPending && sendingInviteTo === contractor.id}
                            >
                              {sendInviteMutation.isPending && sendingInviteTo === contractor.id ? (
                                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Sending...</>
                              ) : (
                                <><Send className="mr-2 h-4 w-4" /> Send Portal Invite</>
                              )}
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => {
                              setSendingToStrata(contractor.id);
                              sendToStrataMutation.mutate(contractor.id);
                            }}>
                              <Send className="mr-2 h-4 w-4" /> Send to Strata
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setDeleteContractor(contractor)} className="text-red-600">
                              <Trash2 className="mr-2 h-4 w-4" /> Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>

                      <div className="space-y-2.5 mb-4">
                        {contractor.email && (
                          <div className="flex items-center gap-2 text-sm bg-slate-50 px-3 py-2 rounded-lg">
                            <Mail className="h-4 w-4 text-slate-500" />
                            <span className="text-slate-700 truncate">{contractor.email}</span>
                          </div>
                        )}
                        {contractor.phone && (
                          <div className="flex items-center gap-2 text-sm bg-blue-50 px-3 py-2 rounded-lg">
                            <Phone className="h-4 w-4 text-blue-600" />
                            <span className="text-blue-700 font-medium">{contractor.phone}</span>
                          </div>
                        )}
                        {contractor.hourly_rate && (
                          <div className="flex items-center gap-2 text-sm bg-green-50 px-3 py-2 rounded-lg">
                            <DollarSign className="h-4 w-4 text-green-600" />
                            <span className="text-green-700 font-medium">${contractor.hourly_rate}/hr</span>
                          </div>
                        )}
                        {contractor.license_number && (
                          <div className="flex items-center gap-2 text-sm bg-purple-50 px-3 py-2 rounded-lg">
                            <Shield className="h-4 w-4 text-purple-600" />
                            <span className="text-purple-700 font-medium truncate">Lic: {contractor.license_number}</span>
                          </div>
                        )}
                      </div>

                      {contractor.specialty?.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mb-4">
                          {contractor.specialty.slice(0, 3).map(spec => {
                            const s = specialties.find(sp => sp.value === spec);
                            return (
                              <Badge key={spec} variant="secondary" className="text-xs">
                                {s?.icon} {s?.label || spec}
                              </Badge>
                            );
                          })}
                          {contractor.specialty.length > 3 && (
                            <Badge variant="secondary" className="text-xs">
                              +{contractor.specialty.length - 3}
                            </Badge>
                          )}
                        </div>
                      )}

                      <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                        <div className="flex flex-col gap-2">
                          <StatusBadge status={contractor.status} />
                          <Badge variant="outline" className={compliance.color}>
                            <Shield className="h-3 w-3 mr-1" />
                            {compliance.label}
                          </Badge>
                        </div>
                        {contractor.rating && (
                          <div className="flex items-center gap-1 bg-yellow-50 px-3 py-1.5 rounded-lg">
                            <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                            <span className="font-bold text-yellow-700">{contractor.rating}</span>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="applications">
          <ContractorApplicationReviewQueue />
        </TabsContent>
      </Tabs>

      {/* Enhanced Add/Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-2xl">
              <HardHat className="h-6 w-6 text-blue-600" />
              {editingContractor ? 'Edit Contractor' : 'Add New Contractor'}
            </DialogTitle>
            <DialogDescription>
              {editingContractor ? 'Update contractor information and compliance documents' : 'Add a new contractor to your network'}
            </DialogDescription>
          </DialogHeader>
          
          <Tabs value={currentDialogTab} onValueChange={setCurrentDialogTab} className="space-y-6">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="basic" className="gap-2">
                <Building2 className="h-4 w-4" />
                Basic Info
              </TabsTrigger>
              <TabsTrigger value="compliance" className="gap-2">
                <Shield className="h-4 w-4" />
                Compliance
                {extractingData && <Loader2 className="h-3 w-3 animate-spin ml-1" />}
              </TabsTrigger>
              <TabsTrigger value="contract" className="gap-2">
                <FileText className="h-4 w-4" />
                Contract
              </TabsTrigger>
            </TabsList>

            <form onSubmit={handleSubmit}>
              <TabsContent value="basic" className="space-y-6 mt-6">
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-100">
                  <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
                    <Building2 className="h-5 w-5 text-blue-600" />
                    Company Details
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="company_name" className="text-slate-700">Company Name *</Label>
                      <Input
                        id="company_name"
                        value={formData.company_name}
                        onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                        required
                        className="bg-white"
                      />
                    </div>
                    <div>
                      <Label htmlFor="contact_name" className="text-slate-700">Contact Name *</Label>
                      <Input
                        id="contact_name"
                        value={formData.contact_name}
                        onChange={(e) => setFormData({ ...formData, contact_name: e.target.value })}
                        required
                        className="bg-white"
                      />
                    </div>
                    <div>
                      <Label htmlFor="abn" className="text-slate-700">ABN</Label>
                      <Input
                        id="abn"
                        value={formData.abn}
                        onChange={(e) => setFormData({ ...formData, abn: e.target.value })}
                        placeholder="XX XXX XXX XXX"
                        className="bg-white"
                      />
                    </div>
                    <div>
                      <Label htmlFor="acn" className="text-slate-700">ACN</Label>
                      <Input
                        id="acn"
                        value={formData.acn}
                        onChange={(e) => setFormData({ ...formData, acn: e.target.value })}
                        placeholder="XXX XXX XXX"
                        className="bg-white"
                      />
                    </div>
                  </div>
                </div>

                <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-6 border border-purple-100">
                  <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
                    <Mail className="h-5 w-5 text-purple-600" />
                    Contact Information
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="email" className="text-slate-700">Email *</Label>
                      <Input
                        id="email"
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        required
                        className="bg-white"
                      />
                    </div>
                    <div>
                      <Label htmlFor="phone" className="text-slate-700">Phone</Label>
                      <Input
                        id="phone"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        className="bg-white"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <Label htmlFor="address" className="text-slate-700">Address</Label>
                      <Input
                        id="address"
                        value={formData.address}
                        onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                        className="bg-white"
                      />
                    </div>
                  </div>
                </div>

                <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-xl p-6 border border-emerald-100">
                  <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
                    <HardHat className="h-5 w-5 text-emerald-600" />
                    Specialties & Rate
                  </h3>
                  <div className="space-y-4">
                    <div>
                      <Label className="text-slate-700 mb-2 block">Select Specialties</Label>
                      <div className="flex flex-wrap gap-2">
                        {specialties.map(spec => (
                          <Badge
                            key={spec.value}
                            variant={formData.specialty?.includes(spec.value) ? "default" : "outline"}
                            className="cursor-pointer hover:scale-105 transition-transform"
                            onClick={() => toggleSpecialty(spec.value)}
                          >
                            <span className="mr-1">{spec.icon}</span>
                            {spec.label}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="hourly_rate" className="text-slate-700">Hourly Rate ($)</Label>
                        <Input
                          id="hourly_rate"
                          type="number"
                          value={formData.hourly_rate}
                          onChange={(e) => setFormData({ ...formData, hourly_rate: e.target.value })}
                          className="bg-white"
                        />
                      </div>
                      <div>
                        <Label htmlFor="status" className="text-slate-700">Status</Label>
                        <Select value={formData.status} onValueChange={(v) => setFormData({ ...formData, status: v })}>
                          <SelectTrigger className="bg-white">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="active">Active</SelectItem>
                            <SelectItem value="inactive">Inactive</SelectItem>
                            <SelectItem value="pending_approval">Pending Approval</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl p-6 border border-amber-100">
                  <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
                    <Building2 className="h-5 w-5 text-amber-600" />
                    Associated Buildings
                  </h3>
                  <p className="text-xs text-slate-600 mb-3">Select buildings where this contractor is preferred</p>
                  <div className="flex flex-wrap gap-2">
                    {buildings.map(building => (
                      <Badge
                        key={building.id}
                        variant={formData.building_ids?.includes(building.id) ? "default" : "outline"}
                        className="cursor-pointer hover:scale-105 transition-transform"
                        onClick={() => {
                          const current = formData.building_ids || [];
                          if (current.includes(building.id)) {
                            setFormData({ ...formData, building_ids: current.filter(id => id !== building.id) });
                          } else {
                            setFormData({ ...formData, building_ids: [...current, building.id] });
                          }
                        }}
                      >
                        {building.name}
                      </Badge>
                    ))}
                    {buildings.length === 0 && (
                      <p className="text-sm text-slate-500">No buildings available</p>
                    )}
                  </div>
                </div>

                <div>
                  <Label htmlFor="notes" className="text-slate-700">Notes</Label>
                  <Textarea
                    id="notes"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    rows={3}
                    placeholder="Additional notes about this contractor..."
                  />
                </div>
              </TabsContent>

              <TabsContent value="compliance" className="space-y-6 mt-6">
                <div className="bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 rounded-xl p-6 border-2 border-blue-200">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-bold text-slate-900 flex items-center gap-2">
                      <Sparkles className="h-5 w-5 text-blue-600" />
                      AI-Powered Document Upload
                    </h3>
                    {extractingData && (
                      <Badge className="bg-blue-600">
                        <Loader2 className="h-3 w-3 animate-spin mr-1" />
                        Extracting...
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-slate-600 mb-4">Upload compliance documents and let AI automatically extract license numbers, expiry dates, and policy details</p>
                  
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full bg-white hover:bg-blue-50 border-2 border-dashed border-blue-300 hover:border-blue-500 h-24"
                    disabled={uploadingDocument}
                    asChild
                  >
                    <label className="cursor-pointer flex flex-col items-center justify-center gap-2">
                      {uploadingDocument ? (
                        <>
                          <Loader2 className="h-8 w-8 text-blue-600 animate-spin" />
                          <span className="text-sm font-medium text-blue-600">
                            {extractingData ? 'Analyzing with AI...' : 'Uploading...'}
                          </span>
                        </>
                      ) : (
                        <>
                          <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                            <Upload className="h-6 w-6 text-blue-600" />
                          </div>
                          <span className="text-sm font-medium text-slate-700">Click to upload compliance documents</span>
                          <span className="text-xs text-slate-500">PDF, JPG, PNG supported</span>
                        </>
                      )}
                      <input
                        type="file"
                        className="hidden"
                        onChange={handleDocumentUploadWithAI}
                        accept=".pdf,.jpg,.jpeg,.png"
                      />
                    </label>
                  </Button>

                  {formData.documents?.length > 0 && (
                    <div className="space-y-2 mt-4">
                      <Label className="text-slate-700">Uploaded Documents</Label>
                      {formData.documents.map((doc, index) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-white rounded-lg border-2 border-slate-200 hover:border-blue-300 transition-colors">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                              <FileText className="h-5 w-5 text-blue-600" />
                            </div>
                            <div>
                              <a href={doc.url} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-blue-600 hover:underline">
                                {doc.name || 'Document'}
                              </a>
                              <p className="text-xs text-slate-500">
                                {doc.uploadedAt && format(new Date(doc.uploadedAt), 'MMM d, yyyy')}
                                {doc.extractedData && ' • AI extracted'}
                              </p>
                            </div>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-red-500 hover:bg-red-50"
                            onClick={() => handleRemoveDocument(index)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-6 border border-green-200">
                  <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
                    <Shield className="h-5 w-5 text-green-600" />
                    Trade License
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="license_number" className="text-slate-700">License Number</Label>
                      <Input
                        id="license_number"
                        value={formData.license_number}
                        onChange={(e) => setFormData({ ...formData, license_number: e.target.value })}
                        placeholder="Auto-filled from upload"
                        className="bg-white"
                      />
                    </div>
                    <div>
                      <Label htmlFor="license_expiry_date" className="text-slate-700">Expiry Date</Label>
                      <Input
                        id="license_expiry_date"
                        type="date"
                        value={formData.license_expiry_date}
                        onChange={(e) => setFormData({ ...formData, license_expiry_date: e.target.value })}
                        className="bg-white"
                      />
                    </div>
                  </div>
                </div>

                <div className="bg-gradient-to-br from-purple-50 to-violet-50 rounded-xl p-6 border border-purple-200">
                  <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
                    <Shield className="h-5 w-5 text-purple-600" />
                    General Insurance
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="insurance_details" className="text-slate-700">Policy Details</Label>
                      <Input
                        id="insurance_details"
                        value={formData.insurance_details}
                        onChange={(e) => setFormData({ ...formData, insurance_details: e.target.value })}
                        placeholder="Policy number, provider"
                        className="bg-white"
                      />
                    </div>
                    <div>
                      <Label htmlFor="insurance_expiry" className="text-slate-700">Expiry Date</Label>
                      <Input
                        id="insurance_expiry"
                        type="date"
                        value={formData.insurance_expiry}
                        onChange={(e) => setFormData({ ...formData, insurance_expiry: e.target.value })}
                        className="bg-white"
                      />
                    </div>
                  </div>
                </div>

                <div className="bg-gradient-to-br from-orange-50 to-amber-50 rounded-xl p-6 border border-orange-200">
                  <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
                    <Shield className="h-5 w-5 text-orange-600" />
                    Workers Compensation
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="work_cover_details" className="text-slate-700">Policy Details</Label>
                      <Input
                        id="work_cover_details"
                        value={formData.work_cover_details}
                        onChange={(e) => setFormData({ ...formData, work_cover_details: e.target.value })}
                        placeholder="Policy number, provider"
                        className="bg-white"
                      />
                    </div>
                    <div>
                      <Label htmlFor="work_cover_expiry_date" className="text-slate-700">Expiry Date</Label>
                      <Input
                        id="work_cover_expiry_date"
                        type="date"
                        value={formData.work_cover_expiry_date}
                        onChange={(e) => setFormData({ ...formData, work_cover_expiry_date: e.target.value })}
                        className="bg-white"
                      />
                    </div>
                  </div>
                </div>

                <div className="bg-gradient-to-br from-rose-50 to-pink-50 rounded-xl p-6 border border-rose-200">
                  <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
                    <Shield className="h-5 w-5 text-rose-600" />
                    Public Liability Insurance
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="public_liability_details" className="text-slate-700">Policy Details</Label>
                      <Input
                        id="public_liability_details"
                        value={formData.public_liability_details}
                        onChange={(e) => setFormData({ ...formData, public_liability_details: e.target.value })}
                        placeholder="Policy number, provider"
                        className="bg-white"
                      />
                    </div>
                    <div>
                      <Label htmlFor="public_liability_expiry_date" className="text-slate-700">Expiry Date</Label>
                      <Input
                        id="public_liability_expiry_date"
                        type="date"
                        value={formData.public_liability_expiry_date}
                        onChange={(e) => setFormData({ ...formData, public_liability_expiry_date: e.target.value })}
                        className="bg-white"
                      />
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="contract" className="space-y-6 mt-6">
                <div className="bg-gradient-to-br from-indigo-50 to-blue-50 rounded-xl p-6 border border-indigo-200">
                  <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
                    <FileText className="h-5 w-5 text-indigo-600" />
                    Contract Details
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="contract_type" className="text-slate-700">Contract Type</Label>
                      <Input
                        id="contract_type"
                        value={formData.contract_type}
                        onChange={(e) => setFormData({ ...formData, contract_type: e.target.value })}
                        placeholder="e.g., Fixed-Term, Ongoing"
                        className="bg-white"
                      />
                    </div>
                    <div />
                    <div>
                      <Label htmlFor="contract_start_date" className="text-slate-700">Start Date</Label>
                      <Input
                        id="contract_start_date"
                        type="date"
                        value={formData.contract_start_date}
                        onChange={(e) => setFormData({ ...formData, contract_start_date: e.target.value })}
                        className="bg-white"
                      />
                    </div>
                    <div>
                      <Label htmlFor="contract_end_date" className="text-slate-700">End Date</Label>
                      <Input
                        id="contract_end_date"
                        type="date"
                        value={formData.contract_end_date}
                        onChange={(e) => setFormData({ ...formData, contract_end_date: e.target.value })}
                        className="bg-white"
                      />
                    </div>
                  </div>
                  
                  <div className="mt-4">
                    <Label className="text-slate-700">Contract Document</Label>
                    {formData.contract_document_url ? (
                      <div className="flex items-center justify-between p-3 bg-white rounded-lg border-2 border-green-200 mt-2">
                        <div className="flex items-center gap-2">
                          <CheckCircle className="h-5 w-5 text-green-600" />
                          <a href={formData.contract_document_url} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:underline font-medium">
                            View Contract Document
                          </a>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-red-500"
                          onClick={() => setFormData({ ...formData, contract_document_url: '' })}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full mt-2 h-20 bg-white hover:bg-indigo-50 border-2 border-dashed border-indigo-300"
                        disabled={uploadingContract}
                        asChild
                      >
                        <label className="cursor-pointer flex flex-col items-center justify-center gap-1">
                          {uploadingContract ? (
                            <>
                              <Loader2 className="h-6 w-6 text-indigo-600 animate-spin" />
                              <span className="text-sm text-indigo-600">Uploading...</span>
                            </>
                          ) : (
                            <>
                              <Upload className="h-6 w-6 text-indigo-600" />
                              <span className="text-sm font-medium text-slate-700">Upload Contract</span>
                            </>
                          )}
                          <input
                            type="file"
                            className="hidden"
                            onChange={handleContractUpload}
                            accept=".pdf,.doc,.docx"
                          />
                        </label>
                      </Button>
                    )}
                  </div>
                </div>
              </TabsContent>

              <DialogFooter className="mt-6 pt-6 border-t">
                <Button type="button" variant="outline" onClick={handleCloseDialog}>Cancel</Button>
                <Button type="submit" className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-lg" disabled={createMutation.isPending || updateMutation.isPending}>
                  {createMutation.isPending || updateMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      {editingContractor ? 'Update Contractor' : 'Create Contractor'}
                    </>
                  )}
                </Button>
              </DialogFooter>
            </form>
          </Tabs>
        </DialogContent>
      </Dialog>

      {/* Performance Metrics Dialog */}
      <Dialog open={!!viewingMetrics} onOpenChange={() => setViewingMetrics(null)}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-blue-600" />
              Performance Metrics: {viewingMetrics?.company_name}
            </DialogTitle>
          </DialogHeader>
          
          {viewingMetrics && (
            <div className="space-y-6">
              <ContractorContractInfo contractor={viewingMetrics} />
              <ContractorPerformanceMetrics contractorId={viewingMetrics.id} />
            </div>
          )}
          
          <DialogFooter>
            <Button onClick={() => setViewingMetrics(null)}>Close</Button>
          </DialogFooter>
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