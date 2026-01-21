import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  AlertTriangle, TrendingUp, Wrench, Calendar, DollarSign, 
  Sparkles, RefreshCw, AlertCircle, CheckCircle2, Loader2
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

export default function PredictiveMaintenanceDashboard({ buildingId }) {
  const [analyzing, setAnalyzing] = useState(false);
  const queryClient = useQueryClient();

  const { data: predictions = [], isLoading } = useQuery({
    queryKey: ['maintenance-predictions', buildingId],
    queryFn: () => base44.entities.MaintenancePrediction.filter(
      buildingId ? { building_id: buildingId } : {},
      '-prediction_date',
      10
    ),
  });

  const latestPrediction = predictions[0];
  const allPredictions = latestPrediction?.predictions || [];

  const runAnalysisMutation = useMutation({
    mutationFn: () => base44.functions.invoke('predictMaintenanceIssues', { buildingId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenance-predictions'] });
      toast.success('Predictive analysis completed!');
      setAnalyzing(false);
    },
    onError: () => {
      toast.error('Analysis failed');
      setAnalyzing(false);
    }
  });

  const handleRunAnalysis = () => {
    setAnalyzing(true);
    runAnalysisMutation.mutate();
  };

  const getRiskColor = (level) => {
    const colors = {
      critical: 'bg-red-100 text-red-700 border-red-200',
      high: 'bg-orange-100 text-orange-700 border-orange-200',
      medium: 'bg-yellow-100 text-yellow-700 border-yellow-200',
      low: 'bg-blue-100 text-blue-700 border-blue-200'
    };
    return colors[level] || colors.low;
  };

  const getRiskIcon = (level) => {
    if (level === 'critical') return <AlertCircle className="h-5 w-5 text-red-600" />;
    if (level === 'high') return <AlertTriangle className="h-5 w-5 text-orange-600" />;
    return <AlertCircle className="h-5 w-5 text-yellow-600" />;
  };

  const criticalItems = allPredictions.filter(p => p.risk_level === 'critical');
  const highItems = allPredictions.filter(p => p.risk_level === 'high');
  const mediumItems = allPredictions.filter(p => p.risk_level === 'medium');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-blue-600" />
            AI Predictive Maintenance
          </h2>
          <p className="text-slate-600 mt-1">
            Proactive insights to prevent equipment failures
          </p>
        </div>
        <Button 
          onClick={handleRunAnalysis}
          disabled={analyzing}
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
              Run Analysis
            </>
          )}
        </Button>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Critical Issues</p>
                <p className="text-3xl font-bold text-red-600">{criticalItems.length}</p>
              </div>
              <AlertCircle className="h-10 w-10 text-red-600 opacity-20" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">High Priority</p>
                <p className="text-3xl font-bold text-orange-600">{highItems.length}</p>
              </div>
              <AlertTriangle className="h-10 w-10 text-orange-600 opacity-20" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Medium Priority</p>
                <p className="text-3xl font-bold text-yellow-600">{mediumItems.length}</p>
              </div>
              <Wrench className="h-10 w-10 text-yellow-600 opacity-20" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Assets Monitored</p>
                <p className="text-3xl font-bold text-blue-600">
                  {latestPrediction?.assets_analyzed || 0}
                </p>
              </div>
              <TrendingUp className="h-10 w-10 text-blue-600 opacity-20" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Last Analysis Info */}
      {latestPrediction && (
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-sm font-medium text-blue-900">
                  Last analysis: {format(new Date(latestPrediction.prediction_date), 'PPp')}
                </p>
                <p className="text-xs text-blue-700">
                  Analyzed {latestPrediction.assets_analyzed} assets and {latestPrediction.work_orders_analyzed} work orders
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Predictions List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
        </div>
      ) : allPredictions.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Sparkles className="h-12 w-12 mx-auto mb-4 text-slate-300" />
            <h3 className="text-lg font-semibold text-slate-900 mb-2">No Predictions Yet</h3>
            <p className="text-slate-600 mb-4">
              Run an analysis to get AI-powered maintenance predictions
            </p>
            <Button onClick={handleRunAnalysis} className="bg-blue-600 hover:bg-blue-700">
              <Sparkles className="h-4 w-4 mr-2" />
              Run First Analysis
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {allPredictions.map((prediction, idx) => (
            <Card key={idx} className={`border-l-4 ${getRiskColor(prediction.risk_level)}`}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-4 flex-1">
                    <div className="mt-1">
                      {getRiskIcon(prediction.risk_level)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-semibold text-lg text-slate-900">
                          {prediction.asset_name}
                        </h3>
                        <Badge className={getRiskColor(prediction.risk_level)}>
                          {prediction.risk_level.toUpperCase()}
                        </Badge>
                        <Badge variant="outline">
                          {Math.round(prediction.confidence * 100)}% Confidence
                        </Badge>
                      </div>

                      <div className="space-y-3">
                        <div className="flex flex-wrap gap-4 text-sm text-slate-600">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            Predicted: {prediction.predicted_failure_date}
                          </span>
                          {prediction.estimated_cost && (
                            <span className="flex items-center gap-1">
                              <DollarSign className="h-4 w-4" />
                              Est. Cost: ${prediction.estimated_cost.toLocaleString()}
                            </span>
                          )}
                          <span className="text-xs bg-slate-100 px-2 py-1 rounded">
                            {prediction.category} / {prediction.subcategory}
                          </span>
                        </div>

                        <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                          <p className="text-sm font-medium text-slate-900 mb-1">Analysis:</p>
                          <p className="text-sm text-slate-700">{prediction.reasoning}</p>
                        </div>

                        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                          <p className="text-sm font-medium text-blue-900 mb-1">
                            Recommended Action:
                          </p>
                          <p className="text-sm text-blue-800">{prediction.recommended_action}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}