import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Sparkles, 
  Calendar, 
  AlertTriangle,
  Lightbulb,
  TrendingUp,
  Loader2,
  Clock,
  Target
} from 'lucide-react';
import { format } from 'date-fns';

export default function AISchedulingAssistant({ workOrder, buildingId }) {
  const [schedulingAnalysis, setSchedulingAnalysis] = useState(null);
  const [recurringAnalysis, setRecurringAnalysis] = useState(null);
  const [loading, setLoading] = useState({ scheduling: false, recurring: false });

  const analyzeScheduling = async () => {
    setLoading({ ...loading, scheduling: true });
    try {
      const result = await base44.functions.invoke('analyzeWorkOrderScheduling', {
        workOrderId: workOrder.id
      });
      setSchedulingAnalysis(result.data);
    } catch (error) {
      console.error('Error analyzing scheduling:', error);
    } finally {
      setLoading({ ...loading, scheduling: false });
    }
  };

  const analyzeRecurring = async () => {
    setLoading({ ...loading, recurring: true });
    try {
      const result = await base44.functions.invoke('analyzeRecurringIssues', {
        buildingId
      });
      setRecurringAnalysis(result.data);
    } catch (error) {
      console.error('Error analyzing recurring issues:', error);
    } finally {
      setLoading({ ...loading, recurring: false });
    }
  };

  const getSeverityColor = (severity) => {
    const colors = {
      low: 'bg-blue-100 text-blue-800',
      medium: 'bg-yellow-100 text-yellow-800',
      high: 'bg-orange-100 text-orange-800',
      critical: 'bg-red-100 text-red-800'
    };
    return colors[severity] || colors.medium;
  };

  return (
    <div className="space-y-4">
      {/* Scheduling Analysis */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-blue-600" />
              AI Scheduling Recommendations
            </span>
            {!schedulingAnalysis && (
              <Button 
                onClick={analyzeScheduling}
                disabled={loading.scheduling}
                size="sm"
                className="bg-blue-600 hover:bg-blue-700"
              >
                {loading.scheduling ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    Analyze
                  </>
                )}
              </Button>
            )}
          </CardTitle>
        </CardHeader>
        {schedulingAnalysis && (
          <CardContent className="space-y-4">
            {/* Scheduling Score */}
            <div className="flex items-center gap-3 p-4 bg-blue-50 rounded-lg">
              <Target className="h-8 w-8 text-blue-600" />
              <div>
                <p className="text-sm text-blue-600 font-medium">Scheduling Priority Score</p>
                <p className="text-2xl font-bold text-blue-900">
                  {schedulingAnalysis.scheduling_score}/10
                </p>
              </div>
            </div>

            {/* Recommended Date */}
            {schedulingAnalysis.recommended_date && (
              <Alert className="bg-green-50 border-green-200">
                <Calendar className="h-4 w-4 text-green-600" />
                <AlertDescription>
                  <div className="space-y-1">
                    <p className="font-medium text-green-900">Recommended Schedule</p>
                    <p className="text-sm text-green-800">
                      <strong>Date:</strong> {format(new Date(schedulingAnalysis.recommended_date), 'EEEE, MMMM d, yyyy')}
                    </p>
                    {schedulingAnalysis.recommended_time_window && (
                      <p className="text-sm text-green-800">
                        <strong>Time:</strong> {schedulingAnalysis.recommended_time_window}
                      </p>
                    )}
                  </div>
                </AlertDescription>
              </Alert>
            )}

            {/* Conflicts */}
            {schedulingAnalysis.conflicts && schedulingAnalysis.conflicts.length > 0 && (
              <div>
                <h4 className="font-medium text-sm text-slate-900 mb-2 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-orange-600" />
                  Potential Conflicts
                </h4>
                <ul className="space-y-1">
                  {schedulingAnalysis.conflicts.map((conflict, idx) => (
                    <li key={idx} className="text-sm text-slate-700 flex items-start gap-2">
                      <span className="text-orange-600 mt-1">•</span>
                      <span>{conflict}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Recommendations */}
            {schedulingAnalysis.recommendations && schedulingAnalysis.recommendations.length > 0 && (
              <div>
                <h4 className="font-medium text-sm text-slate-900 mb-2 flex items-center gap-2">
                  <Lightbulb className="h-4 w-4 text-blue-600" />
                  Scheduling Tips
                </h4>
                <ul className="space-y-2">
                  {schedulingAnalysis.recommendations.map((rec, idx) => (
                    <li key={idx} className="text-sm text-slate-700 flex items-start gap-2 p-2 bg-slate-50 rounded">
                      <span className="text-blue-600 mt-1">✓</span>
                      <span>{rec}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Alternative Dates */}
            {schedulingAnalysis.alternative_dates && schedulingAnalysis.alternative_dates.length > 0 && (
              <div>
                <h4 className="font-medium text-sm text-slate-900 mb-2">Alternative Dates</h4>
                <div className="flex flex-wrap gap-2">
                  {schedulingAnalysis.alternative_dates.map((date, idx) => (
                    <Badge key={idx} variant="outline">
                      <Clock className="h-3 w-3 mr-1" />
                      {format(new Date(date), 'MMM d')}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        )}
      </Card>

      {/* Recurring Issues Analysis */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-purple-600" />
              Recurring Issues & Preventative Maintenance
            </span>
            {!recurringAnalysis && (
              <Button 
                onClick={analyzeRecurring}
                disabled={loading.recurring}
                size="sm"
                className="bg-purple-600 hover:bg-purple-700"
              >
                {loading.recurring ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    Analyze Building
                  </>
                )}
              </Button>
            )}
          </CardTitle>
        </CardHeader>
        {recurringAnalysis && (
          <CardContent className="space-y-4">
            {/* Summary */}
            <Alert className="bg-purple-50 border-purple-200">
              <TrendingUp className="h-4 w-4 text-purple-600" />
              <AlertDescription>
                <p className="text-sm text-purple-900">
                  Analyzed <strong>{recurringAnalysis.total_work_orders_analyzed}</strong> work orders 
                  from the last <strong>{recurringAnalysis.analysis_period}</strong>
                </p>
              </AlertDescription>
            </Alert>

            {/* Key Insights */}
            {recurringAnalysis.insights && recurringAnalysis.insights.length > 0 && (
              <div>
                <h4 className="font-medium text-sm text-slate-900 mb-2">Key Insights</h4>
                <div className="space-y-2">
                  {recurringAnalysis.insights.map((insight, idx) => (
                    <p key={idx} className="text-sm text-slate-700 p-2 bg-slate-50 rounded">
                      {insight}
                    </p>
                  ))}
                </div>
              </div>
            )}

            {/* Recurring Issues */}
            {recurringAnalysis.recurring_issues && recurringAnalysis.recurring_issues.length > 0 && (
              <div>
                <h4 className="font-medium text-sm text-slate-900 mb-3">Recurring Issues</h4>
                <div className="space-y-2">
                  {recurringAnalysis.recurring_issues.map((issue, idx) => (
                    <Card key={idx} className="border-l-4 border-l-orange-500">
                      <CardContent className="p-3">
                        <div className="flex items-start justify-between mb-2">
                          <h5 className="font-medium text-sm">{issue.issue_type}</h5>
                          <Badge className={getSeverityColor(issue.severity)}>
                            {issue.severity}
                          </Badge>
                        </div>
                        <p className="text-xs text-slate-600 mb-1">{issue.description}</p>
                        <div className="flex items-center gap-2 text-xs text-slate-500">
                          <Badge variant="outline" className="text-xs">
                            {issue.category}
                          </Badge>
                          <span>Occurred {issue.frequency}x</span>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* Preventative Actions */}
            {recurringAnalysis.preventative_actions && recurringAnalysis.preventative_actions.length > 0 && (
              <div>
                <h4 className="font-medium text-sm text-slate-900 mb-3 flex items-center gap-2">
                  <Lightbulb className="h-4 w-4 text-green-600" />
                  Recommended Preventative Maintenance
                </h4>
                <div className="space-y-3">
                  {recurringAnalysis.preventative_actions.map((action, idx) => (
                    <Card key={idx} className="bg-green-50 border-green-200">
                      <CardContent className="p-4">
                        <h5 className="font-medium text-sm text-green-900 mb-1">{action.action}</h5>
                        <p className="text-xs text-green-800 mb-2">{action.reasoning}</p>
                        <div className="flex items-center gap-3 text-xs">
                          {action.recommended_frequency && (
                            <Badge variant="outline" className="bg-white">
                              <Clock className="h-3 w-3 mr-1" />
                              {action.recommended_frequency}
                            </Badge>
                          )}
                          {action.estimated_savings && (
                            <span className="text-green-700 font-medium">
                              💰 {action.estimated_savings}
                            </span>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* Cost Analysis */}
            {recurringAnalysis.cost_analysis && (
              <Alert className="bg-green-50 border-green-200">
                <AlertDescription>
                  <p className="text-sm text-green-900 font-medium mb-1">Cost Analysis</p>
                  <p className="text-sm text-green-800">{recurringAnalysis.cost_analysis}</p>
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        )}
      </Card>
    </div>
  );
}