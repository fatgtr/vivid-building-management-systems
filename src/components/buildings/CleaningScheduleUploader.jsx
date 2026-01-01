import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import AIDocumentUploadCard from './AIDocumentUploadCard';
import { Sparkles, Calendar, CheckCircle, X } from 'lucide-react';
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

  const handleFileSelect = async (file) => {
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

  // Custom result rendering
  const renderResults = () => {
    if (extractedData?.success && extractedData.created_maintenance_schedules?.length > 0) {
      return (
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
      );
    }
    
    if (extractedData?.success === false && extractedData.error) {
      return (
        <div className="w-full p-3 bg-red-50 border-2 border-red-200 rounded-lg">
          <p className="text-sm font-medium text-red-800 flex items-center gap-2">
            <X className="h-4 w-4 text-red-600" />
            {extractedData.error}
          </p>
        </div>
      );
    }
    
    return null;
  };

  return (
    <div className="space-y-4">
      <AIDocumentUploadCard
        title="AI Cleaning Schedule Extractor"
        description="Upload a cleaning contractor's schedule document and AI will automatically extract and create maintenance schedules."
        icon={Sparkles}
        color="cyan"
        onFileSelect={handleFileSelect}
        uploading={uploading}
        acceptedFormats=".pdf,.jpg,.jpeg,.png"
      />
      {renderResults()}
    </div>
  );
}