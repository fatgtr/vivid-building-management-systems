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
import { Building2, MapPin, Home, Users, Pencil, Trash2, Search, MoreVertical, Sparkles, Upload, Eye } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';
import StrataRollUploader from '@/components/buildings/StrataRollUploader';
import SubdivisionPlanExtractor from '@/components/buildings/SubdivisionPlanExtractor';
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

const initialFormState = {
  name: '',
  address: '',
  city: '',
  state: '',
  postal_code: '',
  country: '',
  partner_id: '',
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
  strata_managing_agent_email: '',
  strata_managing_agent_phone: '',
  strata_managing_agent_invoicing_email: '',
  building_compliance_email: '',
  strata_lots: '',
  compliance_reminder_intervals: '90, 60, 30',
  compliance_reminder_recipients: '',
  report_frequency: 'none',
  next_report_date: '',
};

export default function Buildings() {
  const [showDialog, setShowDialog] = useState(false);
  const [editingBuilding, setEditingBuilding] = useState(null);
  const [formData, setFormData] = useState(initialFormState);
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteBuilding, setDeleteBuilding] = useState(null);
  const [autoPopulating, setAutoPopulating] = useState(false);
  const [dialogStep, setDialogStep] = useState('form');
  const [newlyCreatedBuilding, setNewlyCreatedBuilding] = useState(null);
  const [subdivisionPlanFileUrl, setSubdivisionPlanFileUrl] = useState(null);
  const [subdivisionPlanFileName, setSubdivisionPlanFileName] = useState(null);

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

  const { data: partners = [] } = useQuery({
    queryKey: ['partners'],
    queryFn: () => base44.entities.Partner.list(),
  });

  const { data: brandings = [] } = useQuery({
    queryKey: ['partnerBrandings'],
    queryFn: () => base44.entities.PartnerBranding.list(),
  });

  const createMutation = useMutation({
    mutationFn: async (data) => {
      const building = await base44.entities.Building.create(data);
      return building;
    },
    onSuccess: (building) => {
      queryClient.invalidateQueries({ queryKey: ['buildings'] });
      setNewlyCreatedBuilding(building);
      setDialogStep('uploadSubdivisionPlan');
      toast.success('Building created. Now upload Subdivision Plan to extract units.');
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
    mutationFn: async (id) => {
      const response = await base44.functions.invoke('deleteBuildingCascade', { buildingId: id });
      if (!response.data.success) {
        throw new Error(response.data.error || 'Failed to delete building');
      }
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['buildings'] });
      queryClient.invalidateQueries({ queryKey: ['units'] });
      queryClient.invalidateQueries({ queryKey: ['residents'] });
      setDeleteBuilding(null);
      toast.success('Building and all associated data deleted successfully');
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to delete building');
      console.error('Delete error:', error);
    },
  });

  const handleCloseDialog = () => {
    setShowDialog(false);
    setEditingBuilding(null);
    setFormData(initialFormState);
    setDialogStep('form');
    setNewlyCreatedBuilding(null);
    setSubdivisionPlanFileUrl(null);
    setSubdivisionPlanFileName(null);
  };

  const handleSkip = () => {
    handleCloseDialog();
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
      partner_id: building.partner_id || '',
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
      strata_managing_agent_email: building.strata_managing_agent_email || '',
      strata_managing_agent_phone: building.strata_managing_agent_phone || '',
      strata_managing_agent_invoicing_email: building.strata_managing_agent_invoicing_email || '',
      building_compliance_email: building.building_compliance_email || '',
      strata_lots: building.strata_lots || '',
      compliance_reminder_intervals: building.compliance_reminder_intervals ? building.compliance_reminder_intervals.join(', ') : '90, 60, 30',
      compliance_reminder_recipients: building.compliance_reminder_recipients ? building.compliance_reminder_recipients.join(', ') : '',
      report_frequency: building.report_frequency || 'none',
      next_report_date: building.next_report_date || '',
    });
    setShowDialog(true);
  };

  const handleAutoPopulate = async () => {
    if (!formData.strata_plan_number) {
      toast.error('Please enter a strata plan number first');
      return;
    }

    setAutoPopulating(true);
    try {
      const response = await base44.functions.invoke('autoPopulateStrata', { 
        strata_plan_number: formData.strata_plan_number 
      });

      const result = response.data;

      if (result.success && result.data) {
        setFormData({
          ...formData,
          address: result.data.address || formData.address,
          city: result.data.city || formData.city,
          state: result.data.state || formData.state,
          postal_code: result.data.postal_code || formData.postal_code,
          strata_lots: result.data.strata_lots || formData.strata_lots,
          strata_managing_agent_name: result.data.strata_managing_agent_name || formData.strata_managing_agent_name,
          strata_managing_agent_license: result.data.strata_managing_agent_license || formData.strata_managing_agent_license,
        });
        toast.success('Building information auto-populated successfully');
      } else {
        toast.error(result.error || 'Failed to fetch strata information');
      }
    } catch (error) {
      toast.error('Failed to auto-populate information');
    } finally {
      setAutoPopulating(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Auto-populate partner branding fields if a partner is selected
    let finalFormData = { ...formData };
    if (formData.partner_id) {
      const partnerBranding = brandings.find(b => b.partner_id === formData.partner_id);
      if (partnerBranding && !editingBuilding) {
        // Only auto-populate for new buildings, not edits
        finalFormData = {
          ...finalFormData,
          strata_managing_agent_name: partnerBranding.company_name || finalFormData.strata_managing_agent_name,
          building_compliance_email: partnerBranding.email_reply_to || finalFormData.building_compliance_email,
        };
      }
    }
    
    const data = {
      ...finalFormData,
      partner_id: finalFormData.partner_id || null,
      total_units: finalFormData.total_units ? Number(finalFormData.total_units) : null,
      floors: finalFormData.floors ? Number(finalFormData.floors) : null,
      year_built: finalFormData.year_built ? Number(finalFormData.year_built) : null,
      strata_lots: finalFormData.strata_lots ? Number(finalFormData.strata_lots) : null,
      compliance_reminder_intervals: finalFormData.compliance_reminder_intervals 
        ? finalFormData.compliance_reminder_intervals.split(',').map(s => Number(s.trim())).filter(n => !isNaN(n))
        : [90, 60, 30],
      compliance_reminder_recipients: finalFormData.compliance_reminder_recipients 
        ? finalFormData.compliance_reminder_recipients.split(',').map(s => s.trim()).filter(s => s)
        : [],
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
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search buildings..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 w-64"
            />
          </div>
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
                      <DropdownMenuItem asChild>
                        <Link to={createPageUrl('BuildingProfile') + '?id=' + building.id}>
                          <Eye className="mr-2 h-4 w-4" /> View Profile
                        </Link>
                      </DropdownMenuItem>
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
                <div className="space-y-3">
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
                    <div className="space-y-2">
                     <StrataRollUploader 
                       buildingId={building.id}
                       onUnitsCreated={() => queryClient.invalidateQueries({ queryKey: ['units'] })}
                     />
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
            <DialogTitle>
              {editingBuilding ? 'Edit Building' : (
                dialogStep === 'form' ? 'Add New Building - Step 1: Building Details' :
                dialogStep === 'uploadSubdivisionPlan' ? 'Add New Building - Step 2: Upload Subdivision Plan' :
                'Add New Building - Step 3: Upload Strata Roll'
              )}
            </DialogTitle>
          </DialogHeader>
          
          {dialogStep === 'form' && (
            <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <Label htmlFor="partner_id">Managing Partner (Optional)</Label>
                <Select 
                  value={formData.partner_id} 
                  onValueChange={(v) => setFormData({ ...formData, partner_id: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a partner or leave blank" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={null}>No Partner (Manual Setup)</SelectItem>
                    {partners.filter(p => p.status === 'active').map((partner) => (
                      <SelectItem key={partner.id} value={partner.id}>
                        {partner.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-slate-500 mt-1">
                  Select a partner to automatically apply their branding, terms, and company details
                </p>
              </div>
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
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-medium text-slate-900">Strata Information</h4>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAutoPopulate}
                  disabled={!formData.strata_plan_number || autoPopulating}
                  className="text-blue-600 hover:text-blue-700"
                >
                  <Sparkles className="h-4 w-4 mr-2" />
                  {autoPopulating ? 'Fetching...' : 'Auto-Populate'}
                </Button>
              </div>
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
                <div>
                  <Label htmlFor="strata_managing_agent_email">Managing Agent Email</Label>
                  <Input
                    id="strata_managing_agent_email"
                    type="email"
                    value={formData.strata_managing_agent_email}
                    onChange={(e) => setFormData({ ...formData, strata_managing_agent_email: e.target.value })}
                    placeholder="agent@strataco.com.au"
                  />
                </div>
                <div>
                  <Label htmlFor="strata_managing_agent_phone">Managing Agent Phone</Label>
                  <Input
                    id="strata_managing_agent_phone"
                    value={formData.strata_managing_agent_phone}
                    onChange={(e) => setFormData({ ...formData, strata_managing_agent_phone: e.target.value })}
                    placeholder="(02) 1234 5678"
                  />
                </div>
                <div>
                  <Label htmlFor="strata_managing_agent_invoicing_email">Invoicing Email</Label>
                  <Input
                    id="strata_managing_agent_invoicing_email"
                    type="email"
                    value={formData.strata_managing_agent_invoicing_email}
                    onChange={(e) => setFormData({ ...formData, strata_managing_agent_invoicing_email: e.target.value })}
                    placeholder="invoices@strataco.com.au"
                  />
                </div>
                <div>
                  <Label htmlFor="building_compliance_email">Building Compliance Email</Label>
                  <Input
                    id="building_compliance_email"
                    type="email"
                    value={formData.building_compliance_email}
                    onChange={(e) => setFormData({ ...formData, building_compliance_email: e.target.value })}
                    placeholder="building.compliance@example.com"
                  />
                </div>
              </div>
            </div>

            <div className="border-t pt-4">
              <h4 className="font-medium text-slate-900 mb-4">Compliance Reminder Settings</h4>
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <Label htmlFor="compliance_reminder_intervals">Reminder Intervals (days before expiry)</Label>
                  <Input
                    id="compliance_reminder_intervals"
                    value={formData.compliance_reminder_intervals}
                    onChange={(e) => setFormData({ ...formData, compliance_reminder_intervals: e.target.value })}
                    placeholder="e.g., 90, 60, 30"
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    Comma-separated days before expiry to send reminders (e.g., 90, 60, 30)
                  </p>
                </div>
                <div>
                  <Label htmlFor="compliance_reminder_recipients">Additional Reminder Recipients</Label>
                  <Input
                    id="compliance_reminder_recipients"
                    value={formData.compliance_reminder_recipients}
                    onChange={(e) => setFormData({ ...formData, compliance_reminder_recipients: e.target.value })}
                    placeholder="email1@example.com, email2@example.com"
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    Comma-separated email addresses to receive compliance reminders (in addition to admins)
                  </p>
                </div>
              </div>
            </div>

            <div className="border-t pt-4">
              <h4 className="font-medium text-slate-900 mb-4">Automated Reporting</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="report_frequency">Report Frequency</Label>
                  <Select value={formData.report_frequency} onValueChange={(v) => setFormData({ ...formData, report_frequency: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None - Manual Only</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                      <SelectItem value="quarterly">Quarterly</SelectItem>
                      <SelectItem value="semi_annually">Semi-Annually</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-slate-500 mt-1">
                    Automatically generate and email maintenance reports
                  </p>
                </div>
                {formData.report_frequency !== 'none' && (
                  <div>
                    <Label htmlFor="next_report_date">Next Report Date</Label>
                    <Input
                      id="next_report_date"
                      type="date"
                      value={formData.next_report_date}
                      onChange={(e) => setFormData({ ...formData, next_report_date: e.target.value })}
                    />
                    <p className="text-xs text-slate-500 mt-1">
                      When to generate the next report
                    </p>
                  </div>
                )}
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
                {createMutation.isPending || updateMutation.isPending ? 'Saving...' : (editingBuilding ? 'Update' : 'Next')}
              </Button>
            </DialogFooter>
          </form>
          )}

          {dialogStep === 'uploadSubdivisionPlan' && newlyCreatedBuilding && (
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-900">
                  <strong>{newlyCreatedBuilding.name}</strong> has been created successfully.
                </p>
                <p className="text-sm text-blue-700 mt-1">
                  Upload the subdivision plan PDF to automatically extract units, lot numbers, and property details.
                </p>
              </div>

              <div className="border-2 border-dashed border-slate-200 rounded-lg p-8 text-center">
                <input
                  type="file"
                  accept="application/pdf"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    setSubdivisionPlanFileName(file.name);
                    toast.info('Uploading subdivision plan...');
                    const { file_url } = await base44.integrations.Core.UploadFile({ file });
                    setSubdivisionPlanFileUrl(file_url);
                    toast.success('File uploaded successfully!');
                  }}
                  className="hidden"
                  id="subdivision-plan-upload"
                />
                <label htmlFor="subdivision-plan-upload" className="cursor-pointer">
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-16 h-16 rounded-full bg-indigo-100 flex items-center justify-center">
                      <Upload className="h-8 w-8 text-indigo-600" />
                    </div>
                    <div>
                      <p className="font-medium text-slate-700">
                        {subdivisionPlanFileName || 'Click to upload subdivision plan'}
                      </p>
                      <p className="text-sm text-slate-500 mt-1">
                        PDF format only
                      </p>
                    </div>
                  </div>
                </label>
              </div>

              {subdivisionPlanFileUrl && (
                <SubdivisionPlanExtractor
                  buildingId={newlyCreatedBuilding.id}
                  buildingName={newlyCreatedBuilding.name}
                  fileUrl={subdivisionPlanFileUrl}
                  onComplete={() => {
                    queryClient.invalidateQueries({ queryKey: ['units'] });
                    setDialogStep('uploadStrataRoll');
                  }}
                />
              )}
              
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={handleSkip}>Skip & Finish</Button>
              </div>
            </div>
          )}

          {dialogStep === 'uploadStrataRoll' && newlyCreatedBuilding && (
            <div className="space-y-4">
              <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
                <p className="text-sm text-emerald-900">
                  ✓ Subdivision plan processed successfully!
                </p>
                <p className="text-sm text-emerald-700 mt-1">
                  Now upload the Strata Roll PDF to populate resident and owner information.
                </p>
              </div>
              
              <StrataRollUploader
                buildingId={newlyCreatedBuilding.id}
                onUnitsCreated={() => {
                  queryClient.invalidateQueries({ queryKey: ['units'] });
                  queryClient.invalidateQueries({ queryKey: ['residents'] });
                  queryClient.invalidateQueries({ queryKey: ['buildings'] });
                  handleCloseDialog();
                }}
                onSkip={handleSkip}
              />
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteBuilding} onOpenChange={() => setDeleteBuilding(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Building & All Data</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p className="font-semibold text-red-600">
                Are you sure you want to delete "{deleteBuilding?.name}"?
              </p>
              <p className="text-sm">
                This will permanently delete:
              </p>
              <ul className="text-sm list-disc list-inside space-y-1 text-slate-600">
                <li>All units in this building</li>
                <li>All resident information</li>
                <li>All work orders and maintenance schedules</li>
                <li>All documents and announcements</li>
                <li>All inspections and visitor logs</li>
                <li>All amenities and bookings</li>
              </ul>
              <p className="text-sm font-semibold text-red-600 mt-2">
                This action cannot be undone.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteMutation.mutate(deleteBuilding.id)}
              className="bg-red-600 hover:bg-red-700"
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}