import React, { useState, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Zap, Flame, Droplet, Camera, Loader2, CheckCircle2, Copy, ArrowDownToLine, X, ImageIcon } from 'lucide-react';
import { toast } from 'sonner';

const TYPE_ICON = {
  electricity: Zap,
  gas: Flame,
  water: Droplet,
  hot_water: Flame,
  unknown: Zap,
};
const TYPE_COLOR = {
  electricity: 'from-amber-500 to-orange-500',
  gas: 'from-blue-500 to-cyan-500',
  water: 'from-sky-500 to-blue-600',
  hot_water: 'from-rose-500 to-red-500',
  unknown: 'from-amber-500 to-orange-500',
};
const TYPE_LABEL = {
  electricity: 'Electricity Meter',
  gas: 'Gas Meter',
  water: 'Water Meter',
  hot_water: 'Hot Water Meter',
  unknown: 'Meter',
};

// LLM sometimes returns the literal string "null" for missing fields
const clean = (v) => (v == null || v === 'null' || v === '') ? '' : String(v);

export default function MeterScanner({ onApplyUnitNumber, photos = [], onPhotosChange }) {
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
        const parsed = {
          meter_type: clean(data.meter_type) || 'unknown',
          unit_number: clean(data.unit_number),
          nmi_number: clean(data.nmi_number),
          meter_model: clean(data.meter_model),
          meter_serial: clean(data.meter_serial),
          meter_reading: data.meter_reading,
          reading_unit: clean(data.reading_unit),
          manufacturer: clean(data.manufacturer),
        };
        setResult(parsed);
        // Store the photo as evidence
        if (onPhotosChange) {
          onPhotosChange([...photos, file_url]);
          toast.success('Meter photo saved as evidence');
        }
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

  const removePhoto = (url) => {
    if (!onPhotosChange) return;
    onPhotosChange(photos.filter((p) => p !== url));
  };

  const Icon = result ? (TYPE_ICON[result.meter_type] || Zap) : Zap;

  return (
    <Card className="border-2 border-amber-100 bg-amber-50/40">
      <CardContent className="pt-4 space-y-3">
        <div className="flex items-center gap-2">
          <div className={`h-9 w-9 rounded-lg bg-gradient-to-br ${result ? TYPE_COLOR[result.meter_type] : TYPE_COLOR.unknown} flex items-center justify-center`}>
            <Icon className="h-5 w-5 text-white" />
          </div>
          <div className="flex-1">
            <Label className="text-base font-semibold">Scan Meter Photo</Label>
            <p className="text-xs text-slate-600">Photo the meter to read unit, NMI & reading</p>
          </div>
          {photos.length > 0 && (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 text-emerald-700 px-2 py-0.5 text-xs font-medium">
              <ImageIcon className="h-3 w-3" />
              {photos.length} saved
            </span>
          )}
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
            {result.meter_type && result.meter_type !== 'unknown' && (
              <div className="inline-flex items-center gap-1.5 rounded-full bg-slate-900 text-white px-2.5 py-1 text-xs font-medium">
                <Icon className="h-3.5 w-3.5" />
                {TYPE_LABEL[result.meter_type]}
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <Field label="Unit Number" value={result.unit_number} onCopy={() => copy(result.unit_number)}>
                {onApplyUnitNumber && result.unit_number && (
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
              </Field>
              <Field label="NMI Number" value={result.nmi_number || '—'} onCopy={result.nmi_number ? () => copy(result.nmi_number) : null} />
              <Field label="Meter Reading" value={result.meter_reading != null ? `${result.meter_reading}${result.reading_unit ? ' ' + result.reading_unit : ''}` : '—'} onCopy={result.meter_reading != null ? () => copy(`${result.meter_reading}`) : null} />
              <Field label="Serial" value={result.meter_serial || '—'} onCopy={result.meter_serial ? () => copy(result.meter_serial) : null} />
            </div>

            {(result.meter_model || result.manufacturer) && (
              <div className="text-xs text-slate-500 space-y-0.5">
                {result.manufacturer && <p>Manufacturer: {result.manufacturer}</p>}
                {result.meter_model && <p>Model: {result.meter_model}</p>}
              </div>
            )}

            <div className="flex items-center gap-1.5 text-xs text-emerald-600">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Extracted — photo kept as evidence
            </div>
          </div>
        )}

        {photos.length > 0 && (
          <div className="border-t pt-3">
            <p className="text-xs font-semibold text-slate-600 mb-2">Evidence photos ({photos.length})</p>
            <div className="grid grid-cols-3 gap-2">
              {photos.map((url, i) => (
                <div key={i} className="relative group rounded-lg overflow-hidden border border-slate-200 bg-white aspect-square">
                  <img src={url} alt={`Meter ${i + 1}`} className="w-full h-full object-cover" />
                  <a
                    href={url}
                    target="_blank"
                    rel="noreferrer"
                    className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center"
                    title="View full image"
                  />
                  {onPhotosChange && (
                    <button
                      type="button"
                      onClick={() => removePhoto(url)}
                      className="absolute top-1 right-1 h-5 w-5 rounded-full bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      title="Remove"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function Field({ label, value, onCopy, children }) {
  return (
    <div className="rounded-lg bg-white border border-slate-200 p-3">
      <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">{label}</p>
      <div className="flex items-center justify-between gap-2 mt-1">
        <span className="font-mono font-bold text-slate-900 truncate">{value}</span>
        <div className="flex items-center gap-1">
          {onCopy && (
            <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={onCopy}>
              <Copy className="h-3.5 w-3.5" />
            </Button>
          )}
          {children}
        </div>
      </div>
    </div>
  );
}