import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { 
  Wrench, Building2, CheckCircle2, Upload, X, AlertCircle, 
  Phone, Mail, Home, ArrowRight, Loader2, Camera
} from 'lucide-react';
import VividLogo from '@/components/marketing/VividLogo';

const CATEGORIES = [
  { value: 'plumbing', label: 'Plumbing (leaks, blocked drains, hot water)' },
  { value: 'electrical', label: 'Electrical (power, lights, outlets)' },
  { value: 'hvac', label: 'Air Conditioning / Heating' },
  { value: 'structural', label: 'Structural / Building Fabric' },
  { value: 'fire_life_safety', label: 'Fire & Safety Equipment' },
  { value: 'lift', label: 'Lift / Elevator' },
  { value: 'common_area', label: 'Common Area (lobby, corridors, car park)' },
  { value: 'pest', label: 'Pest Control' },
  { value: 'security', label: 'Security / Access Control' },
  { value: 'cleaning', label: 'Cleaning' },
  { value: 'noise', label: 'Noise / Nuisance' },
  { value: 'other', label: 'Other' },
];

const PRIORITIES = [
  { value: 'low', label: 'Low – Minor issue, no immediate risk', color: 'bg-slate-100 text-slate-700' },
  { value: 'medium', label: 'Medium – Needs attention soon', color: 'bg-amber-100 text-amber-700' },
  { value: 'high', label: 'High – Significant impact on daily life', color: 'bg-orange-100 text-orange-700' },
  { value: 'urgent', label: 'Urgent – Safety risk or flooding', color: 'bg-red-100 text-red-700' },
];

