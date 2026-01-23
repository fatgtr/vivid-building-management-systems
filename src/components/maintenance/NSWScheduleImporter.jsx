import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Upload, FileText, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

export default function NSWScheduleImporter({ buildingId, onImportComplete }) {
  const [file, setFile] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState(null);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      setResult(null);
    }
  };

  const handleImport = async () => {
    if (!file) {
      toast.error('Please select a file to upload');
      return;
    }

    setProcessing(true);
    try {
      // Upload file
      const uploadResult = await base44.integrations.Core.UploadFile({ file });
      const fileUrl = uploadResult.file_url;

      // Extract schedule data using AI
      const extractResult = await base44.functions.invoke('extractMaintenanceSchedule', {
        fileUrl,
        buildingId
      });

      setResult(extractResult.data);
      toast.success(`Successfully imported ${extractResult.data.schedules_created} maintenance schedules`);
      
      if (onImportComplete) {
        onImportComplete(extractResult.data);
      }
    } catch (error) {
      console.error('Import error:', error);
      toast.error('Failed to import schedule: ' + error.message);
      setResult({ success: false, error: error.message });
    } finally {
      setProcessing(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Import NSW Initial Maintenance Schedule
        </CardTitle>
        <CardDescription>
          Upload the completed NSW Initial Maintenance Schedule form to automatically create maintenance schedules
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label htmlFor="schedule-file">Upload Schedule Document</Label>
          <Input
            id="schedule-file"
            type="file"
            accept=".pdf,.docx,.doc,.xlsx,.xls"
            onChange={handleFileChange}
            disabled={processing}
          />
          <p className="text-xs text-slate-500 mt-1">
            Supported formats: PDF, Word, Excel
          </p>
        </div>

        {file && (
          <Alert>
            <FileText className="h-4 w-4" />
            <AlertDescription>
              Selected: {file.name} ({(file.size / 1024).toFixed(2)} KB)
            </AlertDescription>
          </Alert>
        )}

        <Button
          onClick={handleImport}
          disabled={!file || processing}
          className="w-full"
        >
          {processing ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Processing Schedule...
            </>
          ) : (
            <>
              <Upload className="mr-2 h-4 w-4" />
              Import Schedule
            </>
          )}
        </Button>

        {result && (
          <Alert variant={result.success ? 'default' : 'destructive'}>
            {result.success ? (
              <CheckCircle2 className="h-4 w-4" />
            ) : (
              <AlertCircle className="h-4 w-4" />
            )}
            <AlertDescription>
              {result.success ? (
                <div>
                  <p className="font-semibold">Import Successful!</p>
                  <ul className="text-sm mt-2 space-y-1">
                    <li>• {result.schedules_created} maintenance schedules created</li>
                    <li>• {result.assets_linked} assets linked</li>
                    {result.warnings && result.warnings.length > 0 && (
                      <li className="text-orange-600">• {result.warnings.length} warnings</li>
                    )}
                  </ul>
                </div>
              ) : (
                <p>{result.error || 'Import failed'}</p>
              )}
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}