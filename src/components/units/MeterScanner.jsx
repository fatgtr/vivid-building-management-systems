import React, { useState, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Zap, Camera, Loader2, CheckCircle2, Copy, ArrowDownToLine } from 'lucide-react';
import { toast } from 'sonner';

export default function MeterScanner({ onApplyUnitNumber }) {
  const [imageUrl, setImageUrl] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const fileRef = useRef(null);

  const handleFile = async (file) => {
    if (!file) return;
    setLoading(true);
    setResult(null);
    try {
      const { file_url } = await base44.integrations.Core.UploadPublicFile({ file });
      setImageUrl(file_url);
      const res = await base44.functions.invoke('extractMeterDetails', { file_url });
      const data = res?.data?.data || res?.data;
      if (data) {
        setResult(data);
      } else {
        throw new Error(res?.data?.error || 'No data returned');
      }
    } catch (err) {
      toast.error('Scan failed: ' + (err.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  const copy = (text) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    toast.success('Copied');
  };

  const reset = () => {
    setImageUrl(null);
    setResult(null);
    if (fileRef.current) fileRef.current.value = '';
  };

  return (
    <Card className="border-2 border-amber-100 bg-amber-50/40">
      <CardContent className="pt-4 space-y-3">
        <div className="flex items-center gap-2">
          <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center">
            <Zap className="h-5 w-5 text-white" />
          </div>
          <div>
            <Label className="text-base font-semibold">Scan Meter Photo</Label>
            <p className="text-xs text-slate-600">Photo the meter to read the unit & NMI numbers</p>
          </div>
        </div>

        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(e) => handleFile(e.target.files?.[0])}
        />

        {!imageUrl && !loading && (
          <Button
            type="button"
            variant="outline"
            className="w-full border-dashed border-2 border-amber-300 bg-white hover:bg-amber-50"
            onClick={() => fileRef.current?.click()}
          >
            <Camera className="h-4 w-4 mr-2" />
            Upload / Take Meter Photo
          </Button>
        )}

        {imageUrl && (
          <div className="relative rounded-lg overflow-hidden border border-slate-200 bg-white">
            <img src={imageUrl} alt="Meter" className="w-full max-h-48 object-cover" />
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="absolute top-2 right-2"
              onClick={reset}
            >
              Replace
            </Button>
          </div>
        )}

        {loading && (
          <div className="flex items-center justify-center py-6 text-slate-500">
            <Loader2 className="h-5 w-5 animate-spin mr-2" />
            Reading meter...
          </div>
        )}

        {result && !loading && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg bg-white border border-slate-200 p-3">
                <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Unit Number</p>
                <div className="flex items-center justify-between gap-2 mt-1">
                  <span className="font-mono font-bold text-slate-900 truncate">
                    {result.unit_number || '—'}
                  </span>
                  {result.unit_number && (
                    <div className="flex items-center gap-1">
                      <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => copy(result.unit_number)}>
                        <Copy className="h-3.5 w-3.5" />
                      </Button>
                      {onApplyUnitNumber && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-blue-600"
                          title="Use as unit number"
                          onClick={() => {
                            onApplyUnitNumber(result.unit_number);
                            toast.success('Applied to Unit Number field');
                          }}
                        >
                          <ArrowDownToLine className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </div>
              <div className="rounded-lg bg-white border border-slate-200 p-3">
                <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">NMI Number</p>
                <div className="flex items-center justify-between gap-2 mt-1">
                  <span className="font-mono font-bold text-slate-900 truncate">
                    {result.nmi_number || '—'}
                  </span>
                  {result.nmi_number && (
                    <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => copy(result.nmi_number)}>
                      <Copy className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              </div>
            </div>

            {(result.meter_model || result.meter_serial) && (
              <div className="text-xs text-slate-500 space-y-0.5">
                {result.meter_model && <p>Meter model: {result.meter_model}</p>}
                {result.meter_serial && <p>Serial: {result.meter_serial}</p>}
              </div>
            )}

            <div className="flex items-center gap-1.5 text-xs text-emerald-600">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Extracted — values not saved automatically
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}