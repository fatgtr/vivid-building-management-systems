import React from 'react';
import { CheckCircle2, FileText, Link2, AlertTriangle, ShieldCheck, Wrench, Calendar } from 'lucide-react';

// Consistent import-result summary shown by every AI importer after the backend
// extracts + persists + links. Accepts the standardized summary shape returned by
// the shared assetImport module: { created, updated, unmatched, documentId, linked }
// plus optional extras (complianceRecords, maintenanceSchedules, workOrders).
export default function ImportSummary({ summary, onDone, doneLabel = 'Done' }) {
  if (!summary) return null;
  const cards = [
    { label: 'Created', value: summary.created, icon: CheckCircle2, tone: 'text-emerald-600 bg-emerald-50 border-emerald-200' },
    { label: 'Updated', value: summary.updated, icon: FileText, tone: 'text-blue-600 bg-blue-50 border-blue-200' },
    { label: 'Linked to doc', value: summary.linked, icon: Link2, tone: 'text-violet-600 bg-violet-50 border-violet-200' },
    { label: 'Unmatched', value: summary.unmatched, icon: AlertTriangle, tone: 'text-amber-600 bg-amber-50 border-amber-200' }
  ];
  if (summary.complianceRecords) cards.push({ label: 'Compliance', value: summary.complianceRecords, icon: ShieldCheck, tone: 'text-teal-600 bg-teal-50 border-teal-200' });
  if (summary.maintenanceSchedules) cards.push({ label: 'Schedules', value: summary.maintenanceSchedules, icon: Calendar, tone: 'text-cyan-600 bg-cyan-50 border-cyan-200' });
  if (summary.workOrders) cards.push({ label: 'Work orders', value: summary.workOrders, icon: Wrench, tone: 'text-red-600 bg-red-50 border-red-200' });

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-emerald-700">
        <CheckCircle2 className="h-6 w-6" />
        <p className="text-lg font-bold">Import complete</p>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {cards.map((c) => (
          <div key={c.label} className={`rounded-lg border p-3 text-center ${c.tone}`}>
            <c.icon className="h-5 w-5 mx-auto mb-1" />
            <p className="text-2xl font-bold">{c.value}</p>
            <p className="text-xs font-medium">{c.label}</p>
          </div>
        ))}
      </div>
      {summary.unmatchedSample && summary.unmatchedSample.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-slate-700 mb-1">Sample unmatched rows</p>
          <div className="border border-slate-200 rounded-md overflow-hidden max-h-40 overflow-y-auto">
            <table className="w-full text-xs">
              <tbody>
                {summary.unmatchedSample.map((u, i) => (
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
      {onDone && (
        <div className="flex justify-end">
          <button
            onClick={onDone}
            className="px-4 py-2 rounded-md bg-slate-900 text-white text-sm font-medium hover:bg-slate-800"
          >
            {doneLabel}
          </button>
        </div>
      )}
    </div>
  );
}