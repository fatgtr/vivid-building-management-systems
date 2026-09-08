import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Upload, Loader2, AlertCircle, Zap, Wind, Droplet, FileText } from 'lucide-react';
import { toast } from 'sonner';
import ImportSummary from '@/components/assets/ImportSummary';

const categoryIcons = { electrical: Zap, mechanical: Wind, plumbing: Droplet };
const categoryColors = {
  electrical: { bg: 'yellow', text: 'text-yellow-700', border: 'border-yellow-200', btn: 'bg-yellow-600 hover:bg-yellow-700' },
  mechanical: { bg: 'cyan', text: 'text-cyan-700', border: 'border-cyan-200', btn: 'bg-cyan-600 hover:bg-cyan-700' },
  plumbing: { bg: 'blue', text: 'text-blue-700', border: 'border-blue-200', btn: 'bg-blue-600 hover:bg-blue-700' }
};

export default function AsBuiltExtractor({ buildingId, buildingName, fileUrl, documentId, fileName, assetCategory, onComplete }) {
  const [processing, setProcessing] = useState(false);
  const [summary, setSummary] = useState(null);
  const Icon = categoryIcons[assetCategory] || FileText;
  const colors = categoryColors[assetCategory] || { text: 'text-slate-700', border: 'border-slate-200', btn: 'bg-slate-600 hover:bg-slate-700' };

  const handleProcess = async () => {
    if (!fileUrl) { toast.error('No file to process'); return; }
    setProcessing(true);
    setSummary(null);
    try {
      const res = await base44.functions.invoke('extractAsBuiltAssets', {
        file_url: fileUrl,
        buildingId,
        documentId,
        fileName,
        assetCategory
      });
      const data = res.data || res;
      if (!data || data.success === false) throw new Error(data?.error || 'Extraction failed');
      setSummary(data);
      toast.success(`Import complete — ${data.created} created, ${data.updated} updated, ${data.linked} linked`);
    } catch (e) {
      toast.error('Import failed: ' + e.message);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <Card className={`border-2 ${colors.border}`}>
      <CardHeader className="bg-gradient-to-r from-slate-50 to-transparent">
        <CardTitle className="flex items-center gap-2">
          <Icon className={`h-5 w-5 ${colors.text}`} />
          As-Built {assetCategory.charAt(0).toUpperCase() + assetCategory.slice(1)} Asset Register
        </CardTitle>
        <CardDescription>
          The AI extracts {assetCategory} assets, matches existing ones (no duplicates), links this document to each asset, and adds them to the Asset Register.
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-6 space-y-4">
        {!summary && (
          <>
            <Alert className={colors.border}>
              <AlertCircle className={`h-4 w-4 ${colors.text}`} />
              <AlertDescription className="text-sm text-slate-700">
                {fileName ? `Ready to process: ${fileName}` : `Ready to process the uploaded as-built ${assetCategory} plan.`} Re-uploading the same plan updates existing assets instead of creating duplicates.
              </AlertDescription>
            </Alert>
            <Button onClick={handleProcess} disabled={processing} className={`w-full ${colors.btn}`}>
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