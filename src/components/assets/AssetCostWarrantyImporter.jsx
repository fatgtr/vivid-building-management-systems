import React, { useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from '@/components/ui/dialog';
import { useToast } from '@/components/ui/use-toast';
import { DollarSign, Loader2, Upload, CheckCircle2, AlertTriangle } from 'lucide-react';

export default function AssetCostWarrantyImporter({ buildingId }) {
  const fileRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [stage, setStage] = useState('upload'); // upload | importing | results
  const [results, setResults] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const handleFilePicked = async (file) => {
    if (!file) return;
    if (!buildingId) {
      toast({ title: 'Select a building first', variant: 'destructive' });
      return;
    }
    setErrorMsg('');
    setResults(null);
    setOpen(true);
    setStage('importing');
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });

      const res = await base44.functions.invoke('extractAssetCostWarranty', {
        file_url,
        building_id: buildingId
      });
      const data = res.data || res;

      if (!data || data.success === false) {
        throw new Error((data && data.error) || 'Import failed');
      }

      setResults(data);
      setStage('results');

      // Invalidate Asset Register queries so new cost/warranty values appear
      queryClient.invalidateQueries({ queryKey: ['assets', buildingId] });
      queryClient.invalidateQueries({ queryKey: ['assets'] });

      toast({
        title: 'Cost & warranty import complete',
        description: `${data.updated} asset${data.updated !== 1 ? 's' : ''} updated${data.unmatched ? ` • ${data.unmatched} unmatched` : ''}.`,
      });
    } catch (e) {
      setErrorMsg(e.message || 'Import failed');
      setStage('upload');
    }
  };

  const close = () => {
    setOpen(false);
    setTimeout(() => {
      setStage('upload');
      setResults(null);
      setErrorMsg('');
    }, 200);
  };

  return (
    <div className="inline-flex">
      <Button
        variant="outline"
        size="sm"
        onClick={() => fileRef.current?.click()}
        className="gap-2"
        title="Import asset cost & warranty values from a file"
      >
        <DollarSign className="h-4 w-4" />
        Import Cost/Warranty
      </Button>
      <input
        ref={fileRef}
        type="file"
        accept=".xlsx,.csv,.pdf"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          e.target.value = '';
          if (f) handleFilePicked(f);
        }}
      />

      <Dialog open={open} onOpenChange={(o) => { if (!o) close(); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-blue-600" />
              Import Cost & Warranty
            </DialogTitle>
          </DialogHeader>

          {errorMsg && (
            <div className="flex items-start gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
              <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {stage === 'importing' && (
            <div className="flex flex-col items-center py-10 gap-2">
              <Loader2 className="h-6 w-6 text-blue-600 animate-spin" />
              <p className="text-sm text-slate-500">Extracting and matching assets…</p>
            </div>
          )}

          {stage === 'results' && results && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 text-green-700">
                <CheckCircle2 className="h-8 w-8" />
                <div>
                  <p className="text-lg font-bold">Import complete</p>
                  <p className="text-sm text-slate-600">
                    {results.totalRows} row{results.totalRows !== 1 ? 's' : ''} processed.
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg border border-green-200 bg-green-50 p-3 text-center">
                  <p className="text-xs text-green-700">Assets updated</p>
                  <p className="text-2xl font-bold text-green-700">{results.updated}</p>
                </div>
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-center">
                  <p className="text-xs text-amber-700">Unmatched rows</p>
                  <p className="text-2xl font-bold text-amber-700">{results.unmatched}</p>
                </div>
              </div>
              {results.unmatchedSample && results.unmatchedSample.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-slate-700 mb-1">Sample unmatched rows</p>
                  <div className="border border-slate-200 rounded-md overflow-hidden max-h-40 overflow-y-auto">
                    <table className="w-full text-xs">
                      <tbody>
                        {results.unmatchedSample.map((u, i) => (
                          <tr key={i} className="border-t border-slate-100">
                            <td className="px-2 py-1.5 text-slate-700 truncate max-w-[180px]">
                              {u.identifier || u.fitting_number || u.name || '(no key)'}
                            </td>
                            <td className="px-2 py-1.5 text-slate-400">{u.reason || 'No matching asset'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            {stage === 'results' && <Button onClick={close}>Done</Button>}
            {stage === 'importing' && (
              <Button disabled>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Importing…
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}