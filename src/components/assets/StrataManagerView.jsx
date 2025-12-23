import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ASSET_CATEGORIES } from '@/components/categories/assetCategories';
import { 
  Package, 
  AlertTriangle,
  CheckCircle2,
  Clock,
  AlertCircle,
  DollarSign,
  Calendar,
  Shield,
  Flame
} from 'lucide-react';
import { format, differenceInYears } from 'date-fns';

const complianceStatusConfig = {
  compliant: { icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50', label: 'Compliant' },
  due_soon: { icon: Clock, color: 'text-yellow-600', bg: 'bg-yellow-50', label: 'Due Soon' },
  overdue: { icon: AlertTriangle, color: 'text-red-600', bg: 'bg-red-50', label: 'Overdue' },
  requires_attention: { icon: AlertCircle, color: 'text-orange-600', bg: 'bg-orange-50', label: 'Needs Attention' },
  unknown: { icon: AlertCircle, color: 'text-slate-600', bg: 'bg-slate-50', label: 'Unknown' },
};

export default function StrataManagerView({ assets, getBuildingName, selectedBuildingId }) {
  // Focus on compliance, capital works, and AFSS items
  const isAFSSAsset = (asset) => asset.asset_main_category === 'fire_life_safety';
  
  const calculateRemainingLife = (asset) => {
    if (!asset.installation_date || !asset.lifecycle_years) return null;
    const age = differenceInYears(new Date(), new Date(asset.installation_date));
    return Math.max(0, asset.lifecycle_years - age);
  };

  return (
    <div className="space-y-6">
      {/* Compliance Overview */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
        {Object.entries(complianceStatusConfig).map(([status, config]) => {
          const Icon = config.icon;
          const count = assets.filter(a => a.compliance_status === status).length;
          return (
            <Card key={status} className={count > 0 ? config.bg : ''}>
              <CardContent className="p-4 text-center">
                <Icon className={`h-5 w-5 ${config.color} mx-auto mb-2`} />
                <p className="text-2xl font-bold text-slate-900">{count}</p>
                <p className="text-xs text-slate-600">{config.label}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Asset Grid - Compliance Focused */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {assets.map((asset) => {
          const categoryConfig = ASSET_CATEGORIES[asset.asset_main_category];
          const Icon = categoryConfig?.icon || Package;
          const colorClass = categoryConfig?.color || 'text-slate-600 bg-slate-50 border-slate-200';
          const complianceConfig = complianceStatusConfig[asset.compliance_status] || complianceStatusConfig.unknown;
          const ComplianceIcon = complianceConfig.icon;
          const remainingLife = calculateRemainingLife(asset);

          return (
            <Card key={asset.id} className="hover:shadow-lg transition-shadow">
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg ${colorClass} flex items-center justify-center flex-shrink-0`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-semibold text-slate-900">{asset.name}</h3>
                      <p className="text-xs text-slate-500">{categoryConfig?.label}</p>
                    </div>
                  </div>
                  {isAFSSAsset(asset) && (
                    <Badge className="bg-orange-100 text-orange-800 gap-1">
                      <Flame className="h-3 w-3" />
                      AFSS
                    </Badge>
                  )}
                </div>

                {/* Compliance Status - Prominent */}
                <div className={`mb-3 p-3 rounded-lg ${complianceConfig.bg} border-2 ${complianceConfig.bg.replace('50', '200')}`}>
                  <div className={`flex items-center gap-2 ${complianceConfig.color}`}>
                    <ComplianceIcon className="h-5 w-5" />
                    <span className="font-semibold">{complianceConfig.label}</span>
                  </div>
                  {asset.next_service_date && (
                    <div className="mt-1 text-xs text-slate-600">
                      Due: {format(new Date(asset.next_service_date), 'MMM d, yyyy')}
                    </div>
                  )}
                </div>

                {/* Capital Works Info */}
                {(asset.replacement_cost || remainingLife !== null) && (
                  <div className="bg-green-50 p-3 rounded-lg border border-green-200 mb-3">
                    <div className="flex items-center gap-2 mb-2">
                      <DollarSign className="h-4 w-4 text-green-700" />
                      <span className="text-sm font-semibold text-green-900">Capital Works</span>
                    </div>
                    <div className="space-y-1 text-xs text-slate-700">
                      {remainingLife !== null && (
                        <div>
                          <span className="font-medium">Remaining Life:</span> {remainingLife} years
                        </div>
                      )}
                      {asset.replacement_cost && (
                        <div>
                          <span className="font-medium">Replacement Cost:</span> ${asset.replacement_cost.toLocaleString()}
                        </div>
                      )}
                      {asset.replacement_year && (
                        <div>
                          <span className="font-medium">Target Year:</span> {asset.replacement_year}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Location & Identifier */}
                <div className="space-y-1 text-xs text-slate-600">
                  {asset.location && (
                    <div><span className="font-medium">Location:</span> {asset.location}</div>
                  )}
                  {asset.identifier && (
                    <div><span className="font-medium">ID:</span> {asset.identifier}</div>
                  )}
                  {!selectedBuildingId && (
                    <div><span className="font-medium">Building:</span> {getBuildingName(asset.building_id)}</div>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}