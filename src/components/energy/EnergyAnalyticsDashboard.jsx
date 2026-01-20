import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import EnergyConsumptionChart from './EnergyConsumptionChart';
import EfficiencyRecommendations from './EfficiencyRecommendations';
import { 
  Zap, 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Leaf, 
  AlertTriangle,
  RefreshCw,
  Loader2
} from 'lucide-react';
import { Skeleton } from "@/components/ui/skeleton";

export default function EnergyAnalyticsDashboard({ buildingId, unitId = null }) {
  const [analyzing, setAnalyzing] = useState(false);
  const [predicting, setPredicting] = useState(false);

  const { data: analysis, refetch: refetchAnalysis, isLoading: analysisLoading } = useQuery({
    queryKey: ['energy-analysis', buildingId, unitId],
    queryFn: async () => {
      const { data } = await base44.functions.invoke('analyzeEnergyUsage', {
        building_id: buildingId,
        unit_id: unitId,
        months: 12
      });
      return data;
    },
    enabled: !!buildingId
  });

  const { data: predictions, refetch: refetchPredictions, isLoading: predictionsLoading } = useQuery({
    queryKey: ['energy-predictions', buildingId],
    queryFn: async () => {
      const { data } = await base44.functions.invoke('predictEnergyCosts', {
        building_id: buildingId,
        months_ahead: 6
      });
      return data;
    },
    enabled: !!buildingId
  });

  const { data: energyData = [] } = useQuery({
    queryKey: ['energy-usage', buildingId, unitId],
    queryFn: () => {
      const filter = unitId 
        ? { building_id: buildingId, unit_id: unitId }
        : { building_id: buildingId };
      return base44.entities.EnergyUsage.filter(filter);
    },
    enabled: !!buildingId
  });

  const handleReanalyze = async () => {
    setAnalyzing(true);
    await refetchAnalysis();
    setAnalyzing(false);
  };

  const handleRepredict = async () => {
    setPredicting(true);
    await refetchPredictions();
    setPredicting(false);
  };

  if (analysisLoading || predictionsLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-96 rounded-xl" />
      </div>
    );
  }

  const stats = analysis?.statistics || {};
  const aiAnalysis = analysis?.analysis || {};
  const aiPredictions = predictions?.predictions || {};

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-0 shadow-sm bg-gradient-to-br from-blue-50 to-blue-100">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-700 font-medium">Total Consumption</p>
                <p className="text-3xl font-bold text-blue-900 mt-1">
                  {(stats.total_consumption_kwh || 0).toLocaleString()} kWh
                </p>
                <p className="text-xs text-blue-600 mt-1">Last 12 months</p>
              </div>
              <Zap className="h-12 w-12 text-blue-600 opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm bg-gradient-to-br from-green-50 to-green-100">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-green-700 font-medium">Total Cost</p>
                <p className="text-3xl font-bold text-green-900 mt-1">
                  ${(stats.total_cost || 0).toLocaleString()}
                </p>
                <p className="text-xs text-green-600 mt-1">
                  ~${Math.round(stats.avg_monthly_cost || 0)}/month
                </p>
              </div>
              <DollarSign className="h-12 w-12 text-green-600 opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm bg-gradient-to-br from-purple-50 to-purple-100">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-purple-700 font-medium">Efficiency Score</p>
                <p className="text-3xl font-bold text-purple-900 mt-1">
                  {Math.round(aiAnalysis.cost_efficiency_score || 75)}/100
                </p>
                <p className="text-xs text-purple-600 mt-1">AI Assessment</p>
              </div>
              <Leaf className="h-12 w-12 text-purple-600 opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm bg-gradient-to-br from-orange-50 to-orange-100">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-orange-700 font-medium">Potential Savings</p>
                <p className="text-3xl font-bold text-orange-900 mt-1">
                  ${(aiAnalysis.estimated_annual_savings || 0).toLocaleString()}
                </p>
                <p className="text-xs text-orange-600 mt-1">Per year</p>
              </div>
              <TrendingDown className="h-12 w-12 text-orange-600 opacity-50" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="analysis">AI Analysis</TabsTrigger>
          <TabsTrigger value="predictions">Predictions</TabsTrigger>
          <TabsTrigger value="recommendations">Recommendations</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <EnergyConsumptionChart data={energyData} />
          
          {aiAnalysis.overall_trend && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {aiAnalysis.trend_direction === 'increasing' && <TrendingUp className="h-5 w-5 text-red-600" />}
                  {aiAnalysis.trend_direction === 'decreasing' && <TrendingDown className="h-5 w-5 text-green-600" />}
                  Consumption Trend
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-slate-700">{aiAnalysis.overall_trend}</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="analysis" className="space-y-6">
          <div className="flex justify-end">
            <Button onClick={handleReanalyze} disabled={analyzing} size="sm">
              {analyzing ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Analyzing...</>
              ) : (
                <><RefreshCw className="h-4 w-4 mr-2" /> Re-analyze</>
              )}
            </Button>
          </div>

          {aiAnalysis.benchmark_comparison && (
            <Card>
              <CardHeader>
                <CardTitle>Benchmark Comparison</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-slate-700">{aiAnalysis.benchmark_comparison}</p>
              </CardContent>
            </Card>
          )}

          {aiAnalysis.seasonal_analysis && (
            <Card>
              <CardHeader>
                <CardTitle>Seasonal Analysis</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-slate-700">{aiAnalysis.seasonal_analysis}</p>
              </CardContent>
            </Card>
          )}

          {aiAnalysis.peak_usage_periods?.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Peak Usage Periods</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {aiAnalysis.peak_usage_periods.map((peak, idx) => (
                    <div key={idx} className="p-3 bg-slate-50 rounded-lg">
                      <p className="font-medium text-slate-900">{peak.period}</p>
                      <p className="text-sm text-slate-600 mt-1">{peak.reason}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {aiAnalysis.anomalies?.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-orange-600" />
                  Anomalies Detected
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {aiAnalysis.anomalies.map((anomaly, idx) => (
                    <div key={idx} className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
                      <div className="flex items-center justify-between">
                        <p className="font-medium text-orange-900">{anomaly.date}</p>
                        <Badge className={
                          anomaly.severity === 'high' ? 'bg-red-100 text-red-800' :
                          anomaly.severity === 'medium' ? 'bg-orange-100 text-orange-800' :
                          'bg-yellow-100 text-yellow-800'
                        }>
                          {anomaly.severity}
                        </Badge>
                      </div>
                      <p className="text-sm text-orange-700 mt-1">{anomaly.description}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="predictions" className="space-y-6">
          <div className="flex justify-end">
            <Button onClick={handleRepredict} disabled={predicting} size="sm">
              {predicting ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Predicting...</>
              ) : (
                <><RefreshCw className="h-4 w-4 mr-2" /> Re-predict</>
              )}
            </Button>
          </div>

          {aiPredictions.monthly_predictions?.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>6-Month Cost Forecast</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {aiPredictions.monthly_predictions.map((pred, idx) => (
                    <div key={idx} className="p-4 border border-slate-200 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <p className="font-semibold text-slate-900">{pred.month}</p>
                        <div className="flex items-center gap-2">
                          <Badge className={
                            pred.confidence_level === 'high' ? 'bg-green-100 text-green-800' :
                            pred.confidence_level === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-red-100 text-red-800'
                          }>
                            {pred.confidence_level} confidence
                          </Badge>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4 mb-2">
                        <div>
                          <p className="text-xs text-slate-500">Predicted Consumption</p>
                          <p className="text-lg font-bold text-blue-600">
                            {pred.predicted_consumption_kwh?.toLocaleString()} kWh
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-500">Predicted Cost</p>
                          <p className="text-lg font-bold text-green-600">
                            ${pred.predicted_cost?.toLocaleString()}
                          </p>
                        </div>
                      </div>
                      {pred.key_factors?.length > 0 && (
                        <div className="mt-2 pt-2 border-t border-slate-100">
                          <p className="text-xs text-slate-500 mb-1">Key Factors:</p>
                          <div className="flex flex-wrap gap-1">
                            {pred.key_factors.map((factor, i) => (
                              <Badge key={i} variant="outline" className="text-xs">
                                {factor}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                  <div className="flex items-center justify-between">
                    <p className="font-semibold text-blue-900">Total Predicted Cost (6 months)</p>
                    <p className="text-2xl font-bold text-blue-600">
                      ${aiPredictions.total_predicted_cost?.toLocaleString()}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {aiPredictions.risk_factors?.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Risk Factors</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {aiPredictions.risk_factors.map((risk, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <AlertTriangle className="h-4 w-4 text-orange-600 mt-0.5 flex-shrink-0" />
                      <span className="text-sm text-slate-700">{risk}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="recommendations">
          <EfficiencyRecommendations 
            recommendations={aiAnalysis.recommendations}
            optimizationOpportunities={aiPredictions.cost_optimization_opportunities}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}