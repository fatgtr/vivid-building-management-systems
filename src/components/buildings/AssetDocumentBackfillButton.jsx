import React, { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter
} from '@/components/ui/dialog';
import { Link2, Loader2, CheckCircle2, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

// Retroactively links existing Documents to existing Assets by category + building.
// Uses the admin-only backfillAssetDocumentLinks backend function.
export default function AssetDocumentBackfillButton({ buildingId }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const queryClient = useQueryClient();

  const run = async () => {
    setLoading(true);
    setResult(null);
    try {
      const res = await base44.functions.invoke('backfillAssetDocumentLinks', {
        building_id: buildingId || null
      });
      const data = res.data || res;
      if (!data || data.success === false) throw new Error(data?.error || 'Backfill failed');
      setResult(data);
      queryClient.invalidateQueries({ queryKey: ['assets'] });
      queryClient.invalidateQueries({ queryKey: ['buildingDocuments'] });
      toast.success(`Linked ${data.linksCreated} asset(s) to their source documents`);
    } catch (e) {
      toast.error(e.message || 'Backfill failed');
    } finally {
      setLoading(false);
    }
  };

  const close = () => {
    setOpen(false);
    setTimeout(() => setResult(null), 200);
  };

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)} className="gap-2">
        <Link2 className="h-4 w-4" />
        Backfill Document Links
      </Button>
      <Dialog open={open} onOpenChange={(o) => { if (!o) close(); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Link2 className="h-5 w-5 text-violet-600" />
              Backfill asset ↔ document links
            </DialogTitle>
            <DialogDescription>
              {buildingId
                ? 'Links existing documents to existing assets in this building by category, where the link is missing.'
                : 'Links existing documents to existing assets across all buildings by category, where the link is missing. Admin only.'}
            </DialogDescription>
          </DialogHeader>

          {result ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-emerald-700">
                <CheckCircle2 className="h-6 w-6" />
                <p className="font-semibold">Backfill complete</p>
              </div>
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="rounded-lg border border-slate-200 p-3">
                  <p className="text-2xl font-bold">{result.buildingsProcessed}</p>
                  <p className="text-xs text-slate-500">Buildings</p>
                </div>
                <div className="rounded-lg border border-slate-200 p-3">
                  <p className="text-2xl font-bold">{result.documentsScanned}</p>
                  <p className="text-xs text-slate-500">Documents</p>
                </div>
                <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3">
                  <p className="text-2xl font-bold text-emerald-700">{result.linksCreated}</p>
                  <p className="text-xs text-emerald-700">Links created</p>
                </div>
              </div>
              {result.linksCreated === 0 && (
                <div className="flex items-start gap-2 text-xs text-slate-500 bg-slate-50 border border-slate-200 rounded-md p-2">
                  <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <span>No new links needed — existing assets already reference their source documents, or no category matches were found.</span>
                </div>
              )}
            </div>
          ) : (
            <div className="text-sm text-slate-600">
              This will scan {buildingId ? 'this building\'s' : 'all'} documents and link them to matching assets that don't already reference them. This gives existing assets traceability to the documents they were imported from.
            </div>
          )}

          <DialogFooter>
            {result ? (
              <Button onClick={close}>Done</Button>
            ) : (
              <>
                <Button variant="outline" onClick={close} disabled={loading}>Cancel</Button>
                <Button onClick={run} disabled={loading}>
                  {loading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Backfilling…</> : 'Run backfill'}
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}