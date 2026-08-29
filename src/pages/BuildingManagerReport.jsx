import React, { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useBuildingContext } from '@/components/BuildingContext';
import PageHeader from '@/components/common/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Building2, FileText, Download, Loader2, Calendar, FileDown, Mail } from 'lucide-react';
import { toast } from 'sonner';
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns';

const PERIOD_OPTIONS = [
  { value: 'all', label: 'All Open Cases' },
  { value: 'last_month', label: 'Last Month' },
  { value: 'last_quarter', label: 'Last Quarter' },
  { value: 'this_year', label: 'This Year' }
];

export default function BuildingManagerReport() {
  const { selectedBuildingId, managedBuildings } = useBuildingContext();
  const queryClient = useQueryClient();
  const [period, setPeriod] = useState('all');
  const [managementComment, setManagementComment] = useState('');
  const [brandOverride, setBrandOverride] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [lastReport, setLastReport] = useState(null);

  const building = managedBuildings.find(b => b.id === selectedBuildingId);

  // Recent generated Building Manager Reports for this building
  const { data: recentReports = [], isLoading: recentLoading } = useQuery({
    queryKey: ['bm-reports', selectedBuildingId],
    queryFn: async () => {
      if (!selectedBuildingId) return [];
      const docs = await base44.entities.Document.filter({ building_id: selectedBuildingId });
      return docs
        .filter(d => d.category === 'report' && (d.tags || []).includes('building-manager-report'))
        .sort((a, b) => new Date(b.created_date) - new Date(a.created_date))
        .slice(0, 8);
    },
    enabled: !!selectedBuildingId
  });

  const computePeriod = () => {
    if (period === 'all') return { periodStart: null, periodEnd: null };
    const now = new Date();
    if (period === 'last_month') {
      const start = startOfMonth(subMonths(now, 1));
      const end = endOfMonth(subMonths(now, 1));
      return { periodStart: format(start, 'yyyy-MM-dd'), periodEnd: format(end, 'yyyy-MM-dd') };
    }
    if (period === 'last_quarter') {
      const start = startOfMonth(subMonths(now, 3));
      const end = endOfMonth(now);
      return { periodStart: format(start, 'yyyy-MM-dd'), periodEnd: format(end, 'yyyy-MM-dd') };
    }
    if (period === 'this_year') {
      const start = new Date(now.getFullYear(), 0, 1);
      const end = new Date(now.getFullYear(), 11, 31);
      return { periodStart: format(start, 'yyyy-MM-dd'), periodEnd: format(end, 'yyyy-MM-dd') };
    }
    return { periodStart: null, periodEnd: null };
  };

  const handleGenerate = async (sendEmailFlag = false) => {
    if (!selectedBuildingId) {
      toast.error('Please select a building');
      return;
    }
    if (sendEmailFlag) setSendingEmail(true);
    else setIsGenerating(true);
    try {
      const { periodStart, periodEnd } = computePeriod();
      const res = await base44.functions.invoke('generateBuildingManagerReport', {
        buildingId: selectedBuildingId,
        periodStart,
        periodEnd,
        managementComment,
        partnerBrandOverride: brandOverride || undefined,
        sendEmail: sendEmailFlag
      });
      const data = res.data || res;
      if (data && data.file_url) {
        setLastReport(data);
        if (sendEmailFlag) {
          toast.success(`Report emailed · Document saved`);
        } else {
          toast.success('Building Manager Report generated');
          window.open(data.file_url, '_blank');
        }
        queryClient.invalidateQueries(['bm-reports', selectedBuildingId]);
      } else {
        toast.error(data?.error || 'Report generation failed');
      }
    } catch (e) {
      console.error(e);
      const msg = e?.response?.data?.error || e.message || 'Report generation failed';
      toast.error(msg);
    } finally {
      setIsGenerating(false);
      setSendingEmail(false);
    }
  };

  if (!selectedBuildingId) {
    return (
      <div className="space-y-6">
        <PageHeader title="Building Manager Report" subtitle="Generate a white-label Building Manager Report for a building" />
        <Card>
          <CardContent className="py-16 flex flex-col items-center justify-center">
            <Building2 className="h-12 w-12 text-slate-300 mb-3" />
            <p className="text-slate-500">Please select a building to generate the report.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const busy = isGenerating || sendingEmail;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Building Manager Report"
        subtitle={building ? `${building.name}${building.strata_plan_number ? ` · ${building.strata_plan_number}` : ''}` : 'Select a building'}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Generator */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-blue-600" />
              Generate Report
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Reporting Period</Label>
                <Select value={period} onValueChange={setPeriod}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PERIOD_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                  </SelectContent>
                </Select>
                <p className="text-xs text-slate-500 mt-1">Determines which cases appear in the report.</p>
              </div>
              <div>
                <Label>Cover Brand Name (optional)</Label>
                <Input
                  value={brandOverride}
                  onChange={(e) => setBrandOverride(e.target.value)}
                  placeholder="Defaults to partner / strata managing agent"
                />
                <p className="text-xs text-slate-500 mt-1">White-label company name on the cover page.</p>
              </div>
            </div>

            <div>
              <Label>Management Comment</Label>
              <Textarea
                value={managementComment}
                onChange={(e) => setManagementComment(e.target.value)}
                rows={5}
                placeholder="Notes and commentary for the committee this reporting period…"
              />
              <p className="text-xs text-slate-500 mt-1">Appears in the Management Comment section of the report.</p>
            </div>

            <div className="flex flex-wrap gap-3 pt-2">
              <Button onClick={() => handleGenerate(false)} disabled={busy} className="bg-blue-600 hover:bg-blue-700">
                {isGenerating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <FileDown className="h-4 w-4 mr-2" />}
                {isGenerating ? 'Generating…' : 'Generate & Download'}
              </Button>
              <Button onClick={() => handleGenerate(true)} disabled={busy} variant="outline">
                {sendingEmail ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Mail className="h-4 w-4 mr-2" />}
                {sendingEmail ? 'Sending…' : 'Generate & Email'}
              </Button>
            </div>

            {lastReport && (
              <div className="mt-2 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm">
                <div className="font-medium text-emerald-800 flex items-center gap-2">
                  <FileText className="h-4 w-4" /> Report generated · {lastReport.date}
                </div>
                <div className="text-emerald-700 mt-1">
                  {lastReport.totals.cases} cases ({lastReport.totals.completed} completed, {lastReport.totals.open} open) · {lastReport.totals.scheduled_total} scheduled maintenance tasks
                </div>
                {lastReport.email?.sent > 0 && (
                  <div className="text-emerald-700 mt-1">Emailed to {lastReport.email.recipients.join(', ')}</div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent reports */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-blue-600" />
              Recent Reports
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recentLoading ? (
              <div className="flex items-center gap-2 text-slate-500 text-sm"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</div>
            ) : recentReports.length === 0 ? (
              <p className="text-sm text-slate-500">No Building Manager Reports generated yet.</p>
            ) : (
              <ul className="space-y-2">
                {recentReports.map(r => (
                  <li key={r.id} className="rounded-lg border border-slate-200 p-3 hover:border-blue-300 transition-colors">
                    <div className="text-sm font-medium text-slate-900 truncate">{r.title}</div>
                    <div className="text-xs text-slate-500">{format(new Date(r.created_date), 'dd/MM/yyyy HH:mm')}</div>
                    <a href={r.file_url} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1 text-xs text-blue-600 hover:underline">
                      <Download className="h-3 w-3" /> Download PDF
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Architecture reference */}
      <Card>
        <CardContent className="pt-6 text-xs text-slate-500 space-y-1">
          <p><strong className="text-slate-700">Report structure:</strong> Cover (building image, site address, brand name, DD/MM/YYYY) → Executive Summary → Case Overview → Scheduled Maintenance Status → Management Comment → Detailed Cases.</p>
          <p>This template is reusable across all buildings and auto-schedules per each building's reporting frequency.</p>
        </CardContent>
      </Card>
    </div>
  );
}