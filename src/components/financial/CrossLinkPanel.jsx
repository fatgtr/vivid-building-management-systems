import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Card, CardContent } from '@/components/ui/card';
import { TrendingUp, BarChart3, Sparkles, FileText, ChevronRight } from 'lucide-react';

// Reusable cross-link panel listing the sibling Financial & Planning pages
// with a one-line shared-data stat each. `currentPage` is omitted from the list.
export default function CrossLinkPanel({ currentPage, stats }) {
  const links = [
    { name: 'Financial', page: 'FinancialManagement', icon: FileText, stat: stats?.financial, color: 'text-blue-600' },
    { name: 'Capital Works', page: 'CapitalWorksPlanning', icon: TrendingUp, stat: stats?.capital, color: 'text-indigo-600' },
    { name: 'Analytics', page: 'AnalyticsDashboard', icon: BarChart3, stat: stats?.analytics, color: 'text-purple-600' },
    { name: 'Predictive AI', page: 'PredictiveMaintenance', icon: Sparkles, stat: stats?.predictive, color: 'text-cyan-600' },
  ].filter((l) => l.page !== currentPage);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      {links.map((l) => (
        <Link key={l.page} to={createPageUrl(l.page)}>
          <Card className="hover:shadow-md hover:border-slate-300 transition-all cursor-pointer h-full">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-slate-50">
                <l.icon className={`h-5 w-5 ${l.color}`} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-800">{l.name}</p>
                {l.stat && <p className="text-xs text-slate-500 truncate">{l.stat}</p>}
              </div>
              <ChevronRight className="h-4 w-4 text-slate-400" />
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  );
}