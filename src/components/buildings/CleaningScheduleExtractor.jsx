import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from "@/components/ui/card";
import { Calendar, CheckCircle, X, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function CleaningScheduleExtractor({ buildingId, fileUrl, onComplete }) {
  const [extractedData, setExtractedData] = useState(null);
  const [processing, setProcessing] = useState(false);
  const queryClient = useQueryClient();

  const extractAndCreateSchedulesMutation = useMutation({
    mutationFn: async () => {
      setProcessing(true);
      const { data } = await base44.functions.invoke('extractCleaningScheduleDetails', {
        file_url: fileUrl,
        building_id: buildingId
      });
      return data;
    },
    onSuccess: (data) => {
      setExtractedData(data);
      if (data.success) {
        toast.success(`${data.created_maintenance_schedules.length} maintenance schedule(s) created!`);
        queryClient.invalidateQueries({ queryKey: ['maintenanceSchedules'] });
        if (onComplete) onComplete();
      } else {
        toast.error('Failed to process: ' + data.error);
      }
    },
    onError: (error) => {
      toast.error('Error: ' + error.message);
      setExtractedData({ success: false, error: error.message });
    },
    onSettled: () => {
      setProcessing(false);
    }
  });

  React.useEffect(() => {
    if (fileUrl) {
      extractAndCreateSchedulesMutation.mutate();
    }
  }, [fileUrl]); //eslint-disable-line react-hooks/exhaustive-deps

  return (
    <Card className="w-full">
      <CardContent className="pt-6 space-y-4">
        {processing && (
          <div className="flex items-center gap-2 text-blue-600">
            <Loader2 className="h-5 w-5 animate-spin" />
            <p className="font-medium">Analyzing cleaning schedule and creating maintenance events...</p>
          </div>
        )}

        {!processing && extractedData?.success && extractedData.created_maintenance_schedules?.length > 0 && (
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

        {!processing && extractedData?.success === false && extractedData.error && (
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