import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import StatusBadge from '@/components/common/StatusBadge';
import { ASSET_CATEGORIES } from '@/components/categories/assetCategories';
import { 
  Package, 
  MapPin, 
  Calendar,
  Building,
  AlertTriangle,
  CheckCircle2,
  Clock,
  AlertCircle,
  Wrench,
  Shield
} from 'lucide-react';
import { format } from 'date-fns';

const complianceStatusConfig = {
  compliant: { icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50', label: 'Compliant' },
  due_soon: { icon: Clock, color: 'text-yellow-600', bg: 'bg-yellow-50', label: 'Due Soon' },
  overdue: { icon: AlertTriangle, color: 'text-red-600', bg: 'bg-red-50', label: 'Overdue' },
  requires_attention: { icon: AlertCircle, color: 'text-orange-600', bg: 'bg-orange-50', label: 'Needs Attention' },
  unknown: { icon: AlertCircle, color: 'text-slate-600', bg: 'bg-slate-50', label: 'Unknown' },
};

export default function BuildingManagerView({ assets, getBuildingName, getLocationName, selectedBuildingId }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
      {assets.map((asset) => {
        const categoryConfig = ASSET_CATEGORIES[asset.asset_main_category];
        const Icon = categoryConfig?.icon || Package;
        const colorClass = categoryConfig?.color || 'text-slate-600 bg-slate-50 border-slate-200';
        const complianceConfig = complianceStatusConfig[asset.compliance_status] || complianceStatusConfig.unknown;
        const ComplianceIcon = complianceConfig.icon;

        return (
          <Card key={asset.id} className="hover:shadow-lg transition-shadow">
            <CardContent className="p-5">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg ${colorClass} flex items-center justify-center flex-shrink-0`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-semibold text-slate-900 truncate">{asset.name}</h3>
                    <p className="text-xs text-slate-500 capitalize">{asset.asset_type?.replace(/_/g, ' ')}</p>
                  </div>
                </div>
                <StatusBadge status={asset.status} />
              </div>

              {asset.identifier && (
                <div className="mb-3 pb-3 border-b border-slate-100">
                  <p className="text-xs text-slate-500">Identifier</p>
                  <p className="text-sm font-mono text-slate-700">{asset.identifier}</p>
                </div>
              )}

              <div className="space-y-2">
                {(asset.location || asset.location_id) && (
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <MapPin className="h-4 w-4 text-slate-400" />
                    <span className="truncate">
                      {getLocationName(asset.location_id) || asset.location}
                    </span>
                  </div>
                )}

                {asset.floor && (
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <Building className="h-4 w-4 text-slate-400" />
                    <span>Floor {asset.floor}</span>
                  </div>
                )}

                {asset.manufacturer && (
                  <div className="text-xs text-slate-500">
                    <span className="font-medium">Manufacturer:</span> {asset.manufacturer}
                  </div>
                )}

                {/* Service Schedule */}
                {asset.next_service_date && (
                  <div className="flex items-center gap-2 text-sm bg-blue-50 p-2 rounded">
                    <Wrench className="h-4 w-4 text-blue-600" />
                    <span className="text-slate-700 font-medium">
                      Next: {format(new Date(asset.next_service_date), 'MMM d, yyyy')}
                    </span>
                  </div>
                )}

                {asset.service_frequency && (
                  <div className="text-xs text-slate-500">
                    <span className="font-medium">Frequency:</span> {asset.service_frequency.replace(/_/g, ' ')}
                  </div>
                )}

                {/* Risk Rating */}
                {asset.risk_rating && (
                  <div className="flex items-center gap-2">
                    <Shield className="h-4 w-4 text-slate-400" />
                    <Badge className={
                      asset.risk_rating === 'critical' ? 'bg-red-100 text-red-800' :
                      asset.risk_rating === 'high' ? 'bg-orange-100 text-orange-800' :
                      asset.risk_rating === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-green-100 text-green-800'
                    }>
                      {asset.risk_rating} risk
                    </Badge>
                  </div>
                )}

                {!selectedBuildingId && (
                  <div className="text-xs text-slate-500 pt-2 border-t border-slate-100">
                    <span className="font-medium">Building:</span> {getBuildingName(asset.building_id)}
                  </div>
                )}
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100">
                <div className={`flex items-center gap-2 ${complianceConfig.color}`}>
                  <ComplianceIcon className="h-4 w-4" />
                  <span className="text-sm font-medium">{complianceConfig.label}</span>
                </div>
              </div>

              {(asset.notes && asset.notes !== 'null') && (
                <div className="mt-3 pt-3 border-t border-slate-100">
                  <p className="text-xs text-slate-600 line-clamp-2">{asset.notes}</p>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}