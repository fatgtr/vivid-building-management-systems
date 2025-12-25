import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  FileText, 
  Loader2, 
  AlertTriangle, 
  CheckCircle2, 
  AlertCircle,
  Shield,
  TrendingUp,
  Clock,
  Download
} from 'lucide-react';
import { toast } from 'sonner';

const riskColors = {
  'critical': 'bg-red-100 text-red-800 border-red-300',
  'high': 'bg-orange-100 text-orange-800 border-orange-300',
  'medium': 'bg-yellow-100 text-yellow-800 border-yellow-300',
  'low': 'bg-green-100 text-green-800 border-green-300'
};

const priorityColors = {
  'critical': 'bg-red-500 text-white',
  'high': 'bg-orange-500 text-white',
  'medium': 'bg-yellow-500 text-white',
  'low': 'bg-green-500 text-white'
};

export default function ComplianceReportDialog({ asset, open, onOpenChange }) {
  const [report, setReport] = useState(null);

  const generateReportMutation = useMutation({
    mutationFn: async () => {
      const { data } = await base44.functions.invoke('generateAssetComplianceReport', {
        asset_id: asset.id
      });
      return data;
    },
    onSuccess: (data) => {
      if (data.success) {
        setReport(data.report);
        toast.success('Compliance report generated successfully');
      } else {
        toast.error(data.error || 'Failed to generate report');
      }
    },
    onError: () => {
      toast.error('Failed to generate compliance report');
    }
  });

  const handleClose = () => {
    setReport(null);
    onOpenChange(false);
  };

  const downloadReport = () => {
    const reportText = `
ASSET COMPLIANCE REPORT
Generated: ${new Date().toLocaleDateString()}
Asset: ${asset.name}
Type: ${asset.asset_type}

${report.executive_summary}

Risk Level: ${report.risk_level}
Compliance Score: ${report.overall_compliance_score}/100

CRITICAL RISKS:
${report.risk_assessment.critical_risks.map(r => `• ${r}`).join('\n')}

PREVENTATIVE MEASURES:
${report.preventative_measures.map((m, i) => `${i + 1}. ${m}`).join('\n')}

NEXT STEPS:
${report.next_steps.map(s => `• [${s.priority.toUpperCase()}] ${s.action} - ${s.timeframe}`).join('\n')}
    `;

    const blob = new Blob([reportText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `compliance-report-${asset.name.replace(/\s+/g, '-')}-${Date.now()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-5xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            AI Compliance Report - {asset?.name}
          </DialogTitle>
        </DialogHeader>

        {!report ? (
          <div className="py-12 text-center">
            {generateReportMutation.isPending ? (
              <div className="space-y-4">
                <Loader2 className="h-12 w-12 animate-spin mx-auto text-blue-600" />
                <div>
                  <p className="font-medium text-slate-900">Analyzing Asset Data...</p>
                  <p className="text-sm text-slate-500 mt-1">
                    Reviewing service history, compliance records, and inspection data
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <FileText className="h-12 w-12 mx-auto text-slate-300" />
                <div>
                  <p className="font-medium text-slate-900 mb-2">Generate AI Compliance Report</p>
                  <p className="text-sm text-slate-500 mb-4">
                    Comprehensive analysis of asset compliance, risks, and recommendations
                  </p>
                  <Button onClick={() => generateReportMutation.mutate()} className="gap-2">
                    <FileText className="h-4 w-4" />
                    Generate Report
                  </Button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <ScrollArea className="h-[70vh] pr-4">
            <div className="space-y-4">
              {/* Header Stats */}
              <div className="grid grid-cols-3 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs text-slate-500 mb-1">Compliance Score</p>
                        <p className="text-2xl font-bold">{report.overall_compliance_score}/100</p>
                      </div>
                      <TrendingUp className="h-8 w-8 text-blue-600" />
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs text-slate-500 mb-1">Risk Level</p>
                        <Badge className={riskColors[report.risk_level.toLowerCase()] || riskColors.medium}>
                          {report.risk_level}
                        </Badge>
                      </div>
                      <Shield className="h-8 w-8 text-orange-600" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs text-slate-500 mb-1">Generated</p>
                        <p className="text-sm font-medium">{new Date().toLocaleDateString()}</p>
                      </div>
                      <Clock className="h-8 w-8 text-slate-600" />
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Executive Summary */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Executive Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-slate-700 leading-relaxed">{report.executive_summary}</p>
                </CardContent>
              </Card>

              {/* Risk Assessment */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-orange-600" />
                    Risk Assessment
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {report.risk_assessment.critical_risks.length > 0 && (
                    <div>
                      <p className="text-sm font-semibold text-red-700 mb-2">Critical Risks:</p>
                      <ul className="space-y-1">
                        {report.risk_assessment.critical_risks.map((risk, idx) => (
                          <li key={idx} className="text-sm text-slate-700 flex items-start gap-2">
                            <AlertCircle className="h-4 w-4 text-red-600 flex-shrink-0 mt-0.5" />
                            {risk}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  
                  {report.risk_assessment.moderate_risks.length > 0 && (
                    <div>
                      <p className="text-sm font-semibold text-orange-700 mb-2">Moderate Risks:</p>
                      <ul className="space-y-1">
                        {report.risk_assessment.moderate_risks.map((risk, idx) => (
                          <li key={idx} className="text-sm text-slate-700 flex items-start gap-2">
                            <AlertCircle className="h-4 w-4 text-orange-600 flex-shrink-0 mt-0.5" />
                            {risk}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {report.risk_assessment.observations.length > 0 && (
                    <div>
                      <p className="text-sm font-semibold text-slate-700 mb-2">Observations:</p>
                      <ul className="space-y-1">
                        {report.risk_assessment.observations.map((obs, idx) => (
                          <li key={idx} className="text-sm text-slate-600">• {obs}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Service History Analysis */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Service History Analysis</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <p className="text-xs font-medium text-slate-500 mb-1">Maintenance Quality:</p>
                    <p className="text-sm text-slate-700">{report.service_history_analysis.maintenance_quality}</p>
                  </div>
                  
                  {report.service_history_analysis.recurring_issues.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-slate-500 mb-1">Recurring Issues:</p>
                      <ul className="text-sm text-slate-700 space-y-1">
                        {report.service_history_analysis.recurring_issues.map((issue, idx) => (
                          <li key={idx}>• {issue}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {report.service_history_analysis.service_gaps.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-slate-500 mb-1">Service Gaps:</p>
                      <ul className="text-sm text-slate-700 space-y-1">
                        {report.service_history_analysis.service_gaps.map((gap, idx) => (
                          <li key={idx}>• {gap}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Compliance Status */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                    Compliance Status
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-slate-700">{report.compliance_status.current_standing}</p>
                  
                  {report.compliance_status.upcoming_deadlines.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-slate-500 mb-1">Upcoming Deadlines:</p>
                      <ul className="text-sm text-slate-700 space-y-1">
                        {report.compliance_status.upcoming_deadlines.map((deadline, idx) => (
                          <li key={idx}>• {deadline}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {report.compliance_status.expired_items.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-red-700 mb-1">Expired Items:</p>
                      <ul className="text-sm text-red-600 space-y-1">
                        {report.compliance_status.expired_items.map((item, idx) => (
                          <li key={idx}>• {item}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Preventative Measures */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Preventative Measures</CardTitle>
                </CardHeader>
                <CardContent>
                  <ol className="space-y-2">
                    {report.preventative_measures.map((measure, idx) => (
                      <li key={idx} className="text-sm text-slate-700">
                        <span className="font-medium">{idx + 1}.</span> {measure}
                      </li>
                    ))}
                  </ol>
                </CardContent>
              </Card>

              {/* Next Steps */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Recommended Next Steps</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {report.next_steps.map((step, idx) => (
                      <div key={idx} className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg">
                        <Badge className={priorityColors[step.priority.toLowerCase()]}>
                          {step.priority}
                        </Badge>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-900">{step.action}</p>
                          <p className="text-xs text-slate-500 mt-0.5">Timeframe: {step.timeframe}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Actions */}
              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={downloadReport}>
                  <Download className="h-4 w-4 mr-2" />
                  Download Report
                </Button>
                <Button onClick={handleClose}>Close</Button>
              </div>
            </div>
          </ScrollArea>
        )}
      </DialogContent>
    </Dialog>
  );
}