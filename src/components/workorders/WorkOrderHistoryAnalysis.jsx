import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  TrendingUp, 
  AlertTriangle, 
  BarChart3, 
  Loader2, 
  RefreshCw,
  CheckCircle2,
  Clock,
  Activity
} from 'lucide-react';

export default function WorkOrderHistoryAnalysis({ buildingId, unitId, buildingName, unitNumber }) {
  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState(null);

  const handleAnalyze = async () => {
    setAnalyzing(true);
    try {
      const { data } = await base44.functions.invoke('analyzeWorkOrderHistory', {
        buildingId,
        unitId,
        analyzeRecurring: true
      });

      if (data.success) {
        setAnalysis(data);
      }
    } catch (error) {
      console.error('Analysis failed:', error);
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card className="border-2 border-blue-100">
        <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50">
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-blue-600" />
              Work Order History Analysis
            </div>
            <Button 
              onClick={handleAnalyze} 
              disabled={analyzing}
              size="sm"
              className="bg-blue-600 hover:bg-blue-700"
            >
              {analyzing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Analyze History
                </>
              )}
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          {!analysis ? (
            <div className="text-center py-8">
              <Activity className="h-12 w-12 mx-auto text-slate-300 mb-3" />
              <p className="text-sm text-slate-600 mb-4">
                Analyze work order history for {buildingName}
                {unitNumber && ` - Unit ${unitNumber}`}
              </p>
              <p className="text-xs text-slate-500">
                Get insights on trends, patterns, and recurring issues
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Summary */}
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-slate-700 leading-relaxed">{analysis.summary}</p>
              </div>

              {/* Statistics */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-slate-500">Total Orders</p>
                        <p className="text-2xl font-bold text-slate-900">
                          {analysis.statistics?.total || 0}
                        </p>
                      </div>
                      <CheckCircle2 className="h-8 w-8 text-blue-500" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-slate-500">Avg Resolution</p>
                        <p className="text-2xl font-bold text-slate-900">
                          {analysis.statistics?.avg_resolution_days 
                            ? `${Math.round(analysis.statistics.avg_resolution_days)}d`
                            : 'N/A'}
                        </p>
                      </div>
                      <Clock className="h-8 w-8 text-green-500" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-slate-500">Completed</p>
                        <p className="text-2xl font-bold text-slate-900">
                          {analysis.statistics?.by_status?.completed || 0}
                        </p>
                      </div>
                      <TrendingUp className="h-8 w-8 text-emerald-500" />
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Status Breakdown */}
              {analysis.statistics?.by_status && (
                <div>
                  <h4 className="font-semibold text-sm mb-3">Status Breakdown</h4>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(analysis.statistics.by_status).map(([status, count]) => (
                      <Badge key={status} variant="outline" className="capitalize">
                        {status}: {count}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Category Breakdown */}
              {analysis.statistics?.by_category && (
                <div>
                  <h4 className="font-semibold text-sm mb-3">Category Breakdown</h4>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(analysis.statistics.by_category).map(([category, count]) => (
                      <Badge key={category} variant="outline" className="capitalize">
                        {category.replace(/_/g, ' ')}: {count}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Trends */}
              {analysis.trends && analysis.trends.length > 0 && (
                <div>
                  <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-blue-600" />
                    Key Trends
                  </h4>
                  <ul className="space-y-2">
                    {analysis.trends.map((trend, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-sm text-slate-600">
                        <span className="text-blue-600 mt-1">•</span>
                        <span>{trend}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Recurring Issues */}
              {analysis.recurringIssues && analysis.recurringIssues.length > 0 && (
                <div>
                  <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-orange-600" />
                    Recurring Issues Detected
                  </h4>
                  <div className="space-y-3">
                    {analysis.recurringIssues.map((issue, idx) => (
                      <Alert key={idx} className={`${
                        issue.severity === 'high' ? 'border-red-200 bg-red-50' :
                        issue.severity === 'medium' ? 'border-orange-200 bg-orange-50' :
                        'border-yellow-200 bg-yellow-50'
                      }`}>
                        <AlertTriangle className={`h-4 w-4 ${
                          issue.severity === 'high' ? 'text-red-600' :
                          issue.severity === 'medium' ? 'text-orange-600' :
                          'text-yellow-600'
                        }`} />
                        <AlertDescription className="ml-6">
                          <div className="space-y-2">
                            <div className="flex items-start justify-between gap-2">
                              <p className="font-medium text-slate-900">{issue.issue}</p>
                              <div className="flex items-center gap-2 flex-shrink-0">
                                <Badge variant="outline" className="capitalize">
                                  {issue.severity}
                                </Badge>
                                <Badge variant="outline">
                                  {issue.frequency}x
                                </Badge>
                              </div>
                            </div>
                            <p className="text-sm text-slate-600">
                              <strong>Recommendation:</strong> {issue.recommendation}
                            </p>
                          </div>
                        </AlertDescription>
                      </Alert>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}