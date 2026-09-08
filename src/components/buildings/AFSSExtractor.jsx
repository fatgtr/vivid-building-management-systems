import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Upload, FileText, Loader2, AlertCircle, Flame } from 'lucide-react';
import { toast } from 'sonner';
import ImportSummary from '@/components/assets/ImportSummary';

export default function AFSSExtractor({ buildingId, buildingName, fileUrl, documentId, fileName, onComplete }) {
  const [processing, setProcessing] = useState(false);
  const [summary, setSummary] = useState(null);

  const handleProcess = async () => {
    if (!fileUrl) { toast.error('No file to process'); return; }
    setProcessing(true);
    setSummary(null);
    try {
      const res = await base44.functions.invoke('extractAFSSAssets', {
        file_url: fileUrl,
        buildingId,
        documentId,
        fileName
      });
      const data = res.data || res;
      if (!data || data.success === false) throw new Error(data?.error || 'Extraction failed');
      setSummary(data);
      toast.success(`AFSS import complete — ${data.created} created, ${data.updated} updated, ${data.linked} linked`);
    } catch (e) {
      toast.error('AFSS import failed: ' + e.message);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <Card className="border-2 border-orange-100">
      <CardHeader className="bg-gradient-to-r from-orange-50 to-red-50">
        <CardTitle className="flex items-center gap-2">
          <Flame className="h-5 w-5 text-orange-600" />
          AFSS Asset Register Analysis
        </CardTitle>
        <CardDescription>
          The AI extracts fire safety assets, matches existing ones (no duplicates), links this document to each asset, and creates compliance records, maintenance schedules and work orders for deficiencies.
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-6 space-y-4">
        {!summary && (
          <>
            <Alert className="border-orange-200 bg-orange-50">
              <AlertCircle className="h-4 w-4 text-orange-600" />
              <AlertDescription className="text-sm text-slate-700">
                {fileName ? `Ready to process: ${fileName}` : 'Ready to process the uploaded AFSS document.'} The AI will extract all fire safety assets, upsert them into the Asset Register, link this document to each asset, and auto-create compliance records and work orders for any deficiencies.
              </AlertDescription>
            </Alert>
            <Button onClick={handleProcess} disabled={processing} className="w-full bg-orange-600 hover:bg-orange-700">
              {processing ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Extracting &amp; creating assets…</>
              ) : (
                <><Upload className="h-4 w-4 mr-2" /> Extract &amp; Create Assets</>
              )}
            </Button>
          </>
        )}
        {summary && <ImportSummary summary={summary} onDone={onComplete} doneLabel="Close" />}
      </CardContent>
    </Card>
  );
}