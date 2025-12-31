import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Building2, Upload, CheckCircle, Loader2, FileText, X } from 'lucide-react';
import { toast } from 'sonner';

const specialties = [
  'plumbing', 'electrical', 'hvac', 'appliance', 'structural',
  'pest_control', 'cleaning', 'landscaping', 'security', 'general'
];

const documentCategories = [
  { key: 'trade_license', label: 'Trade License' },
  { key: 'workers_comp', label: 'Workers Compensation' },
  { key: 'public_liability', label: 'Public Liability Insurance' },
  { key: 'general_insurance', label: 'General Insurance' },
];

export default function ContractorSignup() {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    company_name: '',
    abn: '',
    acn: '',
    contact_name: '',
    email: '',
    phone: '',
    address: '',
    specialty: [],
    license_number: '',
    hourly_rate: '',
    experience_years: '',
    services_description: '',
  });
  const [documents, setDocuments] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const submitMutation = useMutation({
    mutationFn: async (data) => {
      return base44.functions.invoke('submitContractorApplication', data);
    },
    onSuccess: () => {
      setSubmitted(true);
      toast.success('Application submitted! Check your email to verify.');
    },
    onError: (error) => {
      toast.error('Failed to submit application: ' + error.message);
    }
  });

  const handleDocumentUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setDocuments([...documents, {
        title: file.name,
        category: 'other',
        file_url,
        expiry_date: ''
      }]);
      toast.success('Document uploaded');
    } catch (error) {
      toast.error('Failed to upload document');
    } finally {
      setUploading(false);
    }
  };

  const removeDocument = (index) => {
    setDocuments(documents.filter((_, i) => i !== index));
  };

  const updateDocument = (index, field, value) => {
    const updated = [...documents];
    updated[index][field] = value;
    setDocuments(updated);
  };

  const handleSubmit = () => {
    submitMutation.mutate({
      ...formData,
      hourly_rate: formData.hourly_rate ? parseFloat(formData.hourly_rate) : null,
      experience_years: formData.experience_years ? parseInt(formData.experience_years) : null,
      uploaded_documents: documents
    });
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center p-6">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Application Submitted!</h2>
            <p className="text-slate-600 mb-4">
              We've sent a verification email to <strong>{formData.email}</strong>
            </p>
            <p className="text-sm text-slate-500">
              Please check your inbox and click the verification link to complete your application.
              Once verified, building managers will review your application.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 py-12 px-6">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center mx-auto mb-4 shadow-lg">
            <Building2 className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Contractor Application</h1>
          <p className="text-slate-600">Join our network of trusted service providers</p>
        </div>

        {/* Progress */}
        <div className="flex items-center justify-center gap-2 mb-8">
          <div className={`flex items-center gap-2 ${step >= 1 ? 'text-blue-600' : 'text-slate-400'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 1 ? 'bg-blue-600 text-white' : 'bg-slate-200'}`}>1</div>
            <span className="text-sm font-medium">Details</span>
          </div>
          <div className="w-12 h-0.5 bg-slate-300" />
          <div className={`flex items-center gap-2 ${step >= 2 ? 'text-blue-600' : 'text-slate-400'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 2 ? 'bg-blue-600 text-white' : 'bg-slate-200'}`}>2</div>
            <span className="text-sm font-medium">Documents</span>
          </div>
          <div className="w-12 h-0.5 bg-slate-300" />
          <div className={`flex items-center gap-2 ${step >= 3 ? 'text-blue-600' : 'text-slate-400'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 3 ? 'bg-blue-600 text-white' : 'bg-slate-200'}`}>3</div>
            <span className="text-sm font-medium">Review</span>
          </div>
        </div>

        <Card>
          {step === 1 && (
            <>
              <CardHeader>
                <CardTitle>Company Information</CardTitle>
                <CardDescription>Tell us about your business</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2 col-span-2">
                    <Label>Company Name *</Label>
                    <Input value={formData.company_name} onChange={(e) => setFormData({...formData, company_name: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                    <Label>ABN</Label>
                    <Input value={formData.abn} onChange={(e) => setFormData({...formData, abn: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                    <Label>ACN</Label>
                    <Input value={formData.acn} onChange={(e) => setFormData({...formData, acn: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                    <Label>Contact Name *</Label>
                    <Input value={formData.contact_name} onChange={(e) => setFormData({...formData, contact_name: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                    <Label>Email *</Label>
                    <Input type="email" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                    <Label>Phone *</Label>
                    <Input value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                    <Label>License Number</Label>
                    <Input value={formData.license_number} onChange={(e) => setFormData({...formData, license_number: e.target.value})} />
                  </div>
                  <div className="space-y-2 col-span-2">
                    <Label>Address</Label>
                    <Input value={formData.address} onChange={(e) => setFormData({...formData, address: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                    <Label>Hourly Rate (optional)</Label>
                    <Input type="number" value={formData.hourly_rate} onChange={(e) => setFormData({...formData, hourly_rate: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                    <Label>Years of Experience</Label>
                    <Input type="number" value={formData.experience_years} onChange={(e) => setFormData({...formData, experience_years: e.target.value})} />
                  </div>
                  <div className="space-y-2 col-span-2">
                    <Label>Specialties</Label>
                    <div className="flex flex-wrap gap-2">
                      {specialties.map(spec => (
                        <Badge
                          key={spec}
                          variant={formData.specialty.includes(spec) ? 'default' : 'outline'}
                          className="cursor-pointer"
                          onClick={() => {
                            const newSpec = formData.specialty.includes(spec)
                              ? formData.specialty.filter(s => s !== spec)
                              : [...formData.specialty, spec];
                            setFormData({...formData, specialty: newSpec});
                          }}
                        >
                          {spec}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-2 col-span-2">
                    <Label>Services Description</Label>
                    <Textarea
                      value={formData.services_description}
                      onChange={(e) => setFormData({...formData, services_description: e.target.value})}
                      placeholder="Describe the services you offer..."
                      rows={4}
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-3 pt-4">
                  <Button onClick={() => setStep(2)}>Next</Button>
                </div>
              </CardContent>
            </>
          )}

          {step === 2 && (
            <>
              <CardHeader>
                <CardTitle>Compliance Documents</CardTitle>
                <CardDescription>Upload your licenses and insurance certificates</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-4">
                  {documents.map((doc, idx) => (
                    <Card key={idx} className="p-4">
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4 text-slate-500" />
                            <span className="text-sm font-medium">{doc.title}</span>
                          </div>
                          <Button variant="ghost" size="icon" onClick={() => removeDocument(idx)}>
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <Select value={doc.category} onValueChange={(val) => updateDocument(idx, 'category', val)}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {documentCategories.map(cat => (
                                <SelectItem key={cat.key} value={cat.key}>{cat.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Input
                            type="date"
                            placeholder="Expiry Date"
                            value={doc.expiry_date}
                            onChange={(e) => updateDocument(idx, 'expiry_date', e.target.value)}
                          />
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>

                <div className="border-2 border-dashed border-slate-200 rounded-lg p-8 text-center">
                  <input
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={handleDocumentUpload}
                    className="hidden"
                    id="doc-upload"
                    disabled={uploading}
                  />
                  <label htmlFor="doc-upload" className="cursor-pointer">
                    {uploading ? (
                      <Loader2 className="h-8 w-8 text-blue-600 animate-spin mx-auto mb-2" />
                    ) : (
                      <Upload className="h-8 w-8 text-slate-400 mx-auto mb-2" />
                    )}
                    <p className="text-sm text-slate-600">Click to upload documents</p>
                    <p className="text-xs text-slate-500 mt-1">PDF, JPG, or PNG</p>
                  </label>
                </div>

                <div className="flex justify-between pt-4">
                  <Button variant="outline" onClick={() => setStep(1)}>Back</Button>
                  <Button onClick={() => setStep(3)}>Next</Button>
                </div>
              </CardContent>
            </>
          )}

          {step === 3 && (
            <>
              <CardHeader>
                <CardTitle>Review & Submit</CardTitle>
                <CardDescription>Please review your information before submitting</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div>
                    <h3 className="font-semibold text-slate-900 mb-2">Company Details</h3>
                    <div className="bg-slate-50 rounded-lg p-4 space-y-1 text-sm">
                      <p><strong>Company:</strong> {formData.company_name}</p>
                      <p><strong>Contact:</strong> {formData.contact_name}</p>
                      <p><strong>Email:</strong> {formData.email}</p>
                      <p><strong>Phone:</strong> {formData.phone}</p>
                      {formData.specialty.length > 0 && (
                        <p><strong>Specialties:</strong> {formData.specialty.join(', ')}</p>
                      )}
                    </div>
                  </div>

                  <div>
                    <h3 className="font-semibold text-slate-900 mb-2">Documents ({documents.length})</h3>
                    <div className="space-y-2">
                      {documents.map((doc, idx) => (
                        <div key={idx} className="flex items-center gap-2 text-sm bg-slate-50 rounded-lg p-3">
                          <FileText className="h-4 w-4 text-slate-500" />
                          <span>{doc.title}</span>
                          <Badge variant="outline" className="ml-auto">
                            {documentCategories.find(c => c.key === doc.category)?.label || doc.category}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex justify-between pt-4">
                  <Button variant="outline" onClick={() => setStep(2)}>Back</Button>
                  <Button 
                    onClick={handleSubmit} 
                    disabled={submitMutation.isPending}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    {submitMutation.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Submitting...
                      </>
                    ) : (
                      'Submit Application'
                    )}
                  </Button>
                </div>
              </CardContent>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}