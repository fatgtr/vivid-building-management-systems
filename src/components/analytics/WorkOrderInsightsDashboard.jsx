import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  TrendingUp, 
  AlertTriangle, 
  Lightbulb, 
  RefreshCw, 
  Brain,
  Clock,
  DollarSign,
  Target
} from 'lucide-react';
import { toast } from 'sonner';

const severityColors = {
  high: 'bg-red-100 text-red-800 border-red-200',
  medium: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  low: 'bg-blue-100 text-blue-800 border-blue-200'
};

const confidenceColors = {
  high: 'bg-emerald-100 text-emerald-800',
  medium: 'bg-amber-100 text-amber-800',
  low: 'bg-slate-100 text-slate-800'
};

export default function WorkOrderInsightsDashboard({ buildingId }) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const { data: insights, isLoading, refetch } = useQuery({
    queryKey: ['workOrderInsights', buildingId],
    queryFn: async () => {
      const response = await base44.functions.invoke('analyzeWorkOrderPatterns', { buildingId });
      return response.data;
    },
    enabled: !!buildingId,
    staleTime: 1000 * 60 * 30, // 30 minutes
  });

  const handleRefresh = async () => {
    setIsAnalyzing(true);
    try {
      await refetch();
      toast.success('Analysis updated');
    } catch (error) {
      toast.error('Failed to refresh analysis');
    } finally {
      setIsAnalyzing(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!insights || !insights.success) {
    return (
      <Card>
        <CardContent className="pt-6 text-center">
          <Brain className="h-12 w-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500">Unable to load AI insights</p>
        </CardContent>
      </Card>
    );
  }

  const { patterns = [], predictions = [], recommendations = [], summary = '' } = insights.insights || {};

  return (
    <div className="space-y-6">
      {/* Header Card with Summary */}
      <Card className="border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-white">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg">
                <Brain className="h-6 w-6 text-white" />
              </div>
              <div>
                <CardTitle>AI-Powered Insights</CardTitle>
                <CardDescription>Pattern recognition & predictive maintenance analysis</CardDescription>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={isAnalyzing}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isAnalyzing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="bg-white rounded-lg p-4 border border-blue-100">
            <p className="text-sm font-medium text-slate-700 mb-2">Executive Summary</p>
            <p className="text-slate-600 leading-relaxed">{summary}</p>
          </div>
          {insights.metadata && (
            <div className="mt-3 text-xs text-slate-500">
              Analyzed {insights.metadata.total_work_orders} work orders and {insights.metadata.total_assets} assets
            </div>
          )}
        </CardContent>
      </Card>

      {/* Patterns Identified */}
      {patterns.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-orange-600" />
              <CardTitle>Patterns Identified</CardTitle>
            </div>
            <CardDescription>Recurring issues affecting costs and resolution times</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {patterns.map((pattern, idx) => (
                <div 
                  key={idx}
                  className="p-4 rounded-lg border-2 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="font-semibold text-slate-900">{pattern.pattern}</h4>
                    <Badge className={severityColors[pattern.severity]}>
                      {pattern.severity}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-3 mt-3">
                    <div className="flex items-center gap-2 text-sm">
                      <DollarSign className="h-4 w-4 text-slate-400" />
                      <span className="text-slate-600">Impact: {pattern.impact}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Clock className="h-4 w-4 text-slate-400" />
                      <span className="text-slate-600">Frequency: {pattern.frequency}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Predictive Maintenance */}
      {predictions.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              <CardTitle>Predictive Maintenance Alerts</CardTitle>
            </div>
            <CardDescription>Potential issues forecast based on historical data</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {predictions.map((prediction, idx) => (
                <div 
                  key={idx}
                  className="p-4 rounded-lg border-2 border-amber-200 bg-amber-50/50 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h4 className="font-semibold text-slate-900">{prediction.asset_or_system}</h4>
                      <p className="text-sm text-slate-700 mt-1">{prediction.predicted_issue}</p>
                    </div>
                    <Badge className={confidenceColors[prediction.confidence]}>
                      {prediction.confidence} confidence
                    </Badge>
                  </div>
                  <div className="mt-3 space-y-2">
                    <div className="flex items-center gap-2 text-sm">
                      <Target className="h-4 w-4 text-amber-600" />
                      <span className="text-slate-600 font-medium">Expected: {prediction.timeframe}</span>
                    </div>
                    <p className="text-xs text-slate-600 pl-6">{prediction.reasoning}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recommendations */}
      {recommendations.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Lightbulb className="h-5 w-5 text-yellow-600" />
              <CardTitle>Proactive Recommendations</CardTitle>
            </div>
            <CardDescription>Preventative maintenance actions to reduce costs and downtime</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recommendations.map((rec, idx) => (
                <div 
                  key={idx}
                  className="p-4 rounded-lg border-2 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="font-semibold text-slate-900">{rec.title}</h4>
                    <Badge className={severityColors[rec.priority]}>
                      {rec.priority} priority
                    </Badge>
                  </div>
                  <p className="text-sm text-slate-700 mb-3">{rec.description}</p>
                  <div className="bg-slate-50 rounded-lg p-3 space-y-2">
                    <div className="flex items-center gap-2 text-sm">
                      <DollarSign className="h-4 w-4 text-emerald-600" />
                      <span className="font-medium text-emerald-700">Potential Savings: {rec.estimated_savings}</span>
                    </div>
                    <div className="text-xs text-slate-600">
                      <span className="font-semibold">Implementation:</span> {rec.implementation}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}