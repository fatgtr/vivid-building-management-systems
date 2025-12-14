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
    mutationFn: (data) => base44.entities.RentalAgreement.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rentalAgreements'] });
      toast.success('Rental agreement saved successfully!');
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
    if (!selectedFile) return;

    setUploading(true);
    try {
      // Upload the file
      const { file_url } = await base44.integrations.Core.UploadFile({ file: selectedFile });
      
      // Create document record
      const doc = await base44.entities.Document.create({
        building_id: buildingId,
        title: `Lease Agreement - ${selectedFile.name}`,
        description: 'Rental tenancy agreement',
        category: 'contract',
        file_url: file_url,
        file_type: 'pdf',
        file_size: selectedFile.size,
        visibility: 'residents_only',
        status: 'active',
      });
      
      setDocumentId(doc.id);
      setUploading(false);
      setExtracting(true);

      // Get the schema
      const schema = await base44.entities.RentalAgreement.schema();

      // Extract data using AI
      const result = await base44.integrations.Core.ExtractDataFromUploadedFile({
        file_url: file_url,
        json_schema: schema,
      });

      if (result.status === 'success' && result.output) {
        setExtractedData({
          ...result.output,
          resident_id: residentId,
          building_id: buildingId,
          unit_id: unitId,
          document_id: doc.id,
          status: 'active',
        });
        toast.success('Data extracted successfully!');
      } else {
        toast.error('Failed to extract data: ' + (result.details || 'Unknown error'));
      }
    } catch (error) {
      toast.error('Error processing file: ' + error.message);
    } finally {
      setUploading(false);
      setExtracting(false);
    }
  };

  const handleSave = () => {
    if (!extractedData) return;
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