import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Upload, Loader2, AlertCircle, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { ASSET_CATEGORIES, formatSubcategoryLabel } from '@/components/categories/assetCategories';
import ImportSummary from '@/components/assets/ImportSummary';

export default function GenericAssetExtractor({ buildingId, buildingName, fileUrl, documentId, fileName, assetCategory, categoryLabel, onComplete }) {
  const [processing, setProcessing] = useState(false);
  const [summary, setSummary] = useState(null);

  const handleProcess = async () => {
    if (!fileUrl) { toast.error('No file to process'); return; }
    const subcategories = ASSET_CATEGORIES[assetCategory]?.subcategories || [];
    setProcessing(true);
    setSummary(null);
    try {
      const res = await base44.functions.invoke('extractGenericAssets', {
        file_url: fileUrl,
        buildingId,
        documentId,
        fileName,
        assetCategory,
        categoryLabel,
        subcategories
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
    <div className="space-y-6">
      <Alert>
        <Sparkles className="h-4 w-4" />
        <AlertDescription>
          The AI extracts {categoryLabel || assetCategory} assets from the document, matches existing ones (no duplicates), links this document to each asset, and adds them to the Asset Register.
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-blue-600" />
            {categoryLabel || assetCategory} Asset Import
          </CardTitle>
          <CardDescription>
            {ASSET_CATEGORIES[assetCategory]?.subcategories?.length
              ? `Subcategories: ${ASSET_CATEGORIES[assetCategory].subcategories.map(formatSubcategoryLabel).join(', ')}`
              : 'Assets will be categorized automatically.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!summary && (
            <>
              <Alert className="border-blue-200 bg-blue-50">
                <AlertCircle className="h-4 w-4 text-blue-600" />
                <AlertDescription className="text-sm text-slate-700">
                  {fileName ? `Ready to process: ${fileName}` : 'Ready to process the uploaded document.'} Re-uploading the same document updates existing assets instead of creating duplicates.
                </AlertDescription>
              </Alert>
              <Button onClick={handleProcess} disabled={processing} className="w-full">
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
    </div>
  );
}