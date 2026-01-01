import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Upload, Loader2, Sparkles, CheckCircle, X, Calendar } from 'lucide-react';
import { toast } from 'sonner';

export default function CleaningScheduleUploader({ buildingId }) {
  const [uploading, setUploading] = useState(false);
  const [extractedData, setExtractedData] = useState(null);
  const queryClient = useQueryClient();

  const extractAndCreateSchedulesMutation = useMutation({
    mutationFn: async (file_url) => {
      const { data } = await base44.functions.invoke('extractCleaningScheduleDetails', {
        file_url,
        building_id: buildingId
      });
      return data;
    },
    onSuccess: (data) => {
      setExtractedData(data);
      if (data.success) {
        toast.success(`${data.created_maintenance_schedules.length} maintenance schedule(s) created!`);
        queryClient.invalidateQueries({ queryKey: ['maintenanceSchedules'] });
      } else {
        toast.error('Failed to process: ' + data.error);
      }
    },
    onError: (error) => {
      toast.error('Error: ' + error.message);
      setExtractedData({ success: false, error: error.message });
    },
    onSettled: () => {
      setUploading(false);
    }
  });

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setExtractedData(null);
    
    try {
      toast.info('Uploading cleaning schedule...');
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      toast.info('Analyzing with AI...');
      await extractAndCreateSchedulesMutation.mutateAsync(file_url);
    } catch (error) {
      toast.error('Upload failed: ' + error.message);
      setUploading(false);
    }
  };

  return (
    <Card className="border-2 border-dashed border-cyan-300 bg-gradient-to-br from-cyan-50 to-blue-50 hover:border-cyan-500 hover:shadow-xl transition-all duration-300 group">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg font-semibold text-cyan-800 flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-cyan-600" />
          AI Cleaning Schedule Extractor
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-cyan-700 leading-relaxed">
          Upload a cleaning contractor's schedule document and AI will automatically extract and create maintenance schedules.
        </p>
        
        <Button
          type="button"
          variant="outline"
          className="w-full h-24 bg-white hover:bg-cyan-50 border-2 border-dashed border-cyan-300 group-hover:border-cyan-500 transition-colors"
          disabled={uploading}
          asChild
        >
          <label className="cursor-pointer flex flex-col items-center justify-center gap-2">
            {uploading ? (
              <>
                <Loader2 className="h-8 w-8 text-cyan-600 animate-spin" />
                <span className="text-sm font-medium text-cyan-600">Processing...</span>
              </>
            ) : (
              <>
                <div className="w-12 h-12 rounded-full bg-cyan-100 flex items-center justify-center">
                  <Upload className="h-6 w-6 text-cyan-600" />
                </div>
                <span className="text-sm font-medium text-cyan-700">Upload Cleaning Schedule</span>
                <span className="text-xs text-cyan-500">PDF, JPG, PNG supported</span>
              </>
            )}
            <input
              type="file"
              className="hidden"
              onChange={handleFileUpload}
              accept=".pdf,.jpg,.jpeg,.png"
            />
          </label>
        </Button>

        {extractedData?.success && extractedData.created_maintenance_schedules?.length > 0 && (
          <div className="w-full p-4 bg-green-50 border-2 border-green-200 rounded-lg">
            <p className="text-sm font-semibold text-green-800 flex items-center gap-2 mb-3">
              <CheckCircle className="h-5 w-5 text-green-600" />
              {extractedData.created_maintenance_schedules.length} Schedule(s) Created
            </p>
            <div className="space-y-2">
              {extractedData.created_maintenance_schedules.slice(0, 3).map((schedule, index) => (
                <div key={index} className="flex items-start gap-2 text-sm text-green-700 bg-white p-2 rounded">
                  <Calendar className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium">{schedule.subject}</p>
                    <p className="text-xs text-green-600">Recurrence: {schedule.recurrence}</p>
                  </div>
                </div>
              ))}
              {extractedData.created_maintenance_schedules.length > 3 && (
                <p className="text-xs text-green-600 text-center">
                  +{extractedData.created_maintenance_schedules.length - 3} more
                </p>
              )}
            </div>
          </div>
        )}

        {extractedData?.success === false && extractedData.error && (
          <div className="w-full p-3 bg-red-50 border-2 border-red-200 rounded-lg">
            <p className="text-sm font-medium text-red-800 flex items-center gap-2">
              <X className="h-4 w-4 text-red-600" />
              {extractedData.error}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}