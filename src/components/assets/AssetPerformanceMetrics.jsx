import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Activity,
  AlertTriangle,
  TrendingUp,
  Clock,
  Zap,
  DollarSign,
  Wrench,
  Target
} from 'lucide-react';
import { cn } from '@/lib/utils';

export default function AssetPerformanceMetrics({ asset, serviceRecords = [], workOrders = [] }) {
  // Calculate OEE (Overall Equipment Effectiveness)
  const calculateOEE = () => {
    if (!asset.operating_hours || !asset.installation_date) return null;
    
    const installDate = new Date(asset.installation_date);
    const now = new Date();
    const totalDays = Math.floor((now - installDate) / (1000 * 60 * 60 * 24));
    const idealHours = totalDays * 24;
    const actualHours = asset.operating_hours || 0;
    const downtime = asset.total_downtime_hours || 0;
    
    const availability = idealHours > 0 ? ((actualHours - downtime) / actualHours * 100) : 0;
    return Math.min(100, Math.max(0, availability));
  };

  // Calculate health score
  const healthScore = asset.health_score || calculateHealthScore();
  
  function calculateHealthScore() {
    let score = 100;
    
    // Age factor
    if (asset.installation_date) {
      const age = new Date().getFullYear() - new Date(asset.installation_date).getFullYear();
      const lifecycle = asset.lifecycle_years || 20;
      const ageFactor = Math.min(30, (age / lifecycle) * 30);
      score -= ageFactor;
    }
    
    // Service adherence
    if (asset.compliance_status === 'overdue') score -= 20;
    else if (asset.compliance_status === 'due_soon') score -= 10;
    
    // Failure history
    const failureImpact = Math.min(20, (asset.failure_count || 0) * 5);
    score -= failureImpact;
    
    // Operational status
    if (asset.operational_status === 'down') score -= 30;
    else if (asset.operational_status === 'degraded') score -= 15;
    
    return Math.max(0, Math.min(100, score));
  }

  const oee = calculateOEE();
  const mtbf = asset.mtbf || 0;
  const mttr = asset.mttr || 0;
  const totalCost = asset.total_maintenance_cost || 0;

  const getCriticalityColor = (criticality) => {
    switch (criticality) {
      case 'critical': return 'text-red-600 bg-red-100';
      case 'high': return 'text-orange-600 bg-orange-100';
      case 'medium': return 'text-yellow-600 bg-yellow-100';
      case 'low': return 'text-green-600 bg-green-100';
      default: return 'text-slate-600 bg-slate-100';
    }
  };

  const getHealthColor = (score) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    if (score >= 40) return 'text-orange-600';
    return 'text-red-600';
  };

  const getHealthBgColor = (score) => {
    if (score >= 80) return 'bg-green-500';
    if (score >= 60) return 'bg-yellow-500';
    if (score >= 40) return 'bg-orange-500';
    return 'bg-red-500';
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Health Score */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-slate-600">Health Score</span>
              <Activity className={cn("h-5 w-5", getHealthColor(healthScore))} />
            </div>
            <div className="space-y-2">
              <div className="flex items-baseline gap-2">
                <span className={cn("text-3xl font-bold", getHealthColor(healthScore))}>
                  {Math.round(healthScore)}
                </span>
                <span className="text-sm text-slate-500">/ 100</span>
              </div>
              <Progress value={healthScore} className="h-2" indicatorClassName={getHealthBgColor(healthScore)} />
            </div>
          </CardContent>
        </Card>

        {/* Criticality */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-slate-600">Criticality</span>
              <AlertTriangle className="h-5 w-5 text-slate-400" />
            </div>
            <Badge className={cn("text-sm font-semibold", getCriticalityColor(asset.criticality))}>
              {asset.criticality?.toUpperCase() || 'MEDIUM'}
            </Badge>
            <p className="text-xs text-slate-500 mt-2">Maintenance priority level</p>
          </CardContent>
        </Card>

        {/* MTBF */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-slate-600">MTBF</span>
              <Clock className="h-5 w-5 text-blue-500" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold text-slate-900">{mtbf}</span>
              <span className="text-sm text-slate-500">hrs</span>
            </div>
            <p className="text-xs text-slate-500 mt-1">Mean Time Between Failures</p>
          </CardContent>
        </Card>

        {/* MTTR */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-slate-600">MTTR</span>
              <Wrench className="h-5 w-5 text-purple-500" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold text-slate-900">{mttr}</span>
              <span className="text-sm text-slate-500">hrs</span>
            </div>
            <p className="text-xs text-slate-500 mt-1">Mean Time To Repair</p>
          </CardContent>
        </Card>
      </div>

      {/* Additional Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* OEE */}
        {oee !== null && (
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-slate-600">Overall Equipment Effectiveness</span>
                <Target className="h-5 w-5 text-indigo-500" />
              </div>
              <div className="space-y-2">
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold text-slate-900">{Math.round(oee)}%</span>
                </div>
                <Progress value={oee} className="h-2" />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Total Maintenance Cost */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-slate-600">Total Maintenance Cost</span>
              <DollarSign className="h-5 w-5 text-green-500" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-slate-900">${totalCost.toLocaleString()}</span>
            </div>
            <p className="text-xs text-slate-500 mt-1">Lifetime maintenance spend</p>
          </CardContent>
        </Card>

        {/* Downtime */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-slate-600">Total Downtime</span>
              <Zap className="h-5 w-5 text-red-500" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-slate-900">{asset.total_downtime_hours || 0}</span>
              <span className="text-sm text-slate-500">hrs</span>
            </div>
            <p className="text-xs text-slate-500 mt-1">Total hours offline</p>
          </CardContent>
        </Card>
      </div>

      {/* FMEA Analysis */}
      {(asset.fmea_severity || asset.fmea_occurrence || asset.fmea_detection) && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">FMEA Analysis</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-slate-600 mb-1">Severity</p>
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-bold text-slate-900">{asset.fmea_severity || 'N/A'}</span>
                  <span className="text-xs text-slate-500">/ 10</span>
                </div>
              </div>
              <div>
                <p className="text-sm text-slate-600 mb-1">Occurrence</p>
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-bold text-slate-900">{asset.fmea_occurrence || 'N/A'}</span>
                  <span className="text-xs text-slate-500">/ 10</span>
                </div>
              </div>
              <div>
                <p className="text-sm text-slate-600 mb-1">Detection</p>
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-bold text-slate-900">{asset.fmea_detection || 'N/A'}</span>
                  <span className="text-xs text-slate-500">/ 10</span>
                </div>
              </div>
              <div>
                <p className="text-sm text-slate-600 mb-1">RPN</p>
                <div className="flex items-center gap-2">
                  <span className={cn(
                    "text-2xl font-bold",
                    asset.fmea_rpn > 200 ? "text-red-600" : asset.fmea_rpn > 100 ? "text-orange-600" : "text-green-600"
                  )}>
                    {asset.fmea_rpn || 'N/A'}
                  </span>
                </div>
              </div>
            </div>
            <p className="text-xs text-slate-500 mt-4">
              Risk Priority Number (RPN) = Severity × Occurrence × Detection. Higher values indicate higher risk.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Operating Hours & Meter Reading */}
      {(asset.operating_hours || asset.meter_reading) && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Usage Tracking</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              {asset.operating_hours && (
                <div>
                  <p className="text-sm text-slate-600 mb-1">Operating Hours</p>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-bold text-slate-900">{asset.operating_hours.toLocaleString()}</span>
                    <span className="text-sm text-slate-500">hrs</span>
                  </div>
                </div>
              )}
              {asset.meter_reading && (
                <div>
                  <p className="text-sm text-slate-600 mb-1">Meter Reading</p>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-bold text-slate-900">{asset.meter_reading.toLocaleString()}</span>
                    <span className="text-sm text-slate-500">{asset.meter_reading_unit || 'units'}</span>
                  </div>
                  {asset.next_meter_trigger && (
                    <p className="text-xs text-slate-500 mt-1">
                      Next service at: {asset.next_meter_trigger.toLocaleString()} {asset.meter_reading_unit || 'units'}
                    </p>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}