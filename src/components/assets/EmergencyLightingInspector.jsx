import React from 'react';
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription
} from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { MapPin, Building, Calendar, Wrench, FileText, User, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { format, parseISO } from 'date-fns';

function fmtDate(d) {
  if (!d) return '—';
  try { return format(parseISO(d), 'dd MMM yyyy'); } catch { return d; }
}

export default function EmergencyLightingInspector({ row, open, onOpenChange }) {
  const asset = row?.asset;
  const compliance = row?.compliance;
  const history = row?.history || [];
  const workOrders = row?.workOrders || [];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md p-0 bg-[#FFFFFF] border-[#E2E8F0]">
        <SheetHeader className="p-5 border-b border-[#E2E8F0] bg-[#F8FAFC]">
          <SheetTitle className="text-[1.125rem] font-semibold text-[#0F172A]" style={{ fontFamily: 'Inter' }}>
            {asset?.name || 'Fitting'}
          </SheetTitle>
          <SheetDescription className="text-[0.8125rem] text-[#64748B]" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
            Asset ID {asset?.identifier || '—'} · Fitting No. {asset?.fitting_number || '—'}
          </SheetDescription>
        </SheetHeader>

        <div className="p-5 space-y-5 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 8rem)' }}>
          {/* Last test result */}
          {compliance && (
            <div className={`rounded-md border p-3 ${compliance.status === 'failed' ? 'border-[#FEE2E2] bg-[#FEF2F2]' : 'border-[#D1FAE5] bg-[#ECFDF5]'}`}>
              <div className="flex items-center gap-2 mb-1">
                {compliance.status === 'failed'
                  ? <AlertTriangle className="h-4 w-4 text-[#EF4444]" />
                  : <CheckCircle2 className="h-4 w-4 text-[#10B981]" />}
                <span className={`text-[0.8125rem] font-semibold ${compliance.status === 'failed' ? 'text-[#EF4444]' : 'text-[#10B981]'}`}>
                  Last 90-min discharge test: {compliance.status === 'failed' ? 'FAILED' : 'PASSED'}
                </span>
              </div>
              <p className="text-[0.75rem] text-[#64748B]" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                {fmtDate(compliance.inspection_date)} · Next due {fmtDate(compliance.next_due_date)}
              </p>
              {compliance.findings && (
                <p className="mt-2 text-[0.8125rem] text-[#7F1D1D]">{compliance.findings}</p>
              )}
            </div>
          )}

          {/* Fitting details */}
          <div>
            <p className="text-[0.6875rem] uppercase tracking-wide font-semibold text-[#64748B] mb-2">Fitting Details</p>
            <div className="grid grid-cols-2 gap-x-4 gap-y-3 text-[0.8125rem]">
              <Detail icon={Building} label="Building & Level" value={asset?.floor} />
              <Detail icon={MapPin} label="Location" value={asset?.location} />
              <div>
                <p className="text-[0.6875rem] text-[#64748B] mb-0.5">Fitting Type</p>
                <Badge variant="outline" className="font-medium border-[#E2E8F0] text-[#334155] bg-[#F1F5F9]">{asset?.asset_type || '—'}</Badge>
              </div>
              <Detail icon={Calendar} label="Service Frequency" value={asset?.service_frequency ? String(asset.service_frequency).replace(/_/g, ' ') : '—'} />
              <Detail icon={Calendar} label="Next Service" value={fmtDate(asset?.next_service_date)} mono />
              <Detail icon={Calendar} label="Last Service" value={fmtDate(asset?.last_service_date)} mono />
            </div>
          </div>

          {/* Contractor */}
          {compliance?.inspector_company && (
            <div className="flex items-center gap-2 text-[0.8125rem] text-[#334155]">
              <User className="h-4 w-4 text-[#64748B]" />
              <span>Last inspected by <span className="font-semibold">{compliance.inspector_company}</span></span>
            </div>
          )}

          {/* Linked work orders */}
          <div>
            <p className="text-[0.6875rem] uppercase tracking-wide font-semibold text-[#64748B] mb-2">Linked Work Orders</p>
            {workOrders.length === 0 ? (
              <p className="text-[0.8125rem] text-[#64748B]">No open work orders for this fitting.</p>
            ) : (
              <div className="space-y-2">
                {workOrders.map((w) => (
                  <div key={w.id} className="rounded-md border border-[#FEE2E2] bg-[#FEF2F2] p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <Wrench className="h-4 w-4 text-[#EF4444]" />
                      <span className="text-[0.8125rem] font-semibold text-[#0F172A]">{w.title}</span>
                    </div>
                    <p className="text-[0.75rem] text-[#64748B]">Status: <span className="font-medium text-[#EF4444]">{w.status}</span> · Priority: {w.priority}</p>
                    {w.description && <p className="mt-1 text-[0.75rem] text-[#64748B] line-clamp-3">{w.description}</p>}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 6-monthly compliance history */}
          <div>
            <p className="text-[0.6875rem] uppercase tracking-wide font-semibold text-[#64748B] mb-2">6-Monthly Compliance History</p>
            {history.length === 0 ? (
              <p className="text-[0.8125rem] text-[#64748B]">No history yet.</p>
            ) : (
              <div className="space-y-2">
                {history.map((h) => (
                  <div key={h.id} className="flex items-center justify-between rounded-md border border-[#E2E8F0] bg-[#F8FAFC] px-3 py-2">
                    <div className="flex items-center gap-2">
                      <FileText className="h-3.5 w-3.5 text-[#64748B]" />
                      <span className="text-[0.8125rem] text-[#334155]" style={{ fontFamily: 'JetBrains Mono, monospace' }}>{fmtDate(h.inspection_date)}</span>
                    </div>
                    {h.status === 'failed'
                      ? <span className="text-[0.6875rem] font-semibold text-[#EF4444]">FAIL</span>
                      : <span className="text-[0.6875rem] font-semibold text-[#10B981]">PASS</span>}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function Detail({ icon: Icon, label, value, mono }) {
  return (
    <div>
      <div className="flex items-center gap-1.5 mb-0.5">
        <Icon className="h-3.5 w-3.5 text-[#64748B]" />
        <p className="text-[0.6875rem] text-[#64748B]">{label}</p>
      </div>
      <p className={`text-[#0F172A] ${mono ? '' : ''}`} style={{ fontFamily: mono ? 'JetBrains Mono, monospace' : 'Inter' }}>{value || '—'}</p>
    </div>
  );
}