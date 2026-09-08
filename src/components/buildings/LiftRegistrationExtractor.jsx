import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Upload, Loader2, AlertCircle, Building as BuildingIcon } from 'lucide-react';
import { toast } from 'sonner';
import ImportSummary from '@/components/assets/ImportSummary';

export default function LiftRegistrationExtractor({ buildingId, buildingName, fileUrl, documentId, fileName, onComplete }) {
  const [processing, setProcessing] = useState(false);
  const [summary, setSummary] = useState(null);

  const handleProcess = async () => {
    if (!fileUrl) { toast.error('No file to process'); return; }
    setProcessing(true);
    setSummary(null);
    try {
      const res = await base44.functions.invoke('extractLiftRegistrationData', {
        file_url: fileUrl,
        buildingId,
        documentId,
        fileName
      });
      const data = res.data || res;
      if (!data || data.success === false) throw new Error(data?.error || 'Extraction failed');
      setSummary(data);
      toast.success(`Lift import complete — ${data.created} created, ${data.updated} updated, ${data.linked} linked`);
    } catch (e) {
      toast.error('Lift import failed: ' + e.message);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <Card className="border-2 border-purple-100">
      <CardHeader className="bg-gradient-to-r from-purple-50 to-indigo-50">
        <CardTitle className="flex items-center gap-2">
          <BuildingIcon className="h-5 w-5 text-purple-600" />
          Lift Plant Registration Analysis
        </CardTitle>
        <CardDescription>
          The AI extracts lift assets, matches existing ones (no duplicates), links this document to each asset, creates renewal maintenance schedules (with email reminders 2 weeks before expiry) and compliance records.
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-6 space-y-4">
        {!summary && (
          <>
            <Alert className="border-purple-200 bg-purple-50">
              <AlertCircle className="h-4 w-4 text-purple-600" />
              <AlertDescription className="text-sm text-slate-700">
                {fileName ? `Ready to process: ${fileName}` : 'Ready to process the uploaded lift registration certificate.'} Re-uploading updates existing lift assets instead of creating duplicates.
              </AlertDescription>
            </Alert>
            <Button onClick={handleProcess} disabled={processing} className="w-full bg-purple-600 hover:bg-purple-700">
              {processing ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Extracting &amp; creating lift assets…</>
              ) : (
                <><Upload className="h-4 w-4 mr-2" /> Extract &amp; Create Lift Assets</>
              )}
            </Button>
          </>
        )}
        {summary && <ImportSummary summary={summary} onDone={onComplete} doneLabel="Close" />}
      </CardContent>
    </Card>
  );
}