import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Clock, DollarSign, Star, CheckCircle, AlertCircle } from 'lucide-react';
import { Skeleton } from "@/components/ui/skeleton";

export default function ContractorPerformanceMetrics({ contractorId }) {
  const { data: workOrders = [], isLoading } = useQuery({
    queryKey: ['contractor-work-orders', contractorId],
    queryFn: () => base44.entities.WorkOrder.filter({ assigned_contractor_id: contractorId }),
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-32 rounded-xl" />
        ))}
      </div>
    );
  }

  // Calculate performance metrics
  const completedOrders = workOrders.filter(wo => wo.status === 'completed');
  const totalOrders = workOrders.length;
  
  // On-time completion rate
  const onTimeOrders = completedOrders.filter(wo => {
    if (!wo.due_date || !wo.completed_date) return false;
    return new Date(wo.completed_date) <= new Date(wo.due_date);
  });
  const onTimeRate = completedOrders.length > 0 
    ? ((onTimeOrders.length / completedOrders.length) * 100).toFixed(1)
    : 0;

  // Average cost variance
  const ordersWithCosts = completedOrders.filter(wo => wo.estimated_cost && wo.actual_cost);
  const totalVariance = ordersWithCosts.reduce((sum, wo) => {
    return sum + (wo.actual_cost - wo.estimated_cost);
  }, 0);
  const avgCostVariance = ordersWithCosts.length > 0 
    ? (totalVariance / ordersWithCosts.length).toFixed(2)
    : 0;
  const costVariancePercent = ordersWithCosts.length > 0
    ? ((totalVariance / ordersWithCosts.reduce((sum, wo) => sum + wo.estimated_cost, 0)) * 100).toFixed(1)
    : 0;

  // Average rating
  const ratedOrders = completedOrders.filter(wo => wo.rating);
  const avgRating = ratedOrders.length > 0
    ? (ratedOrders.reduce((sum, wo) => sum + wo.rating, 0) / ratedOrders.length).toFixed(1)
    : 0;

  // Active vs completed
  const activeOrders = workOrders.filter(wo => ['open', 'in_progress'].includes(wo.status)).length;

  // Rating trend (last 5 vs previous 5)
  const recentRatings = ratedOrders.slice(-5);
  const previousRatings = ratedOrders.slice(-10, -5);
  const recentAvg = recentRatings.length > 0 
    ? recentRatings.reduce((sum, wo) => sum + wo.rating, 0) / recentRatings.length 
    : 0;
  const previousAvg = previousRatings.length > 0 
    ? previousRatings.reduce((sum, wo) => sum + wo.rating, 0) / previousRatings.length 
    : 0;
  const ratingTrend = recentAvg - previousAvg;

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-slate-900">Performance Metrics</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* On-Time Completion Rate */}
        <Card className={`border-l-4 ${parseFloat(onTimeRate) >= 80 ? 'border-l-green-500' : parseFloat(onTimeRate) >= 60 ? 'border-l-yellow-500' : 'border-l-red-500'}`}>
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-2">
              <Clock className={`h-5 w-5 ${parseFloat(onTimeRate) >= 80 ? 'text-green-600' : parseFloat(onTimeRate) >= 60 ? 'text-yellow-600' : 'text-red-600'}`} />
              <Badge variant={parseFloat(onTimeRate) >= 80 ? "default" : "secondary"} className={parseFloat(onTimeRate) >= 80 ? 'bg-green-600' : parseFloat(onTimeRate) >= 60 ? 'bg-yellow-600' : 'bg-red-600'}>
                {parseFloat(onTimeRate) >= 80 ? 'Excellent' : parseFloat(onTimeRate) >= 60 ? 'Good' : 'Needs Improvement'}
              </Badge>
            </div>
            <div className="text-3xl font-bold text-slate-900 mb-1">{onTimeRate}%</div>
            <div className="text-sm text-slate-600">On-Time Completion</div>
            <div className="text-xs text-slate-500 mt-1">
              {onTimeOrders.length} of {completedOrders.length} completed on time
            </div>
          </CardContent>
        </Card>

        {/* Cost Variance */}
        <Card className={`border-l-4 ${parseFloat(avgCostVariance) <= 0 ? 'border-l-green-500' : parseFloat(costVariancePercent) <= 10 ? 'border-l-yellow-500' : 'border-l-red-500'}`}>
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-2">
              <DollarSign className={`h-5 w-5 ${parseFloat(avgCostVariance) <= 0 ? 'text-green-600' : parseFloat(costVariancePercent) <= 10 ? 'text-yellow-600' : 'text-red-600'}`} />
              {parseFloat(avgCostVariance) < 0 ? (
                <TrendingDown className="h-4 w-4 text-green-600" />
              ) : parseFloat(avgCostVariance) > 0 ? (
                <TrendingUp className="h-4 w-4 text-red-600" />
              ) : null}
            </div>
            <div className="text-3xl font-bold text-slate-900 mb-1">
              {parseFloat(avgCostVariance) > 0 ? '+' : ''}${avgCostVariance}
            </div>
            <div className="text-sm text-slate-600">Avg Cost Variance</div>
            <div className="text-xs text-slate-500 mt-1">
              {parseFloat(costVariancePercent) > 0 ? '+' : ''}{costVariancePercent}% vs estimate
            </div>
          </CardContent>
        </Card>

        {/* Average Rating */}
        <Card className={`border-l-4 ${parseFloat(avgRating) >= 4 ? 'border-l-green-500' : parseFloat(avgRating) >= 3 ? 'border-l-yellow-500' : 'border-l-red-500'}`}>
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-2">
              <Star className={`h-5 w-5 ${parseFloat(avgRating) >= 4 ? 'text-green-600 fill-green-600' : parseFloat(avgRating) >= 3 ? 'text-yellow-600 fill-yellow-600' : 'text-red-600 fill-red-600'}`} />
              {ratingTrend > 0 ? (
                <div className="flex items-center gap-1 text-green-600">
                  <TrendingUp className="h-4 w-4" />
                  <span className="text-xs font-medium">+{ratingTrend.toFixed(1)}</span>
                </div>
              ) : ratingTrend < 0 ? (
                <div className="flex items-center gap-1 text-red-600">
                  <TrendingDown className="h-4 w-4" />
                  <span className="text-xs font-medium">{ratingTrend.toFixed(1)}</span>
                </div>
              ) : null}
            </div>
            <div className="text-3xl font-bold text-slate-900 mb-1">{avgRating}</div>
            <div className="text-sm text-slate-600">Average Rating</div>
            <div className="text-xs text-slate-500 mt-1">
              Based on {ratedOrders.length} rated jobs
            </div>
          </CardContent>
        </Card>

        {/* Job Summary */}
        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-2">
              <CheckCircle className="h-5 w-5 text-blue-600" />
              <Badge variant="outline" className="text-blue-700 border-blue-300">
                {activeOrders} Active
              </Badge>
            </div>
            <div className="text-3xl font-bold text-slate-900 mb-1">{completedOrders.length}</div>
            <div className="text-sm text-slate-600">Completed Jobs</div>
            <div className="text-xs text-slate-500 mt-1">
              {totalOrders} total jobs
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Additional insights */}
      {totalOrders === 0 && (
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 text-center">
          <AlertCircle className="h-8 w-8 text-slate-400 mx-auto mb-2" />
          <p className="text-sm text-slate-600">No work orders assigned yet</p>
        </div>
      )}
    </div>
  );
}