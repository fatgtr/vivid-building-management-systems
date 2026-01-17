import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import ComplianceDocumentUploader from './ComplianceDocumentUploader';
import { 
  Shield, 
  AlertCircle, 
  CheckCircle2, 
  Clock, 
  Plus,
  Edit,
  Key,
  Phone,
  MapPin,
  AlertTriangle,
  Brain
} from 'lucide-react';
import { format, isPast, differenceInDays } from 'date-fns';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const COMPLIANCE_TYPES = [
  { value: 'annual_fire_safety_statement', label: 'Annual Fire Safety Statement' },
  { value: 'pool_registration_certificate', label: 'Pool Registration Certificate' },
  { value: 'lift_registration_certificate', label: 'Lift Registration Certificate' },
  { value: 'emergency_evacuation_assistance_audit', label: 'Emergency Evacuation Assistance Audit' },
  { value: 'cooling_tower_inspection_program', label: 'Cooling Tower Inspection Program & Risk Management Plan' },
  { value: 'reduced_pressure_zone_rpz', label: 'Reduced Pressure Zone (RPZ)' },
  { value: 'roof_height_safety_systems', label: 'Roof/Height Safety Systems' },
  { value: 'gym_equipment_safety_check', label: 'Gym Equipment Safety Check' },
  { value: 'thermostatic_mixing_valves_tmv', label: 'Thermostatic Mixing Valves (TMV)' },
  { value: 'thermal_scanning_switchboard', label: 'Thermal Scanning of Switchboard' },
  { value: 'emergency_planning_evac', label: 'Emergency Planning (EVAC)' },
  { value: 'fire_storage_tank_drain_clean', label: 'Fire Storage Tank Drain and Clean (AS1851)' },
];

