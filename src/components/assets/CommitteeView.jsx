import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ASSET_CATEGORIES } from '@/components/categories/assetCategories';
import { 
  DollarSign,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  Shield,
  Calendar
} from 'lucide-react';
import { differenceInYears } from 'date-fns';

export default function CommitteeView({ assets }) {
  const dashboardMetrics = useMemo(() => {
    const totalAssets = assets.length;
    const compliantAssets = assets.filter(a => a.compliance_status === 'compliant').length;
    const overdueAssets = assets.filter(a => a.compliance_status === 'overdue').length;
    const criticalRiskAssets = assets.filter(a => a.risk_rating === 'critical').length;
    
    const totalReplacementCost = assets.reduce((sum, a) => sum + (a.replacement_cost || 0), 0);
    
    const assetsNearingReplacement = assets.filter(asset => {
      if (!asset.installation_date || !asset.lifecycle_years) return false;
      const age = differenceInYears(new Date(), new Date(asset.installation_date));
      const remainingLife = asset.lifecycle_years - age;
      return remainingLife > 0 && remainingLife <= 3;
    }).length;

    const complianceRate = totalAssets > 0 ? Math.round((compliantAssets / totalAssets) * 100) : 0;

    return {
      totalAssets,
      compliantAssets,
      overdueAssets,
      criticalRiskAssets,
      totalReplacementCost,
      assetsNearingReplacement,
      complianceRate
    };
  }, [assets]);

  const categoryBreakdown = useMemo(() => {
    const breakdown = {};
    assets.forEach(asset => {
      const category = asset.asset_main_category;
      if (!breakdown[category]) {
        breakdown[category] = {
          count: 0,
          compliant: 0,
          overdue: 0,
          replacementCost: 0
        };
      }
      breakdown[category].count++;
      if (asset.compliance_status === 'compliant') breakdown[category].compliant++;
      if (asset.compliance_status === 'overdue') breakdown[category].overdue++;
      breakdown[category].replacementCost += (asset.replacement_cost || 0);
    });
    return breakdown;
  }, [assets]);

  return (
    <div className="space-y-6">
      {/* Key Metrics Dashboard */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{dashboardMetrics.totalAssets}</p>
                <p className="text-sm text-slate-500">Total Assets</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center">
                <CheckCircle2 className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{dashboardMetrics.complianceRate}%</p>
                <p className="text-sm text-slate-500">Compliant</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-red-100 flex items-center justify-center">
                <AlertTriangle className="h-6 w-6 text-red-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{dashboardMetrics.overdueAssets}</p>
                <p className="text-sm text-slate-500">Overdue</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-orange-100 flex items-center justify-center">
                <Calendar className="h-6 w-6 text-orange-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{dashboardMetrics.assetsNearingReplacement}</p>
                <p className="text-sm text-slate-500">Due 3 Years</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Cost Forecast */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-green-600" />
            Capital Works Budget Forecast
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-5xl font-bold text-slate-900 mb-2">
              ${(dashboardMetrics.totalReplacementCost / 1000000).toFixed(2)}M
            </p>
            <p className="text-slate-500">Total Estimated Replacement Cost</p>
            <div className="mt-4 text-sm text-slate-600">
              {dashboardMetrics.assetsNearingReplacement} assets requiring attention within 3 years
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Category Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-blue-600" />
            Asset Category Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Object.entries(categoryBreakdown)
              .sort(([, a], [, b]) => b.count - a.count)
              .map(([category, data]) => {
                const categoryConfig = ASSET_CATEGORIES[category];
                const Icon = categoryConfig?.icon || Shield;
                const complianceRate = data.count > 0 ? Math.round((data.compliant / data.count) * 100) : 0;

                return (
                  <div key={category} className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                    <div className="flex items-center gap-3 flex-1">
                      <div className={`w-10 h-10 rounded-lg ${categoryConfig?.color} flex items-center justify-center`}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold text-slate-900">{categoryConfig?.label}</h4>
                        <div className="flex items-center gap-3 mt-1">
                          <span className="text-sm text-slate-600">{data.count} assets</span>
                          <Badge className={
                            complianceRate >= 90 ? 'bg-green-100 text-green-800' :
                            complianceRate >= 70 ? 'bg-yellow-100 text-yellow-800' :
                            'bg-red-100 text-red-800'
                          }>
                            {complianceRate}% compliant
                          </Badge>
                          {data.overdue > 0 && (
                            <Badge className="bg-red-100 text-red-800">
                              {data.overdue} overdue
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-slate-900">
                        ${(data.replacementCost / 1000).toFixed(0)}k
                      </p>
                      <p className="text-xs text-slate-500">Est. Cost</p>
                    </div>
                  </div>
                );
              })}
          </div>
        </CardContent>
      </Card>

      {/* Compliance Status Overview */}
      <Card>
        <CardHeader>
          <CardTitle>Compliance Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-emerald-50 rounded-lg border border-emerald-200">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                <span className="font-medium text-slate-900">Compliant</span>
              </div>
              <span className="text-xl font-bold text-slate-900">{dashboardMetrics.compliantAssets}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg border border-red-200">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-red-600" />
                <span className="font-medium text-slate-900">Overdue</span>
              </div>
              <span className="text-xl font-bold text-slate-900">{dashboardMetrics.overdueAssets}</span>
            </div>
            {dashboardMetrics.criticalRiskAssets > 0 && (
              <div className="flex items-center justify-between p-3 bg-orange-50 rounded-lg border border-orange-200">
                <div className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-orange-600" />
                  <span className="font-medium text-slate-900">Critical Risk</span>
                </div>
                <span className="text-xl font-bold text-slate-900">{dashboardMetrics.criticalRiskAssets}</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}