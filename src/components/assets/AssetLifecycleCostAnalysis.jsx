import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  DollarSign,
  TrendingUp,
  AlertTriangle,
  Calendar,
  PiggyBank,
  ArrowUpDown
} from 'lucide-react';
import { cn } from '@/lib/utils';

export default function AssetLifecycleCostAnalysis({ asset }) {
  const purchaseValue = asset.purchase_value || 0;
  const replacementCost = asset.replacement_cost || purchaseValue;
  const totalMaintenanceCost = asset.total_maintenance_cost || 0;
  const lifecycleYears = asset.lifecycle_years || 20;
  const annualSinkingFund = asset.annual_sinking_fund || 0;

  // Calculate age
  const installDate = asset.installation_date ? new Date(asset.installation_date) : null;
  const currentAge = installDate 
    ? new Date().getFullYear() - installDate.getFullYear()
    : 0;

  // Calculate remaining life
  const remainingLife = Math.max(0, lifecycleYears - currentAge);
  const lifecyclePercentage = lifecycleYears > 0 ? (currentAge / lifecycleYears * 100) : 0;

  // Total Cost of Ownership
  const totalCostOfOwnership = purchaseValue + totalMaintenanceCost;
  
  // Average annual maintenance cost
  const avgAnnualMaintenanceCost = currentAge > 0 ? totalMaintenanceCost / currentAge : 0;

  // Projected total lifecycle cost
  const projectedMaintenanceCost = avgAnnualMaintenanceCost * lifecycleYears;
  const projectedTotalCost = replacementCost + projectedMaintenanceCost;

  // Depreciation
  const currentValue = replacementCost * (remainingLife / lifecycleYears);
  const depreciation = replacementCost - currentValue;

  // Repair vs Replace decision
  const repairThreshold = replacementCost * 0.5; // If repair costs > 50% of replacement, consider replacing
  const shouldConsiderReplacement = totalMaintenanceCost > repairThreshold || remainingLife < 2;

  // Calculate required sinking fund
  const yearsUntilReplacement = asset.replacement_year 
    ? asset.replacement_year - new Date().getFullYear()
    : remainingLife;
  const requiredSinkingFund = yearsUntilReplacement > 0 
    ? replacementCost / yearsUntilReplacement 
    : 0;

  return (
    <div className="space-y-4">
      {/* Repair vs Replace Alert */}
      {shouldConsiderReplacement && (
        <Alert className="border-orange-300 bg-orange-50">
          <AlertTriangle className="h-4 w-4 text-orange-600" />
          <AlertDescription className="text-orange-900">
            <strong>Consider Replacement:</strong> This asset may be more cost-effective to replace than repair.
            {totalMaintenanceCost > repairThreshold && 
              ` Maintenance costs (${totalMaintenanceCost.toLocaleString()}) exceed 50% of replacement cost.`
            }
            {remainingLife < 2 && ` Asset is approaching end of lifecycle (${remainingLife} years remaining).`}
          </AlertDescription>
        </Alert>
      )}

      {/* Cost Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-slate-600">Purchase Value</span>
              <DollarSign className="h-5 w-5 text-blue-500" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-slate-900">${purchaseValue.toLocaleString()}</span>
            </div>
            <p className="text-xs text-slate-500 mt-1">Original acquisition cost</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-slate-600">Maintenance Cost</span>
              <TrendingUp className="h-5 w-5 text-purple-500" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-slate-900">${totalMaintenanceCost.toLocaleString()}</span>
            </div>
            <p className="text-xs text-slate-500 mt-1">Total lifetime maintenance</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-slate-600">Total Cost of Ownership</span>
              <ArrowUpDown className="h-5 w-5 text-green-500" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-slate-900">${totalCostOfOwnership.toLocaleString()}</span>
            </div>
            <p className="text-xs text-slate-500 mt-1">Purchase + Maintenance</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-slate-600">Replacement Cost</span>
              <DollarSign className="h-5 w-5 text-orange-500" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-slate-900">${replacementCost.toLocaleString()}</span>
            </div>
            <p className="text-xs text-slate-500 mt-1">Estimated replacement</p>
          </CardContent>
        </Card>
      </div>

      {/* Lifecycle & Depreciation */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Asset Lifecycle
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-slate-600 mb-1">Current Age</p>
                <p className="text-2xl font-bold text-slate-900">{currentAge} yrs</p>
              </div>
              <div>
                <p className="text-sm text-slate-600 mb-1">Expected Life</p>
                <p className="text-2xl font-bold text-slate-900">{lifecycleYears} yrs</p>
              </div>
              <div>
                <p className="text-sm text-slate-600 mb-1">Remaining</p>
                <p className="text-2xl font-bold text-green-600">{remainingLife} yrs</p>
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-slate-600">Lifecycle Progress</span>
                <span className="text-sm font-semibold text-slate-900">{Math.round(lifecyclePercentage)}%</span>
              </div>
              <div className="h-3 bg-slate-200 rounded-full overflow-hidden">
                <div 
                  className={cn(
                    "h-full transition-all rounded-full",
                    lifecyclePercentage > 90 ? "bg-red-500" :
                    lifecyclePercentage > 75 ? "bg-orange-500" :
                    lifecyclePercentage > 50 ? "bg-yellow-500" : "bg-green-500"
                  )}
                  style={{ width: `${Math.min(100, lifecyclePercentage)}%` }}
                />
              </div>
            </div>

            {asset.replacement_year && (
              <div className="pt-2 border-t">
                <p className="text-sm text-slate-600">Planned Replacement Year</p>
                <p className="text-lg font-semibold text-slate-900">{asset.replacement_year}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Depreciation Analysis
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-slate-600 mb-1">Current Value</p>
                <p className="text-2xl font-bold text-green-600">${Math.round(currentValue).toLocaleString()}</p>
              </div>
              <div>
                <p className="text-sm text-slate-600 mb-1">Depreciation</p>
                <p className="text-2xl font-bold text-red-600">${Math.round(depreciation).toLocaleString()}</p>
              </div>
            </div>

            <div>
              <p className="text-sm text-slate-600 mb-2">Annual Maintenance Cost</p>
              <div className="flex items-baseline gap-2">
                <span className="text-xl font-bold text-slate-900">${Math.round(avgAnnualMaintenanceCost).toLocaleString()}</span>
                <span className="text-sm text-slate-500">/ year</span>
              </div>
            </div>

            <div className="pt-2 border-t">
              <p className="text-sm text-slate-600 mb-1">Projected Lifecycle Cost</p>
              <p className="text-lg font-semibold text-slate-900">${Math.round(projectedTotalCost).toLocaleString()}</p>
              <p className="text-xs text-slate-500 mt-1">
                Estimated total over {lifecycleYears} years
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Sinking Fund */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <PiggyBank className="h-5 w-5" />
            Replacement Sinking Fund
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <p className="text-sm text-slate-600 mb-1">Required Annual Contribution</p>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold text-slate-900">${Math.round(requiredSinkingFund).toLocaleString()}</span>
                <span className="text-sm text-slate-500">/ year</span>
              </div>
              <p className="text-xs text-slate-500 mt-2">
                Based on {yearsUntilReplacement} years until replacement
              </p>
            </div>

            {annualSinkingFund > 0 && (
              <>
                <div>
                  <p className="text-sm text-slate-600 mb-1">Current Annual Allocation</p>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-bold text-blue-600">${annualSinkingFund.toLocaleString()}</span>
                    <span className="text-sm text-slate-500">/ year</span>
                  </div>
                </div>

                <div>
                  <p className="text-sm text-slate-600 mb-1">Funding Status</p>
                  <Badge className={cn(
                    "text-lg px-4 py-2",
                    annualSinkingFund >= requiredSinkingFund 
                      ? "bg-green-100 text-green-700"
                      : "bg-orange-100 text-orange-700"
                  )}>
                    {annualSinkingFund >= requiredSinkingFund ? 'Adequately Funded' : 'Underfunded'}
                  </Badge>
                  {annualSinkingFund < requiredSinkingFund && (
                    <p className="text-xs text-slate-500 mt-2">
                      Shortfall: ${Math.round(requiredSinkingFund - annualSinkingFund).toLocaleString()} / year
                    </p>
                  )}
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}