export default function ComplianceTab({ building }) {
  const queryClient = useQueryClient();
  const [showDialog, setShowDialog] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const [showEmergencyDialog, setShowEmergencyDialog] = useState(false);
  const [emergencyData, setEmergencyData] = useState({
    after_hours_lockbox_available: building.after_hours_lockbox_available || false,
    after_hours_lockbox_code: building.after_hours_lockbox_code || '',
    after_hours_lockbox_location: building.after_hours_lockbox_location || '',
    after_hours_lockbox_keys: building.after_hours_lockbox_keys || '',
    emergency_plumber_name: building.emergency_plumber_name || '',
    emergency_plumber_phone: building.emergency_plumber_phone || '',
    emergency_electrician_name: building.emergency_electrician_name || '',
    emergency_electrician_phone: building.emergency_electrician_phone || '',
    emergency_fire_technician_name: building.emergency_fire_technician_name || '',
    emergency_fire_technician_phone: building.emergency_fire_technician_phone || '',
  });

  const [formData, setFormData] = useState({
    compliance_type: '',
    inspection_date: '',
    expiry_date: '',
    next_due_date: '',
    status: 'pending',
    certificate_number: '',
    certificate_url: '',
    inspector_name: '',
    inspector_company: '',
    findings: '',
    recommendations: '',
  });

  const { data: complianceRecords = [] } = useQuery({
    queryKey: ['complianceRecords', building.id],
    queryFn: () => base44.entities.ComplianceRecord.filter({ building_id: building.id }),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.ComplianceRecord.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['complianceRecords'] });
      setShowDialog(false);
      setEditingRecord(null);
      resetForm();
      toast.success('Compliance record created');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.ComplianceRecord.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['complianceRecords'] });
      setShowDialog(false);
      setEditingRecord(null);
      resetForm();
      toast.success('Compliance record updated');
    },
  });

  const updateBuildingMutation = useMutation({
    mutationFn: (data) => base44.entities.Building.update(building.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['building'] });
      setShowEmergencyDialog(false);
      toast.success('Emergency information updated');
    },
  });

  const resetForm = () => {
    setFormData({
      compliance_type: '',
      inspection_date: '',
      expiry_date: '',
      next_due_date: '',
      status: 'pending',
      certificate_number: '',
      certificate_url: '',
      inspector_name: '',
      inspector_company: '',
      findings: '',
      recommendations: '',
    });
  };

  const handleEdit = (record) => {
    setEditingRecord(record);
    setFormData({
      compliance_type: record.compliance_type,
      inspection_date: record.inspection_date || '',
      expiry_date: record.expiry_date || '',
      next_due_date: record.next_due_date || '',
      status: record.status,
      certificate_number: record.certificate_number || '',
      certificate_url: record.certificate_url || '',
      inspector_name: record.inspector_name || '',
      inspector_company: record.inspector_company || '',
      findings: record.findings || '',
      recommendations: record.recommendations || '',
    });
    setShowDialog(true);
  };

  const handleDataExtracted = (extractedData) => {
    // Pre-fill form with AI extracted data
    setFormData({
      compliance_type: extractedData.compliance_type || '',
      inspection_date: extractedData.inspection_date || '',
      expiry_date: extractedData.expiry_date || '',
      next_due_date: extractedData.next_due_date || '',
      status: extractedData.status || 'pending',
      certificate_number: extractedData.certificate_number || '',
      certificate_url: extractedData.certificate_url || '',
      inspector_name: extractedData.inspector_name || '',
      inspector_company: extractedData.inspector_company || '',
      findings: extractedData.findings || '',
      recommendations: extractedData.recommendations || '',
    });
    
    // If asset was linked, we could store it for the form
    // For now, the building_id is already set in the submit handler
    
    setShowDialog(true);
    toast.success('Form pre-filled with extracted data. Review and save.');
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const submitData = { ...formData, building_id: building.id };
    
    if (editingRecord) {
      updateMutation.mutate({ id: editingRecord.id, data: submitData });
    } else {
      createMutation.mutate(submitData);
    }
  };

  const handleSaveEmergency = () => {
    updateBuildingMutation.mutate(emergencyData);
  };

  const getStatusColor = (record) => {
    if (record.status === 'overdue') return 'bg-red-100 text-red-700 border-red-200';
    if (record.expiry_date && isPast(new Date(record.expiry_date))) return 'bg-red-100 text-red-700 border-red-200';
    if (record.next_due_date) {
      const daysUntilDue = differenceInDays(new Date(record.next_due_date), new Date());
      if (daysUntilDue < 30) return 'bg-orange-100 text-orange-700 border-orange-200';
      if (daysUntilDue < 90) return 'bg-yellow-100 text-yellow-700 border-yellow-200';
    }
    if (record.status === 'compliant') return 'bg-emerald-100 text-emerald-700 border-emerald-200';
    return 'bg-slate-100 text-slate-700 border-slate-200';
  };

  const getComplianceLabel = (type) => {
    return COMPLIANCE_TYPES.find(t => t.value === type)?.label || type.replace(/_/g, ' ');
  };

  // Group records by compliance type to show latest for each
  const latestRecordsByType = COMPLIANCE_TYPES.reduce((acc, type) => {
    const records = complianceRecords.filter(r => r.compliance_type === type.value);
    if (records.length > 0) {
      acc[type.value] = records.sort((a, b) => 
        new Date(b.inspection_date) - new Date(a.inspection_date)
      )[0];
    }
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      {/* AI Document Scanner */}
      <ComplianceDocumentUploader 
        buildingId={building.id} 
        onDataExtracted={handleDataExtracted}
      />

      {/* After-Hours Emergency Section */}
      <Card className="border-orange-200 bg-orange-50/30">
        <CardHeader className="flex-row items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-orange-100 flex items-center justify-center">
              <AlertTriangle className="h-5 w-5 text-orange-600" />
            </div>
            <CardTitle className="text-lg">After-Hour Emergency</CardTitle>
          </div>
          <Button variant="outline" size="sm" onClick={() => setShowEmergencyDialog(true)}>
            <Edit className="h-4 w-4 mr-2" />Edit
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Key className="h-4 w-4 text-orange-600" />
                <p className="font-semibold">Lockbox Available:</p>
                <Badge variant={building.after_hours_lockbox_available ? 'default' : 'secondary'}>
                  {building.after_hours_lockbox_available ? 'Yes' : 'No'}
                </Badge>
              </div>
              {building.after_hours_lockbox_available && (
                <>
                  {building.after_hours_lockbox_location && (
                    <div className="flex items-start gap-2 pl-6">
                      <MapPin className="h-4 w-4 text-slate-500 mt-0.5" />
                      <div>
                        <p className="text-xs text-slate-500">Location</p>
                        <p className="text-sm font-medium">{building.after_hours_lockbox_location}</p>
                      </div>
                    </div>
                  )}
                  {building.after_hours_lockbox_code && (
                    <div className="flex items-start gap-2 pl-6">
                      <Key className="h-4 w-4 text-slate-500 mt-0.5" />
                      <div>
                        <p className="text-xs text-slate-500">Code</p>
                        <p className="text-sm font-mono font-medium">{building.after_hours_lockbox_code}</p>
                      </div>
                    </div>
                  )}
                  {building.after_hours_lockbox_keys && (
                    <div className="flex items-start gap-2 pl-6">
                      <Key className="h-4 w-4 text-slate-500 mt-0.5" />
                      <div>
                        <p className="text-xs text-slate-500">Keys Available</p>
                        <p className="text-sm">{building.after_hours_lockbox_keys}</p>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            <div className="space-y-3">
              <p className="font-semibold flex items-center gap-2">
                <Phone className="h-4 w-4 text-orange-600" />
                Emergency Contacts
              </p>
              {building.emergency_plumber_name && (
                <div className="pl-6">
                  <p className="text-xs text-slate-500">Plumber</p>
                  <p className="text-sm font-medium">{building.emergency_plumber_name}</p>
                  {building.emergency_plumber_phone && (
                    <a href={`tel:${building.emergency_plumber_phone}`} className="text-sm text-blue-600 hover:underline">
                      {building.emergency_plumber_phone}
                    </a>
                  )}
                </div>
              )}
              {building.emergency_electrician_name && (
                <div className="pl-6">
                  <p className="text-xs text-slate-500">Electrician</p>
                  <p className="text-sm font-medium">{building.emergency_electrician_name}</p>
                  {building.emergency_electrician_phone && (
                    <a href={`tel:${building.emergency_electrician_phone}`} className="text-sm text-blue-600 hover:underline">
                      {building.emergency_electrician_phone}
                    </a>
                  )}
                </div>
              )}
              {building.emergency_fire_technician_name && (
                <div className="pl-6">
                  <p className="text-xs text-slate-500">Fire Technician</p>
                  <p className="text-sm font-medium">{building.emergency_fire_technician_name}</p>
                  {building.emergency_fire_technician_phone && (
                    <a href={`tel:${building.emergency_fire_technician_phone}`} className="text-sm text-blue-600 hover:underline">
                      {building.emergency_fire_technician_phone}
                    </a>
                  )}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Compliance Items */}
      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center">
              <Shield className="h-5 w-5 text-blue-600" />
            </div>
            <CardTitle className="text-lg">Compliance Items</CardTitle>
          </div>
          <Button onClick={() => setShowDialog(true)} className="bg-blue-600 hover:bg-blue-700">
            <Plus className="h-4 w-4 mr-2" />Add Record
          </Button>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {COMPLIANCE_TYPES.map((type) => {
              const record = latestRecordsByType[type.value];
              const isOverdue = record?.next_due_date && isPast(new Date(record.next_due_date));
              const daysUntilDue = record?.next_due_date ? differenceInDays(new Date(record.next_due_date), new Date()) : null;
              const isAIDetected = record?.findings && record.findings.includes('AI-processed');

              return (
                <div
                  key={type.value}
                  className={cn(
                    "flex items-center justify-between p-4 rounded-lg border-2 transition-all",
                    record ? "bg-white hover:shadow-md" : "bg-slate-50 border-slate-200"
                  )}
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-slate-900">{type.label}</p>
                      {isAIDetected && (
                        <Badge className="bg-blue-100 text-blue-700 border-blue-200 text-xs">
                          <Brain className="h-3 w-3 mr-1" />
                          AI Scanned
                        </Badge>
                      )}
                    </div>
                    {record && (
                      <div className="flex items-center gap-3 mt-1 flex-wrap">
                        {record.inspection_date && (
                          <span className="text-xs text-slate-500">
                            Inspected: {format(new Date(record.inspection_date), 'MMM d, yyyy')}
                          </span>
                        )}
                        {record.next_due_date && (
                          <span className={cn(
                            "text-xs font-medium",
                            isOverdue ? "text-red-600" : daysUntilDue < 30 ? "text-orange-600" : "text-slate-500"
                          )}>
                            {isOverdue ? 'OVERDUE' : `Due: ${format(new Date(record.next_due_date), 'MMM d, yyyy')}`}
                          </span>
                        )}
                        {record.certificate_number && (
                          <Badge variant="outline" className="text-xs">
                            Cert: {record.certificate_number}
                          </Badge>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {record ? (
                      <>
                        <Badge className={getStatusColor(record)} variant="outline">
                          {isOverdue ? (
                            <>
                              <AlertCircle className="h-3 w-3 mr-1" />
                              Overdue
                            </>
                          ) : record.status === 'compliant' ? (
                            <>
                              <CheckCircle2 className="h-3 w-3 mr-1" />
                              Compliant
                            </>
                          ) : (
                            <>
                              <Clock className="h-3 w-3 mr-1" />
                              {record.status}
                            </>
                          )}
                        </Badge>
                        <Button variant="ghost" size="sm" onClick={() => handleEdit(record)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                      </>
                    ) : (
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => {
                          setFormData({ ...formData, compliance_type: type.value });
                          setShowDialog(true);
                        }}
                      >
                        <Plus className="h-4 w-4 mr-1" />Add
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Compliance Record Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingRecord ? 'Edit' : 'Add'} Compliance Record</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label>Compliance Type *</Label>
                <Select value={formData.compliance_type} onValueChange={(v) => setFormData({ ...formData, compliance_type: v })} required>
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    {COMPLIANCE_TYPES.map(type => (
                      <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Inspection Date *</Label>
                <Input type="date" value={formData.inspection_date} onChange={(e) => setFormData({ ...formData, inspection_date: e.target.value })} required />
              </div>

              <div>
                <Label>Expiry Date</Label>
                <Input type="date" value={formData.expiry_date} onChange={(e) => setFormData({ ...formData, expiry_date: e.target.value })} />
              </div>

              <div>
                <Label>Next Due Date</Label>
                <Input type="date" value={formData.next_due_date} onChange={(e) => setFormData({ ...formData, next_due_date: e.target.value })} />
              </div>

              <div>
                <Label>Status</Label>
                <Select value={formData.status} onValueChange={(v) => setFormData({ ...formData, status: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="compliant">Compliant</SelectItem>
                    <SelectItem value="non_compliant">Non-Compliant</SelectItem>
                    <SelectItem value="overdue">Overdue</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Certificate Number</Label>
                <Input value={formData.certificate_number} onChange={(e) => setFormData({ ...formData, certificate_number: e.target.value })} />
              </div>

              <div>
                <Label>Inspector Name</Label>
                <Input value={formData.inspector_name} onChange={(e) => setFormData({ ...formData, inspector_name: e.target.value })} />
              </div>

              <div>
                <Label>Inspector Company</Label>
                <Input value={formData.inspector_company} onChange={(e) => setFormData({ ...formData, inspector_company: e.target.value })} />
              </div>

              <div className="col-span-2">
                <Label>Certificate URL</Label>
                <Input value={formData.certificate_url} onChange={(e) => setFormData({ ...formData, certificate_url: e.target.value })} placeholder="https://..." />
              </div>

              <div className="col-span-2">
                <Label>Findings</Label>
                <Textarea value={formData.findings} onChange={(e) => setFormData({ ...formData, findings: e.target.value })} rows={3} />
              </div>

              <div className="col-span-2">
                <Label>Recommendations</Label>
                <Textarea value={formData.recommendations} onChange={(e) => setFormData({ ...formData, recommendations: e.target.value })} rows={3} />
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => { setShowDialog(false); setEditingRecord(null); resetForm(); }}>
                Cancel
              </Button>
              <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                {editingRecord ? 'Update' : 'Create'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Emergency Information Dialog */}
      <Dialog open={showEmergencyDialog} onOpenChange={setShowEmergencyDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit After-Hours Emergency Information</DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
            <div className="space-y-4">
              <h3 className="font-semibold flex items-center gap-2">
                <Key className="h-4 w-4" />
                Lockbox Information
              </h3>
              <div className="space-y-2">
                <Label>Is there an after-hour lockbox available?</Label>
                <Select 
                  value={emergencyData.after_hours_lockbox_available ? 'yes' : 'no'} 
                  onValueChange={(v) => setEmergencyData({ ...emergencyData, after_hours_lockbox_available: v === 'yes' })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="yes">Yes</SelectItem>
                    <SelectItem value="no">No</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {emergencyData.after_hours_lockbox_available && (
                <>
                  <div className="space-y-2">
                    <Label>Lockbox Code</Label>
                    <Input value={emergencyData.after_hours_lockbox_code} onChange={(e) => setEmergencyData({ ...emergencyData, after_hours_lockbox_code: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Lockbox Location</Label>
                    <Input value={emergencyData.after_hours_lockbox_location} onChange={(e) => setEmergencyData({ ...emergencyData, after_hours_lockbox_location: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Keys Available in Lockbox</Label>
                    <Textarea value={emergencyData.after_hours_lockbox_keys} onChange={(e) => setEmergencyData({ ...emergencyData, after_hours_lockbox_keys: e.target.value })} rows={2} />
                  </div>
                </>
              )}
            </div>

            <div className="space-y-4">
              <h3 className="font-semibold flex items-center gap-2">
                <Phone className="h-4 w-4" />
                Emergency Contact Details
              </h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Plumber Name</Label>
                  <Input value={emergencyData.emergency_plumber_name} onChange={(e) => setEmergencyData({ ...emergencyData, emergency_plumber_name: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Plumber Phone</Label>
                  <Input value={emergencyData.emergency_plumber_phone} onChange={(e) => setEmergencyData({ ...emergencyData, emergency_plumber_phone: e.target.value })} />
                </div>

                <div className="space-y-2">
                  <Label>Electrician Name</Label>
                  <Input value={emergencyData.emergency_electrician_name} onChange={(e) => setEmergencyData({ ...emergencyData, emergency_electrician_name: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Electrician Phone</Label>
                  <Input value={emergencyData.emergency_electrician_phone} onChange={(e) => setEmergencyData({ ...emergencyData, emergency_electrician_phone: e.target.value })} />
                </div>

                <div className="space-y-2">
                  <Label>Fire Technician Name</Label>
                  <Input value={emergencyData.emergency_fire_technician_name} onChange={(e) => setEmergencyData({ ...emergencyData, emergency_fire_technician_name: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Fire Technician Phone</Label>
                  <Input value={emergencyData.emergency_fire_technician_phone} onChange={(e) => setEmergencyData({ ...emergencyData, emergency_fire_technician_phone: e.target.value })} />
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEmergencyDialog(false)}>Cancel</Button>
            <Button onClick={handleSaveEmergency} disabled={updateBuildingMutation.isPending}>
              {updateBuildingMutation.isPending ? 'Saving...' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}