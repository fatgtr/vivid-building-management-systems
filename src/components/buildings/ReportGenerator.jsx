import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { FileText, Download, Loader2, CheckCircle2, AlertCircle, Mail, Calendar } from 'lucide-react';
import { toast } from 'sonner';

export default function ReportGenerator({ buildingId, buildingName }) {
  const [generating, setGenerating] = useState(false);
  const [sending, setSending] = useState(false);
  const [reportUrl, setReportUrl] = useState(null);
  const [reportPeriod, setReportPeriod] = useState('last_month');
  const [recipientsNotified, setRecipientsNotified] = useState(0);
  const [recipientEmails, setRecipientEmails] = useState([]);

  const handleGenerateReport = async () => {
    setGenerating(true);
    setReportUrl(null);
    setRecipientsNotified(0);
    setRecipientEmails([]);

    try {
      const { data } = await base44.functions.invoke('generateMaintenanceReport', {
        buildingId,
        reportPeriod,
        sendEmail: false
      });

      if (data.success) {
        setReportUrl(data.report_url);
        setRecipientEmails(data.recipient_emails || []);
        toast.success('Report generated successfully! Review it before sending.');
      } else {
        toast.error('Failed to generate report');
      }
    } catch (error) {
      console.error('Report generation error:', error);
      toast.error('Failed to generate report: ' + error.message);
    } finally {
      setGenerating(false);
    }
  };

  const handleEmailReport = async () => {
    setSending(true);

    try {
      const { data } = await base44.functions.invoke('generateMaintenanceReport', {
        buildingId,
        reportPeriod,
        sendEmail: true
      });

      if (data.success) {
        setRecipientsNotified(data.recipients_notified);
        toast.success(`Report emailed to ${data.recipients_notified} recipient(s)!`);
      } else {
        toast.error('Failed to send report');
      }
    } catch (error) {
      console.error('Email sending error:', error);
      toast.error('Failed to send report: ' + error.message);
    } finally {
      setSending(false);
    }
  };

  return (
    <Card className="border-2 border-blue-100">
      <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50">
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-blue-600" />
          Generate Building Managers Report
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-6 space-y-4">
        <div>
          <label className="text-sm font-semibold text-slate-700 mb-2 block">
            Report Period
          </label>
          <Select value={reportPeriod} onValueChange={setReportPeriod} disabled={generating}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="last_month">Last Month</SelectItem>
              <SelectItem value="last_quarter">Last Quarter</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Alert className="border-blue-200 bg-blue-50">
          <Calendar className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-sm text-slate-700">
            This report will include:
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>Executive summary with AI analysis</li>
              <li>Key metrics and work order statistics</li>
              <li>Recurring issues identification</li>
              <li>Detailed work order listings with before/after photos</li>
              <li>Budget insights and recommendations</li>
            </ul>
          </AlertDescription>
        </Alert>

        <Button
          onClick={handleGenerateReport}
          disabled={generating || reportUrl}
          className="w-full bg-blue-600 hover:bg-blue-700"
        >
          {generating ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Generating Report...
            </>
          ) : (
            <>
              <FileText className="h-4 w-4 mr-2" />
              Generate Report
            </>
          )}
        </Button>

        {reportUrl && (
          <div className="space-y-3 pt-3 border-t border-slate-200">
            <div className="flex items-center gap-2 text-green-600">
              <CheckCircle2 className="h-5 w-5" />
              <span className="font-medium">Report Generated Successfully!</span>
            </div>

            <Button
              variant="outline"
              className="w-full"
              onClick={() => window.open(reportUrl, '_blank')}
            >
              <Download className="h-4 w-4 mr-2" />
              View Report PDF
            </Button>

            {recipientEmails.length > 0 && (
              <Button
                onClick={handleEmailReport}
                disabled={sending || recipientsNotified > 0}
                className="w-full bg-green-600 hover:bg-green-700"
              >
                {sending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Sending...
                  </>
                ) : recipientsNotified > 0 ? (
                  <>
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    Email Sent
                  </>
                ) : (
                  <>
                    <Mail className="h-4 w-4 mr-2" />
                    Send Report to {recipientEmails.length} Recipient(s)
                  </>
                )}
              </Button>
            )}

            {recipientsNotified > 0 && (
              <Alert className="border-green-200 bg-green-50">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-sm text-green-800">
                  Report emailed to {recipientsNotified} recipient(s) (strata committee members and manager)
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}