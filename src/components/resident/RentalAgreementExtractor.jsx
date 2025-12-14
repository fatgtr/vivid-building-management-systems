import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, FileText, Sparkles, Loader2, Check, AlertCircle, Save } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

export default function RentalAgreementExtractor({ residentId, buildingId, unitId, onComplete }) {
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [extractedData, setExtractedData] = useState(null);
  const [documentId, setDocumentId] = useState(null);

  const queryClient = useQueryClient();

  const saveAgreementMutation = useMutation({
    mutationFn: async (data) => {
      // Save the rental agreement
      const agreement = await base44.entities.RentalAgreement.create(data);
      
      // Update the resident with extracted information
      if (residentId && data) {
        const residentUpdates = {};
        
        // Map lease dates
        if (data.lease_start_date) residentUpdates.move_in_date = data.lease_start_date;
        if (data.lease_end_date) residentUpdates.move_out_date = data.lease_end_date;
        
        // Map pet information
        if (data.pets_allowed !== undefined) residentUpdates.has_pet = data.pets_allowed;
        
        // Map contact information (first tenant)
        if (data.tenant_emails && data.tenant_emails.length > 0) {
          residentUpdates.email = data.tenant_emails[0];
        }
        if (data.tenant_phones && data.tenant_phones.length > 0) {
          residentUpdates.phone = data.tenant_phones[0];
        }
        
        // Map tenant name (first tenant)
        if (data.tenant_names && data.tenant_names.length > 0) {
          const fullName = data.tenant_names[0];
          const nameParts = fullName.trim().split(' ');
          if (nameParts.length > 0) {
            residentUpdates.first_name = nameParts[0];
            if (nameParts.length > 1) {
              residentUpdates.last_name = nameParts.slice(1).join(' ');
            }
          }
        }
        
        // Map parking details
        if (data.parking_details) residentUpdates.parking_spot = data.parking_details;
        
        // Append special conditions and inclusions to notes
        const notesParts = [];
        if (data.special_conditions && data.special_conditions.length > 0) {
          notesParts.push('Special Conditions:\n' + data.special_conditions.map(c => '- ' + c).join('\n'));
        }
        if (data.inclusions) {
          notesParts.push('Inclusions:\n' + data.inclusions);
        }
        if (notesParts.length > 0) {
          residentUpdates.notes = notesParts.join('\n\n');
        }
        
        // Update the resident if we have any updates
        if (Object.keys(residentUpdates).length > 0) {
          await base44.entities.Resident.update(residentId, residentUpdates);
        }
      }
      
      return agreement;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rentalAgreements'] });
      queryClient.invalidateQueries({ queryKey: ['residents'] });
      toast.success('Rental agreement saved and resident information updated!');
      if (onComplete) onComplete();
      setSelectedFile(null);
      setExtractedData(null);
      setDocumentId(null);
    },
  });

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (file && file.type === 'application/pdf') {
      setSelectedFile(file);
      setExtractedData(null);
    } else {
      toast.error('Please select a PDF file');
    }
  };

  const handleExtract = async () => {
    if (!selectedFile) {
      toast.error('No file selected.');
      return;
    }

    console.log('[Extract] Starting extraction process...');
    let uploadedFileUrl = null;
    let createdDocumentId = null;

    setUploading(true);
    setExtracting(false);
    setExtractedData(null);

    try {
      // Step 1: Upload the file
      console.log('[Extract] Step 1: Uploading file...');
      const uploadResult = await base44.integrations.Core.UploadFile({ file: selectedFile });
      console.log('[Extract] Upload result:', uploadResult);
      
      uploadedFileUrl = uploadResult.file_url;
      if (!uploadedFileUrl) {
        throw new Error("File upload failed: No URL returned.");
      }
      console.log('[Extract] File uploaded successfully:', uploadedFileUrl);
      
      // Step 2: Create document record
      console.log('[Extract] Step 2: Creating document record...');
      const doc = await base44.entities.Document.create({
        building_id: buildingId,
        title: `Lease Agreement - ${selectedFile.name}`,
        description: 'Rental tenancy agreement',
        category: 'contract',
        file_url: uploadedFileUrl,
        file_type: 'pdf',
        file_size: selectedFile.size,
        visibility: 'residents_only',
        status: 'active',
      });
      console.log('[Extract] Document created:', doc);
      
      createdDocumentId = doc.id;
      if (!createdDocumentId) {
        throw new Error("Document record creation failed: No ID returned.");
      }
      
      setDocumentId(createdDocumentId);
      setUploading(false);
      setExtracting(true);

      // Step 3: Define the schema for extraction
      console.log('[Extract] Step 3: Using RentalAgreement schema...');
      const schema = {
        type: "object",
        properties: {
          property_address: { type: "string" },
          landlord_name: { type: "string" },
          landlord_address: { type: "string" },
          landlord_agent_name: { type: "string" },
          landlord_agent_address: { type: "string" },
          landlord_agent_phone: { type: "string" },
          landlord_agent_email: { type: "string" },
          tenant_names: { type: "array", items: { type: "string" } },
          tenant_emails: { type: "array", items: { type: "string" } },
          tenant_phones: { type: "array", items: { type: "string" } },
          lease_term_type: { type: "string" },
          lease_term_description: { type: "string" },
          lease_start_date: { type: "string", format: "date" },
          lease_end_date: { type: "string", format: "date" },
          agreement_date: { type: "string", format: "date" },
          rent_amount: { type: "number" },
          rent_frequency: { type: "string" },
          rent_due_day: { type: "string" },
          first_rent_payment_date: { type: "string", format: "date" },
          rent_payment_method: { type: "string" },
          rent_payment_details: { 
            type: "object",
            properties: {
              bsb: { type: "string" },
              account_number: { type: "string" },
              account_name: { type: "string" },
              bank_name: { type: "string" },
              payment_reference: { type: "string" }
            }
          },
          bond_amount: { type: "number" },
          bond_lodged_with: { type: "string" },
          max_occupants: { type: "number" },
          inclusions: { type: "string" },
          parking_included: { type: "boolean" },
          parking_details: { type: "string" },
          utilities_electricity_embedded: { type: "boolean" },
          utilities_gas_embedded: { type: "boolean" },
          water_usage_payable: { type: "boolean" },
          urgent_repairs_contact: { type: "string" },
          urgent_repairs_phone: { type: "string" },
          smoke_alarm_type: { type: "string" },
          smoke_alarm_battery_type: { type: "string" },
          strata_bylaws_applicable: { type: "boolean" },
          pet_policy: { type: "string" },
          pets_allowed: { type: "boolean" },
          special_conditions: { type: "array", items: { type: "string" } },
          electronic_service_consent: { type: "boolean" },
          electronic_service_email: { type: "string" }
        }
      };

      // Step 4: Extract data using AI
      console.log('[Extract] Step 4: Extracting data with AI...');
      const result = await base44.integrations.Core.ExtractDataFromUploadedFile({
        file_url: uploadedFileUrl,
        json_schema: schema,
      });
      console.log('[Extract] AI extraction result:', result);

      if (result.status === 'success' && result.output) {
        const finalData = {
          ...result.output,
          resident_id: residentId,
          building_id: buildingId,
          unit_id: unitId,
          document_id: createdDocumentId,
          status: 'active',
        };
        console.log('[Extract] Setting extracted data:', finalData);
        setExtractedData(finalData);
        toast.success('Data extracted successfully!');
      } else {
        throw new Error('AI extraction failed: ' + (result.details || 'No specific error details provided'));
      }
    } catch (error) {
      console.error('[Extract] Error occurred:', error);
      
      if (!uploadedFileUrl) {
        toast.error('Upload Error: ' + error.message);
      } else if (!createdDocumentId) {
        toast.error('Document Record Error: ' + error.message);
      } else {
        toast.error('AI Extraction Error: ' + error.message);
      }
    } finally {
      console.log('[Extract] Cleanup - resetting states');
      setUploading(false);
      setExtracting(false);
    }
  };

  const handleSave = () => {
    if (!extractedData) {
      toast.error("No data to save.");
      return;
    }
    saveAgreementMutation.mutate(extractedData);
  };

  const updateField = (field, value) => {
    setExtractedData({ ...extractedData, [field]: value });
  };

  return (
    <div className="space-y-6">
      {/* Upload Section */}
      {!extractedData && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-blue-600" />
              Upload Rental Agreement
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Select PDF File</Label>
              <div className="mt-2">
                <Button variant="outline" className="w-full" asChild>
                  <label>
                    <Upload className="h-4 w-4 mr-2" />
                    {selectedFile ? selectedFile.name : 'Choose PDF file'}
                    <input
                      type="file"
                      accept="application/pdf"
                      className="hidden"
                      onChange={handleFileSelect}
                      disabled={uploading || extracting}
                    />
                  </label>
                </Button>
              </div>
            </div>

            {selectedFile && (
              <Button 
                onClick={handleExtract} 
                disabled={uploading || extracting}
                className="w-full bg-blue-600 hover:bg-blue-700"
              >
                {uploading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {extracting && <Sparkles className="h-4 w-4 mr-2 animate-pulse" />}
                {!uploading && !extracting && <Sparkles className="h-4 w-4 mr-2" />}
                {uploading ? 'Uploading...' : extracting ? 'Extracting Data...' : 'Extract with AI'}
              </Button>
            )}

            {(uploading || extracting) && (
              <div className="flex items-center gap-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <Loader2 className="h-5 w-5 text-blue-600 animate-spin" />
                <div className="flex-1">
                  <p className="font-medium text-blue-900">
                    {uploading ? 'Uploading document...' : 'AI is extracting information...'}
                  </p>
                  <p className="text-sm text-blue-700">This may take a few moments</p>
                </div>
              </div>
            )}

            <div className="text-sm text-slate-600 bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="font-medium mb-2">How it works:</p>
              <ol className="list-decimal list-inside space-y-1">
                <li>Upload your rental agreement PDF</li>
                <li>AI will extract all key information</li>
                <li>Review and edit the extracted data</li>
                <li>Save to your database</li>
              </ol>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Extracted Data Review */}
      {extractedData && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Check className="h-5 w-5 text-green-600" />
              Review Extracted Data
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Property Address</Label>
                <Input
                  value={extractedData.property_address || ''}
                  onChange={(e) => updateField('property_address', e.target.value)}
                />
              </div>

              <div>
                <Label>Agreement Date</Label>
                <Input
                  type="date"
                  value={extractedData.agreement_date || ''}
                  onChange={(e) => updateField('agreement_date', e.target.value)}
                />
              </div>

              <div>
                <Label>Lease Start Date</Label>
                <Input
                  type="date"
                  value={extractedData.lease_start_date || ''}
                  onChange={(e) => updateField('lease_start_date', e.target.value)}
                />
              </div>

              <div>
                <Label>Lease End Date</Label>
                <Input
                  type="date"
                  value={extractedData.lease_end_date || ''}
                  onChange={(e) => updateField('lease_end_date', e.target.value)}
                />
              </div>

              <div>
                <Label>Rent Amount</Label>
                <Input
                  type="number"
                  value={extractedData.rent_amount || ''}
                  onChange={(e) => updateField('rent_amount', parseFloat(e.target.value))}
                />
              </div>

              <div>
                <Label>Rent Frequency</Label>
                <Select 
                  value={extractedData.rent_frequency || 'week'} 
                  onValueChange={(v) => updateField('rent_frequency', v)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="week">Weekly</SelectItem>
                    <SelectItem value="fortnight">Fortnightly</SelectItem>
                    <SelectItem value="month">Monthly</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Bond Amount</Label>
                <Input
                  type="number"
                  value={extractedData.bond_amount || ''}
                  onChange={(e) => updateField('bond_amount', parseFloat(e.target.value))}
                />
              </div>

              <div>
                <Label>Maximum Occupants</Label>
                <Input
                  type="number"
                  value={extractedData.max_occupants || ''}
                  onChange={(e) => updateField('max_occupants', parseInt(e.target.value))}
                />
              </div>

              <div className="md:col-span-2">
                <Label>Landlord Name</Label>
                <Input
                  value={extractedData.landlord_name || ''}
                  onChange={(e) => updateField('landlord_name', e.target.value)}
                />
              </div>

              <div className="md:col-span-2">
                <Label>Property Manager / Agent</Label>
                <Input
                  value={extractedData.landlord_agent_name || ''}
                  onChange={(e) => updateField('landlord_agent_name', e.target.value)}
                />
              </div>

              <div>
                <Label>Agent Email</Label>
                <Input
                  value={extractedData.landlord_agent_email || ''}
                  onChange={(e) => updateField('landlord_agent_email', e.target.value)}
                />
              </div>

              <div>
                <Label>Agent Phone</Label>
                <Input
                  value={extractedData.landlord_agent_phone || ''}
                  onChange={(e) => updateField('landlord_agent_phone', e.target.value)}
                />
              </div>

              <div className="md:col-span-2">
                <Label>Tenant Names</Label>
                <Input
                  value={extractedData.tenant_names?.join(', ') || ''}
                  onChange={(e) => updateField('tenant_names', e.target.value.split(',').map(s => s.trim()))}
                  placeholder="Separate multiple names with commas"
                />
              </div>

              <div className="md:col-span-2">
                <Label>Urgent Repairs Contact</Label>
                <Input
                  value={extractedData.urgent_repairs_contact || ''}
                  onChange={(e) => updateField('urgent_repairs_contact', e.target.value)}
                />
              </div>

              <div className="md:col-span-2">
                <Label>Special Conditions</Label>
                <Textarea
                  value={extractedData.special_conditions?.join('\n') || ''}
                  onChange={(e) => updateField('special_conditions', e.target.value.split('\n').filter(s => s.trim()))}
                  rows={4}
                  placeholder="One condition per line"
                />
              </div>
            </div>

            <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-lg">
              <Check className="h-5 w-5 text-green-600" />
              <div className="flex-1">
                <p className="font-medium text-green-900">Data Extracted Successfully</p>
                <p className="text-sm text-green-700">Review the information above and click save when ready</p>
              </div>
            </div>

            <div className="flex gap-3">
              <Button 
                variant="outline" 
                onClick={() => {
                  setSelectedFile(null);
                  setExtractedData(null);
                  setDocumentId(null);
                }}
                className="flex-1"
              >
                Start Over
              </Button>
              <Button 
                onClick={handleSave}
                disabled={saveAgreementMutation.isPending}
                className="flex-1 bg-blue-600 hover:bg-blue-700"
              >
                {saveAgreementMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save Agreement
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}