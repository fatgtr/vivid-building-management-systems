import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ASSET_CATEGORIES } from '@/components/categories/assetCategories';
import { 
  Package, 
  MapPin,
  Building,
  Calendar,
  CheckCircle2,
  Upload,
  History,
  Wrench
} from 'lucide-react';
import { format } from 'date-fns';

export default function ContractorView({ assets, getLocationName }) {
  // Contractors see assets assigned to them for service
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {assets.map((asset) => {
        const categoryConfig = ASSET_CATEGORIES[asset.asset_main_category];
        const Icon = categoryConfig?.icon || Package;
        const colorClass = categoryConfig?.color || 'text-slate-600 bg-slate-50 border-slate-200';

        return (
          <Card key={asset.id} className="hover:shadow-lg transition-shadow">
            <CardContent className="p-5">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg ${colorClass} flex items-center justify-center flex-shrink-0`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900">{asset.name}</h3>
                    <p className="text-xs text-slate-500">{categoryConfig?.label}</p>
                  </div>
                </div>
                {asset.next_service_date && (
                  <Badge className="bg-blue-100 text-blue-800">
                    Due Soon
                  </Badge>
                )}
              </div>

              {/* Service Schedule */}
              <div className="bg-blue-50 p-3 rounded-lg mb-3 border border-blue-200">
                <div className="flex items-center gap-2 mb-2">
                  <Wrench className="h-4 w-4 text-blue-700" />
                  <span className="text-sm font-semibold text-blue-900">Service Schedule</span>
                </div>
                <div className="space-y-1 text-xs text-slate-700">
                  {asset.next_service_date && (
                    <div>
                      <span className="font-medium">Next Service:</span> {format(new Date(asset.next_service_date), 'MMM d, yyyy')}
                    </div>
                  )}
                  {asset.last_service_date && (
                    <div>
                      <span className="font-medium">Last Service:</span> {format(new Date(asset.last_service_date), 'MMM d, yyyy')}
                    </div>
                  )}
                  {asset.service_frequency && (
                    <div>
                      <span className="font-medium">Frequency:</span> {asset.service_frequency.replace(/_/g, ' ')}
                    </div>
                  )}
                </div>
              </div>

              {/* Location Details */}
              <div className="space-y-2 mb-3">
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
              </div>

              {/* Asset Details */}
              <div className="space-y-1 text-xs text-slate-600 mb-4">
                {asset.identifier && (
                  <div><span className="font-medium">ID:</span> <span className="font-mono">{asset.identifier}</span></div>
                )}
                {asset.manufacturer && (
                  <div><span className="font-medium">Manufacturer:</span> {asset.manufacturer}</div>
                )}
                {asset.model && (
                  <div><span className="font-medium">Model:</span> {asset.model}</div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-2 gap-2 pt-3 border-t border-slate-200">
                <Button size="sm" variant="outline" className="gap-2">
                  <Upload className="h-4 w-4" />
                  Upload Cert
                </Button>
                <Button size="sm" variant="outline" className="gap-2">
                  <History className="h-4 w-4" />
                  History
                </Button>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}