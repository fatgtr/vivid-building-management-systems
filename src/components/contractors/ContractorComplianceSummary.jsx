import React from 'react';
import { Shield, CheckCircle, AlertTriangle, XCircle, HelpCircle } from 'lucide-react';

const getComplianceStatus = (contractor) => {
  const today = new Date();
  const thirtyDaysFromNow = new Date(today);
  thirtyDaysFromNow.setDate(today.getDate() + 30);

  const expiryDates = [
    contractor.license_expiry_date,
    contractor.insurance_expiry,
    contractor.work_cover_expiry_date,
    contractor.public_liability_expiry_date,
  ].filter(Boolean);

  if (expiryDates.length === 0) return 'unknown';
  if (expiryDates.some(date => new Date(date) < today)) return 'non_compliant';
  if (expiryDates.some(date => { const d = new Date(date); return d >= today && d <= thirtyDaysFromNow; })) return 'expiring_soon';
  return 'compliant';
};

export default function ContractorComplianceSummary({ contractors }) {
  const counts = contractors.reduce((acc, c) => {
    const status = getComplianceStatus(c);
    acc[status] = (acc[status] || 0) + 1;
    return acc;
  }, {});

  const stats = [
    { label: 'Compliant', count: counts.compliant || 0, icon: CheckCircle, bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-700', iconColor: 'text-green-600' },
    { label: 'Not Compliant', count: counts.non_compliant || 0, icon: XCircle, bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-700', iconColor: 'text-red-600' },
    { label: 'Expiring Soon (30 days)', count: counts.expiring_soon || 0, icon: AlertTriangle, bg: 'bg-yellow-50', border: 'border-yellow-200', text: 'text-yellow-700', iconColor: 'text-yellow-600' },
    { label: 'Not Tracking', count: counts.unknown || 0, icon: HelpCircle, bg: 'bg-slate-50', border: 'border-slate-200', text: 'text-slate-600', iconColor: 'text-slate-500' },
  ];

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center gap-2 mb-4">
        <Shield className="h-5 w-5 text-blue-600" />
        <h3 className="font-semibold text-slate-900">Vendor Insurance Compliance Summary</h3>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {stats.map(({ label, count, icon: Icon, bg, border, text, iconColor }) => (
          <div key={label} className={`${bg} border ${border} rounded-lg p-4 flex flex-col items-center text-center`}>
            <Icon className={`h-6 w-6 ${iconColor} mb-1`} />
            <span className={`text-2xl font-bold ${text}`}>{count}</span>
            <span className={`text-xs ${text} mt-1`}>{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}