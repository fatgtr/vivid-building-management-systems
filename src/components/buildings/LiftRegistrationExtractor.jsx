import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Upload, FileText, Loader2, CheckCircle2, AlertCircle, Calendar, Building as BuildingIcon, Mail } from 'lucide-react';
import { toast } from 'sonner';
import { format, subDays } from 'date-fns';

export default function LiftRegistrationExtractor({ buildingId, buildingName, fileUrl = null, documentId = null, onComplete = null }) {
  const [uploading, setUploading] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [planFile, setPlanFile] = useState(null);
  const [extractedData, setExtractedData] = useState(null);
  const queryClient = useQueryClient();

  const createSchedulesMutation = useMutation({
    mutationFn: async (liftsData) => {
      const schedulePromises = liftsData.map(async (lift) => {
        // Calculate reminder date (2 weeks before expiry)
        const expiryDate = new Date(lift.expiry_date);
        const reminderDate = subDays(expiryDate, 14);

        // 1. Create or update Asset entity for the lift
        const assetData = {
          building_id: buildingId,
          document_id: documentId,
          asset_category: 'lift',
          asset_type: lift.lift_type || 'lift',
          name: lift.lift_identifier,
          identifier: lift.registration_number || lift.plant_number || lift.lift_identifier,
          location: lift.location,
          manufacturer: lift.certifying_body,
          model: lift.lift_type || 'lift',
          installation_date: lift.issue_date,
          last_service_date: lift.issue_date,
          next_service_date: lift.expiry_date,
          service_frequency: 'yearly',
          compliance_status: lift.compliance_status || 'unknown',
          notes: lift.conditions,
          status: 'active',
        };

        // Check if an asset with this identifier already exists
        const existingAssets = await base44.entities.Asset.filter({
          building_id: buildingId,
          asset_category: 'lift',
          identifier: assetData.identifier
        });

        let asset;
        if (existingAssets.length > 0) {
          asset = await base44.entities.Asset.update(existingAssets[0].id, assetData);
          console.log('Updated existing lift asset:', asset.id, asset.name);
        } else {
          asset = await base44.entities.Asset.create(assetData);
          console.log('Created new lift asset:', asset.id, asset.name);
        }

        // 2. Create MaintenanceSchedule linked to the Asset entity
        return base44.entities.MaintenanceSchedule.create({
          building_id: buildingId,
          subject: `Lift Registration Renewal - ${lift.lift_identifier}`,
          description: `Lift registration certificate for ${lift.lift_identifier} (Registration: ${lift.registration_number || 'N/A'}) is due for renewal. Current certificate expires on ${format(expiryDate, 'PPP')}.`,
          event_start: format(reminderDate, 'yyyy-MM-dd'),
          event_end: format(expiryDate, 'yyyy-MM-dd'),
          recurrence: 'yearly',
          asset: asset.id,
          job_area: lift.location || 'Building Lift',
          contractor_name: lift.certifying_body || null,
          auto_send_email: true,
          status: 'active'
        });
      });

      return Promise.all(schedulePromises);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['maintenanceSchedules'] });
      queryClient.invalidateQueries({ queryKey: ['assets'] });
      toast.success(`Created ${data.length} lift asset(s) and maintenance schedule(s) with email reminders!`);
      setExtractedData(null);
      setPlanFile(null);
      if (onComplete) onComplete(data);
    },
  });

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file && file.type === 'application/pdf') {
      setPlanFile(file);
      setExtractedData(null);
    } else {
      toast.error('Please select a PDF file');
    }
  };

  const handleExtract = async () => {
    let extractFileUrl = fileUrl;

    if (!fileUrl && !planFile) {
      toast.error('Please select a lift registration file first');
      return;
    }

    setUploading(!fileUrl && planFile);
    setExtracting(false);

    try {
      if (!fileUrl && planFile) {
        const { file_url } = await base44.integrations.Core.UploadFile({ file: planFile });
        extractFileUrl = file_url;
      }

      setUploading(false);
      setExtracting(true);

      const { data } = await base44.functions.invoke('extractLiftRegistrationData', {
        file_url: extractFileUrl,
        buildingId,
        documentId
      });

      if (data.success) {
        setExtractedData(data.data);
        toast.success('Lift registration data extracted successfully!');
      } else {
        toast.error('Failed to extract data: ' + data.error);
      }
    } catch (error) {
      console.error('Extraction error:', error);
      toast.error('Failed to extract lift registration: ' + error.message);
    } finally {
      setUploading(false);
      setExtracting(false);
    }
  };

  const handleCreateSchedules = () => {
    if (!extractedData || !extractedData.lifts || extractedData.lifts.length === 0) {
      toast.error('No lift data to create schedules');
      return;
    }

    createSchedulesMutation.mutate(extractedData.lifts);
  };

  return (
    <Card className="border-2 border-purple-100">
      <CardHeader className="bg-gradient-to-r from-purple-50 to-indigo-50">
        <CardTitle className="flex items-center gap-2">
          <BuildingIcon className="h-5 w-5 text-purple-600" />
          Lift Plant Registration Analysis
        </CardTitle>
        <CardDescription>
          Upload lift registration certificates to auto-schedule renewals and send email reminders
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-6 space-y-4">
        
        {!extractedData && (
          <>
            {!fileUrl && (
              <div className="border-2 border-dashed border-slate-200 rounded-lg p-8 text-center">
                <input
                  type="file"
                  accept="application/pdf"
                  onChange={handleFileSelect}
                  className="hidden"
                  id="lift-reg-upload"
                />
                <label htmlFor="lift-reg-upload" className="cursor-pointer">
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-16 h-16 rounded-full bg-purple-100 flex items-center justify-center">
                      <FileText className="h-8 w-8 text-purple-600" />
                    </div>
                    <div>
                      <p className="font-medium text-slate-700">
                        {planFile ? planFile.name : 'Click to upload lift registration certificate'}
                      </p>
                      <p className="text-sm text-slate-500 mt-1">
                        PDF format only
                      </p>
                    </div>
                  </div>
                </label>
              </div>
            )}

            <Alert className="border-purple-200 bg-purple-50">
              <AlertCircle className="h-4 w-4 text-purple-600" />
              <AlertDescription className="text-sm text-slate-700">
                The AI will extract:
                <ul className="list-disc list-inside mt-2 space-y-1">
                  <li>Lift identifiers and registration numbers</li>
                  <li>Issue and expiry dates</li>
                  <li>Certifying body and inspector details</li>
                  <li>Lift specifications and locations</li>
                  <li><strong>Create lift assets in your asset register</strong></li>
                  <li><strong>Auto-create renewal reminders 2 weeks before expiry</strong></li>
                  <li><strong>Send email notifications to strata & building managers</strong></li>
                </ul>
              </AlertDescription>
            </Alert>

            <Button
              onClick={handleExtract}
              disabled={(!planFile && !fileUrl) || uploading || extracting}
              className="w-full bg-purple-600 hover:bg-purple-700"
            >
              {uploading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Uploading Certificate...
                </>
              ) : extracting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Analyzing Certificate with AI...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Extract Lift Registration Data
                </>
              )}
            </Button>
          </>
        )}

        {extractedData && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-green-600">
              <CheckCircle2 className="h-5 w-5" />
              <span className="font-medium">Lift Registration Data Extracted!</span>
            </div>

            <div className="bg-slate-50 rounded-lg p-4 space-y-3">
              {extractedData.building_name && (
                <div>
                  <p className="text-xs font-medium text-slate-500 uppercase">Building</p>
                  <p className="text-sm font-semibold text-slate-900">{extractedData.building_name}</p>
                  {extractedData.building_address && (
                    <p className="text-xs text-slate-600">{extractedData.building_address}</p>
                  )}
                </div>
              )}

              {extractedData.lifts && extractedData.lifts.length > 0 && (
                <div className="pt-3 border-t border-slate-200">
                  <p className="text-xs font-medium text-slate-500 uppercase mb-3">
                    Registered Lifts ({extractedData.lifts.length})
                  </p>
                  <div className="space-y-3">
                    {extractedData.lifts.map((lift, idx) => (
                      <div key={idx} className="bg-white rounded-lg p-3 border border-slate-200">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <p className="font-semibold text-slate-900">{lift.lift_identifier}</p>
                            {lift.registration_number && (
                              <p className="text-xs text-slate-500">Reg: {lift.registration_number}</p>
                            )}
                          </div>
                          {lift.lift_type && (
                            <Badge variant="secondary" className="text-xs">
                              {lift.lift_type}
                            </Badge>
                          )}
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-xs">
                          {lift.issue_date && (
                            <div>
                              <span className="text-slate-500">Issued:</span>
                              <span className="ml-1 text-slate-700">{lift.issue_date}</span>
                            </div>
                          )}
                          {lift.expiry_date && (
                            <div>
                              <span className="text-slate-500">Expires:</span>
                              <span className="ml-1 font-semibold text-red-600">{lift.expiry_date}</span>
                            </div>
                          )}
                          {lift.certifying_body && (
                            <div className="col-span-2">
                              <span className="text-slate-500">Certifier:</span>
                              <span className="ml-1 text-slate-700">{lift.certifying_body}</span>
                            </div>
                          )}
                          {lift.location && (
                            <div className="col-span-2">
                              <span className="text-slate-500">Location:</span>
                              <span className="ml-1 text-slate-700">{lift.location}</span>
                            </div>
                          )}
                          {lift.capacity && (
                            <div>
                              <span className="text-slate-500">Capacity:</span>
                              <span className="ml-1 text-slate-700">{lift.capacity}</span>
                            </div>
                          )}
                        </div>

                        {lift.conditions && (
                          <div className="mt-2 pt-2 border-t border-slate-100">
                            <p className="text-xs text-amber-600">⚠️ {lift.conditions}</p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <Alert className="border-blue-200 bg-blue-50">
              <Mail className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-xs text-blue-800">
                <strong>This will create:</strong>
                <ul className="list-disc list-inside mt-1">
                  <li>Lift assets in your asset register with unique identifiers</li>
                  <li>Maintenance schedules linked to each lift asset</li>
                  <li>Email notifications 2 weeks before each expiry</li>
                  <li>Yearly recurring reminders for all lifts</li>
                </ul>
              </AlertDescription>
            </Alert>

            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  setExtractedData(null);
                  setPlanFile(null);
                }}
                className="flex-1"
              >
                Start Over
              </Button>
              <Button
                onClick={handleCreateSchedules}
                disabled={createSchedulesMutation.isPending || !extractedData.lifts || extractedData.lifts.length === 0}
                className="flex-1 bg-green-600 hover:bg-green-700"
              >
                {createSchedulesMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Creating Assets & Schedules...
                  </>
                ) : (
                  <>
                    <Calendar className="h-4 w-4 mr-2" />
                    Create {extractedData.lifts?.length || 0} Lift Asset(s) & Schedule(s)
                  </>
                )}
              </Button>
            </div>

            <Alert className="border-amber-200 bg-amber-50">
              <AlertCircle className="h-4 w-4 text-amber-600" />
              <AlertDescription className="text-xs text-amber-800">
                This will create lift assets with unique identifiers (registration numbers) in your asset register, and maintenance schedules linked to those assets with reminders 2 weeks before expiry.
              </AlertDescription>
            </Alert>
          </div>
        )}
      </CardContent>
    </Card>
  );
}