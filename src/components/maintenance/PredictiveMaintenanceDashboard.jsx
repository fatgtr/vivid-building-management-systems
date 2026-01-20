import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertTriangle, TrendingUp, Zap, Clock, DollarSign, Wrench, CheckCircle2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { format, addDays } from 'date-fns';

export default function PredictiveMaintenanceDashboard({ buildingId }) {
  const [creatingWorkOrder, setCreatingWorkOrder] = useState(null);
  const queryClient = useQueryClient();

  const { data: predictions, isLoading, refetch } = useQuery({
    queryKey: ['maintenance-predictions', buildingId],
    queryFn: async () => {
      const { data } = await base44.functions.invoke('predictMaintenanceIssues', { buildingId });
      return data;
    },
    enabled: !!buildingId,
    staleTime: 1000 * 60 * 30, // 30 minutes
  });

  const createWorkOrderMutation = useMutation({
    mutationFn: async (prediction) => {
      const { data } = await base44.functions.invoke('autoCreateWorkOrder', {
        buildingId,
        title: prediction.title,
        description: `${prediction.description}\n\nAI Confidence: ${prediction.confidence}%\nRecommended Action: ${prediction.recommended_action}`,
        category: prediction.category,
        priority: prediction.priority,
        assetId: prediction.asset_id,
        reportedBy: 'AI Predictive System',
        source: 'prediction'
      });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['work-orders'] });
      toast.success('Work order created successfully');
      setCreatingWorkOrder(null);
    },
    onError: () => {
      toast.error('Failed to create work order');
      setCreatingWorkOrder(null);
    }
  });

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-800 border-red-300';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-300';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'low': return 'bg-blue-100 text-blue-800 border-blue-300';
      default: return 'bg-slate-100 text-slate-800 border-slate-300';
    }
  };

  const getConfidenceColor = (confidence) => {
    if (confidence >= 80) return 'text-red-600';
    if (confidence >= 60) return 'text-orange-600';
    return 'text-yellow-600';
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Predictive Maintenance</CardTitle>
          <CardDescription>AI-powered issue predictions</CardDescription>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-64" />
        </CardContent>
      </Card>
    );
  }

  if (!predictions || predictions.predictions?.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Predictive Maintenance</CardTitle>
          <CardDescription>AI-powered issue predictions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <CheckCircle2 className="h-12 w-12 text-emerald-600 mx-auto mb-3" />
            <p className="text-slate-600">No predicted issues at this time</p>
            <Button variant="outline" size="sm" onClick={() => refetch()} className="mt-4">
              Refresh Analysis
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const { predictions: issues, building_info } = predictions;
  const urgentIssues = issues.filter(i => i.priority === 'urgent' || i.priority === 'high');

  return (
    <div className="space-y-6">
      <Card className="border-0 shadow-sm bg-gradient-to-br from-blue-50 to-indigo-50">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-blue-600" />
                Predictive Maintenance Insights
              </CardTitle>
              <CardDescription>
                AI analysis for {building_info?.name} ({building_info?.age} years old)
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white rounded-lg p-4 border border-slate-200">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-100 rounded-lg">
                  <AlertTriangle className="h-5 w-5 text-red-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-900">{urgentIssues.length}</p>
                  <p className="text-xs text-slate-600">High Priority Issues</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-lg p-4 border border-slate-200">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-100 rounded-lg">
                  <Zap className="h-5 w-5 text-amber-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-900">{issues.length}</p>
                  <p className="text-xs text-slate-600">Total Predictions</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-lg p-4 border border-slate-200">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-100 rounded-lg">
                  <Wrench className="h-5 w-5 text-emerald-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-900">
                    {Math.round(issues.reduce((sum, i) => sum + i.confidence, 0) / issues.length)}%
                  </p>
                  <p className="text-xs text-slate-600">Avg Confidence</p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4">
        {issues.map((prediction, idx) => (
          <Card key={idx} className="border-l-4" style={{ borderLeftColor: 
            prediction.priority === 'urgent' ? '#ef4444' : 
            prediction.priority === 'high' ? '#f97316' : 
            prediction.priority === 'medium' ? '#eab308' : '#3b82f6' 
          }}>
            <CardHeader>
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <CardTitle className="text-lg">{prediction.title}</CardTitle>
                    <Badge className={getPriorityColor(prediction.priority)}>
                      {prediction.priority}
                    </Badge>
                    <Badge variant="outline" className={getConfidenceColor(prediction.confidence)}>
                      {prediction.confidence}% confidence
                    </Badge>
                  </div>
                  <CardDescription>{prediction.asset_name}</CardDescription>
                </div>
                <Button
                  size="sm"
                  onClick={() => {
                    setCreatingWorkOrder(prediction);
                    createWorkOrderMutation.mutate(prediction);
                  }}
                  disabled={creatingWorkOrder === prediction}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {creatingWorkOrder === prediction ? (
                    <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Creating...</>
                  ) : (
                    <>Create Work Order</>
                  )}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-slate-700">{prediction.description}</p>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-3 border-t border-slate-100">
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="h-4 w-4 text-slate-400" />
                  <span className="text-slate-600">
                    Est. {prediction.estimated_days_until_issue} days until issue
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Wrench className="h-4 w-4 text-slate-400" />
                  <span className="text-slate-600 capitalize">{prediction.category}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <DollarSign className="h-4 w-4 text-slate-400" />
                  <span className="text-slate-600">{prediction.cost_if_delayed}</span>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-100 rounded-lg p-3">
                <p className="text-xs font-medium text-blue-900 mb-1">Recommended Action</p>
                <p className="text-sm text-blue-800">{prediction.recommended_action}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}