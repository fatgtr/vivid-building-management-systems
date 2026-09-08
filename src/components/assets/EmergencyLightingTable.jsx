import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Wrench, ChevronRight } from 'lucide-react';
import { format, parseISO } from 'date-fns';

function fmtDate(d) {
  if (!d) return '—';
  try { return format(parseISO(d), 'dd/MM/yyyy'); } catch { return d; }
}

function ResultPill({ status }) {
  if (status === 'passed') {
    return <span className="inline-flex items-center rounded-full bg-[#10B981] px-2.5 py-0.5 text-[0.6875rem] font-semibold text-white">PASS</span>;
  }
  if (status === 'failed') {
    return <span className="inline-flex items-center rounded-full bg-[#EF4444] px-2.5 py-0.5 text-[0.6875rem] font-semibold text-white">FAIL</span>;
  }
  return <span className="inline-flex items-center rounded-full bg-[#F1F5F9] px-2.5 py-0.5 text-[0.6875rem] font-semibold text-[#64748B]">NO TEST</span>;
}

export default function EmergencyLightingTable({ rows, onRowClick }) {
  if (rows.length === 0) {
    return (
      <div className="rounded-md border border-[#E2E8F0] bg-[#FFFFFF] p-12 text-center">
        <p className="text-[0.875rem] text-[#64748B]">No emergency or exit lighting fittings found. Import an AS 2293.1 register to populate the matrix.</p>
      </div>
    );
  }

  return (
    <>
      {/* Desktop matrix table */}
      <div className="hidden lg:block rounded-md border border-[#E2E8F0] bg-[#FFFFFF] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse" style={{ fontFamily: 'Inter' }}>
            <thead>
              <tr className="bg-[#F1F5F9] border-b border-[#E2E8F0]">
                {['Asset ID', 'Fitting No.', 'Building & Level', 'Location', 'Fitting Type', 'Last Insp', '90-Min Result', 'Failure Points / Action', 'WO'].map((h) => (
                  <th key={h} className="px-3 py-2.5 text-[0.6875rem] font-semibold uppercase tracking-wide text-[#64748B] border-r border-[#E2E8F0] last:border-r-0">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr
                  key={r.asset.id}
                  onClick={() => onRowClick(r)}
                  className="border-b border-[#E2E8F0] last:border-b-0 cursor-pointer hover:bg-[#F8FAFC] transition-colors"
                >
                  <td className="px-3 py-2.5 text-[0.8125rem] text-[#0F172A] font-semibold" style={{ fontFamily: 'JetBrains Mono, monospace' }}>{r.asset.identifier || '—'}</td>
                  <td className="px-3 py-2.5 text-[0.8125rem] text-[#334155]" style={{ fontFamily: 'JetBrains Mono, monospace' }}>{r.asset.fitting_number || '—'}</td>
                  <td className="px-3 py-2.5 text-[0.8125rem] text-[#334155]">{r.asset.floor || '—'}</td>
                  <td className="px-3 py-2.5 text-[0.8125rem] text-[#334155] max-w-[180px] truncate">{r.asset.location || '—'}</td>
                  <td className="px-3 py-2.5">
                    <Badge variant="outline" className="text-[0.6875rem] font-medium border-[#E2E8F0] text-[#334155] bg-[#F1F5F9]">{r.asset.asset_type || '—'}</Badge>
                  </td>
                  <td className="px-3 py-2.5 text-[0.8125rem] text-[#64748B]" style={{ fontFamily: 'JetBrains Mono, monospace' }}>{fmtDate(r.compliance?.inspection_date)}</td>
                  <td className="px-3 py-2.5"><ResultPill status={r.compliance?.status} /></td>
                  <td className="px-3 py-2.5 text-[0.8125rem] text-[#7F1D1D] max-w-[240px] truncate" title={r.compliance?.findings || ''}>{r.compliance?.findings || '—'}</td>
                  <td className="px-3 py-2.5">
                    {r.workOrders.length > 0 ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-[#EF4444]/10 px-2 py-0.5 text-[0.6875rem] font-semibold text-[#EF4444]">
                        <Wrench className="h-3 w-3" />{r.workOrders.length}
                      </span>
                    ) : <span className="text-[#CBD5E1]">—</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile card stack */}
      <div className="lg:hidden space-y-2">
        {rows.map((r) => (
          <button
            key={r.asset.id}
            onClick={() => onRowClick(r)}
            className="w-full text-left rounded-md border border-[#E2E8F0] bg-[#FFFFFF] p-3 active:bg-[#F1F5F9]"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-[0.8125rem] font-semibold text-[#0F172A] truncate" style={{ fontFamily: 'Inter' }}>{r.asset.name}</p>
                <p className="text-[0.75rem] text-[#64748B] truncate" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                  ID {r.asset.identifier || '—'} · {r.asset.fitting_number || '—'}
                </p>
              </div>
              <ResultPill status={r.compliance?.status} />
            </div>
            <div className="mt-2 flex items-center justify-between text-[0.75rem] text-[#64748B]">
              <span className="truncate">{r.asset.floor} · {r.asset.location}</span>
              {r.workOrders.length > 0 && (
                <span className="inline-flex items-center gap-1 text-[#EF4444] font-semibold flex-shrink-0 ml-2">
                  <Wrench className="h-3 w-3" />{r.workOrders.length}
                </span>
              )}
            </div>
          </button>
        ))}
      </div>
    </>
  );
}