export default function MaintenanceRequest() {
  const [buildings, setBuildings] = useState([]);
  const [step, setStep] = useState(1); // 1=form, 2=success
  const [submitting, setSubmitting] = useState(false);
  const [uploadingPhotos, setUploadingPhotos] = useState(false);
  const [trackingId, setTrackingId] = useState(null);

  const [form, setForm] = useState({
    building_id: '',
    unit_number: '',
    reporter_name: '',
    reporter_email: '',
    reporter_phone: '',
    main_category: '',
    description: '',
    priority: 'medium',
    permission_to_enter: false,
    entry_instructions: '',
    photos: [],
  });

  const [errors, setErrors] = useState({});

  useEffect(() => {
    // Check URL for building_id param (for building-specific links)
    const params = new URLSearchParams(window.location.search);
    const buildingId = params.get('building_id');

    base44.entities.Building.list().then(data => {
      setBuildings(data.filter(b => b.status === 'active'));
      if (buildingId) {
        setForm(f => ({ ...f, building_id: buildingId }));
      } else if (data.length === 1) {
        setForm(f => ({ ...f, building_id: data[0].id }));
      }
    });
  }, []);

  const validate = () => {
    const e = {};
    if (!form.building_id) e.building_id = 'Please select a building';
    if (!form.unit_number.trim()) e.unit_number = 'Unit number is required';
    if (!form.reporter_name.trim()) e.reporter_name = 'Your name is required';
    if (!form.reporter_email.trim()) e.reporter_email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(form.reporter_email)) e.reporter_email = 'Invalid email address';
    if (!form.main_category) e.main_category = 'Please select a category';
    if (!form.description.trim()) e.description = 'Please describe the issue';
    else if (form.description.trim().length < 20) e.description = 'Please provide more detail (at least 20 characters)';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handlePhotoUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    setUploadingPhotos(true);
    const uploaded = [];
    for (const file of files) {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      uploaded.push(file_url);
    }
    setForm(f => ({ ...f, photos: [...f.photos, ...uploaded] }));
    setUploadingPhotos(false);
  };

  const removePhoto = (idx) => {
    setForm(f => ({ ...f, photos: f.photos.filter((_, i) => i !== idx) }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setSubmitting(true);

    // Map category to main_category enum
    const categoryMap = {
      plumbing: 'hydraulic_plumbing',
      electrical: 'electrical_services',
      hvac: 'mechanical_services',
      structural: 'core_building_structure',
      fire_life_safety: 'fire_life_safety',
      lift: 'vertical_transportation',
      common_area: 'common_area_fixtures_fittings',
      pest: 'external_grounds',
      security: 'security_access_control',
      cleaning: 'common_area_fixtures_fittings',
      noise: 'residential_specific',
      other: 'compliance_safety',
    };

    const workOrder = await base44.entities.WorkOrder.create({
      building_id: form.building_id,
      title: `${CATEGORIES.find(c => c.value === form.main_category)?.label?.split('(')[0].trim()} – Unit ${form.unit_number}`,
      description: form.description,
      main_category: categoryMap[form.main_category] || 'compliance_safety',
      subcategory: form.main_category,
      priority: form.priority,
      status: 'open',
      reported_by: form.reporter_email,
      reported_by_name: form.reporter_name,
      is_common_area: false,
      permission_to_enter: form.permission_to_enter,
      entry_instructions: form.entry_instructions,
      photos: form.photos,
      notes: `Reported by: ${form.reporter_name}\nEmail: ${form.reporter_email}\nPhone: ${form.reporter_phone}\nUnit: ${form.unit_number}\nSource: Public maintenance request form`,
      source_type: 'resident_report',
    });

    setTrackingId(workOrder.id);
    setStep(2);
    setSubmitting(false);
  };

  const selectedBuilding = buildings.find(b => b.id === form.building_id);

  if (step === 2) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex flex-col">
        <Header />
        <div className="flex-1 flex items-center justify-center p-4">
          <Card className="max-w-lg w-full border-2 border-green-200 shadow-xl">
            <CardContent className="p-10 text-center">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle2 className="h-10 w-10 text-green-600" />
              </div>
              <h2 className="text-2xl font-bold text-slate-900 mb-3">Request Submitted!</h2>
              <p className="text-slate-600 mb-6">
                Your maintenance request has been logged and our team has been notified. 
                You can track the status of your request using the reference below.
              </p>

              <div className="bg-slate-50 rounded-xl p-4 mb-6 border border-slate-200">
                <p className="text-xs text-slate-500 mb-1 uppercase tracking-wider">Reference Number</p>
                <p className="font-mono text-lg font-bold text-[#00529F]">{trackingId?.slice(-8).toUpperCase()}</p>
                <p className="text-xs text-slate-400 mt-1">Keep this for your records</p>
              </div>

              <div className="space-y-3">
                <Button
                  className="w-full bg-[#00529F] hover:bg-[#003d75] text-white"
                  onClick={() => window.location.href = `/MaintenanceRequestTracker?id=${trackingId}`}
                >
                  Track My Request <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => { setStep(1); setForm(f => ({ ...f, description: '', photos: [], main_category: '', unit_number: '', priority: 'medium', permission_to_enter: false, entry_instructions: '' })); }}
                >
                  Submit Another Request
                </Button>
              </div>

              <p className="mt-6 text-sm text-slate-500">
                A confirmation has been noted. If urgent, please also call building management directly.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex flex-col">
      <Header />

      <div className="flex-1 max-w-2xl mx-auto w-full px-4 py-8">
        {/* Intro */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#00529F]/10 rounded-full mb-4">
            <Wrench className="h-4 w-4 text-[#00529F]" />
            <span className="text-[#00529F] font-semibold text-sm">Maintenance Request</span>
          </div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Report a Maintenance Issue</h1>
          <p className="text-slate-600">Fill in the details below and our team will be in touch shortly.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Building & Unit */}
          <Card className="border border-slate-200 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Building2 className="h-4 w-4 text-[#00529F]" />
                Property Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {buildings.length > 1 && (
                <div>
                  <Label>Building <span className="text-red-500">*</span></Label>
                  <Select value={form.building_id} onValueChange={v => setForm(f => ({ ...f, building_id: v }))}>
                    <SelectTrigger className={errors.building_id ? 'border-red-400' : ''}>
                      <SelectValue placeholder="Select your building" />
                    </SelectTrigger>
                    <SelectContent>
                      {buildings.map(b => (
                        <SelectItem key={b.id} value={b.id}>{b.name} – {b.address}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.building_id && <p className="text-red-500 text-xs mt-1">{errors.building_id}</p>}
                </div>
              )}
              {buildings.length === 1 && form.building_id && (
                <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg">
                  <Building2 className="h-4 w-4 text-[#00529F]" />
                  <span className="text-sm font-medium text-[#00529F]">{selectedBuilding?.name}</span>
                  <span className="text-sm text-slate-500">– {selectedBuilding?.address}</span>
                </div>
              )}
              <div>
                <Label>Unit Number <span className="text-red-500">*</span></Label>
                <div className="relative">
                  <Home className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    className={`pl-9 ${errors.unit_number ? 'border-red-400' : ''}`}
                    placeholder="e.g. 12, 3B, PH01"
                    value={form.unit_number}
                    onChange={e => setForm(f => ({ ...f, unit_number: e.target.value }))}
                  />
                </div>
                {errors.unit_number && <p className="text-red-500 text-xs mt-1">{errors.unit_number}</p>}
              </div>
            </CardContent>
          </Card>

          {/* Contact Info */}
          <Card className="border border-slate-200 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Mail className="h-4 w-4 text-[#00529F]" />
                Your Contact Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Full Name <span className="text-red-500">*</span></Label>
                <Input
                  className={errors.reporter_name ? 'border-red-400' : ''}
                  placeholder="Your full name"
                  value={form.reporter_name}
                  onChange={e => setForm(f => ({ ...f, reporter_name: e.target.value }))}
                />
                {errors.reporter_name && <p className="text-red-500 text-xs mt-1">{errors.reporter_name}</p>}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label>Email Address <span className="text-red-500">*</span></Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input
                      className={`pl-9 ${errors.reporter_email ? 'border-red-400' : ''}`}
                      type="email"
                      placeholder="you@example.com"
                      value={form.reporter_email}
                      onChange={e => setForm(f => ({ ...f, reporter_email: e.target.value }))}
                    />
                  </div>
                  {errors.reporter_email && <p className="text-red-500 text-xs mt-1">{errors.reporter_email}</p>}
                </div>
                <div>
                  <Label>Phone Number</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input
                      className="pl-9"
                      type="tel"
                      placeholder="04XX XXX XXX"
                      value={form.reporter_phone}
                      onChange={e => setForm(f => ({ ...f, reporter_phone: e.target.value }))}
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Issue Details */}
          <Card className="border border-slate-200 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Wrench className="h-4 w-4 text-[#00529F]" />
                Issue Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Category <span className="text-red-500">*</span></Label>
                <Select value={form.main_category} onValueChange={v => setForm(f => ({ ...f, main_category: v }))}>
                  <SelectTrigger className={errors.main_category ? 'border-red-400' : ''}>
                    <SelectValue placeholder="What type of issue is this?" />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map(c => (
                      <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.main_category && <p className="text-red-500 text-xs mt-1">{errors.main_category}</p>}
              </div>

              <div>
                <Label>Priority Level <span className="text-red-500">*</span></Label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-1">
                  {PRIORITIES.map(p => (
                    <button
                      key={p.value}
                      type="button"
                      onClick={() => setForm(f => ({ ...f, priority: p.value }))}
                      className={`text-left p-3 rounded-lg border-2 transition-all text-sm ${
                        form.priority === p.value
                          ? 'border-[#00529F] bg-[#00529F]/5'
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <Badge className={`${p.color} text-xs mb-1 font-medium`}>{p.value.charAt(0).toUpperCase() + p.value.slice(1)}</Badge>
                      <p className="text-slate-600 text-xs leading-tight">{p.label.split('–')[1]?.trim()}</p>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <Label>Description <span className="text-red-500">*</span></Label>
                <Textarea
                  className={`min-h-[120px] ${errors.description ? 'border-red-400' : ''}`}
                  placeholder="Please describe the issue in detail. Include when it started, the exact location, and how it affects you."
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                />
                <div className="flex justify-between mt-1">
                  {errors.description ? (
                    <p className="text-red-500 text-xs">{errors.description}</p>
                  ) : <span />}
                  <p className="text-xs text-slate-400">{form.description.length} chars</p>
                </div>
              </div>

              {/* Photo Upload */}
              <div>
                <Label>Photos (optional)</Label>
                <div className="mt-1">
                  <label className="flex items-center gap-2 cursor-pointer border-2 border-dashed border-slate-300 rounded-lg p-4 hover:border-[#00529F] transition-colors">
                    <input type="file" accept="image/*" multiple className="hidden" onChange={handlePhotoUpload} />
                    {uploadingPhotos ? (
                      <><Loader2 className="h-5 w-5 text-[#00529F] animate-spin" /><span className="text-sm text-slate-600">Uploading...</span></>
                    ) : (
                      <><Camera className="h-5 w-5 text-slate-400" /><span className="text-sm text-slate-600">Click to upload photos of the issue</span></>
                    )}
                  </label>
                  {form.photos.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {form.photos.map((url, idx) => (
                        <div key={idx} className="relative">
                          <img src={url} alt="" className="w-20 h-20 object-cover rounded-lg border border-slate-200" />
                          <button
                            type="button"
                            onClick={() => removePhoto(idx)}
                            className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Access */}
          <Card className="border border-slate-200 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-[#00529F]" />
                Access Permission
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  id="pto"
                  checked={form.permission_to_enter}
                  onChange={e => setForm(f => ({ ...f, permission_to_enter: e.target.checked }))}
                  className="mt-1 h-4 w-4 rounded border-slate-300 text-[#00529F]"
                />
                <label htmlFor="pto" className="text-sm text-slate-700 cursor-pointer">
                  I give permission for authorised maintenance staff to enter my unit to address this issue if I am not home.
                </label>
              </div>
              {form.permission_to_enter && (
                <div>
                  <Label>Entry Instructions (optional)</Label>
                  <Input
                    placeholder="e.g. Key under mat, call before entering, dog is home"
                    value={form.entry_instructions}
                    onChange={e => setForm(f => ({ ...f, entry_instructions: e.target.value }))}
                  />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Urgent Notice */}
          {form.priority === 'urgent' && (
            <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-xl">
              <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-red-800 text-sm">Urgent Issue Selected</p>
                <p className="text-red-700 text-sm mt-0.5">If there is a risk to safety or serious flooding, please also call building management or emergency services immediately. Do not wait for this form to be processed.</p>
              </div>
            </div>
          )}

          <Button
            type="submit"
            size="lg"
            disabled={submitting || uploadingPhotos}
            className="w-full bg-[#00529F] hover:bg-[#003d75] text-white text-base py-6"
          >
            {submitting ? (
              <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Submitting...</>
            ) : (
              <>Submit Maintenance Request <ArrowRight className="ml-2 h-5 w-5" /></>
            )}
          </Button>

          <p className="text-center text-xs text-slate-500">
            Your information is handled securely and will only be used to resolve your maintenance request.
          </p>
        </form>
      </div>

      <footer className="py-6 text-center text-sm text-slate-400 border-t border-slate-200 bg-white">
        <span>Powered by </span>
        <span className="font-semibold text-[#00529F]">Vivid BMS</span>
        <span> · Secure resident maintenance portal</span>
      </footer>
    </div>
  );
}

function Header() {
  return (
    <header className="bg-white border-b border-slate-200 shadow-sm sticky top-0 z-10">
      <div className="max-w-2xl mx-auto px-4 h-16 flex items-center justify-between">
        <VividLogo />
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <Wrench className="h-4 w-4" />
          <span className="hidden sm:inline">Resident Maintenance Portal</span>
        </div>
      </div>
    </header>
  );
}