import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, CheckCircle2, Clock, Calendar } from 'lucide-react';
import { format, differenceInDays } from 'date-fns';

export default function AssetWarrantyTracker({ asset }) {
  if (!asset.warranty_expiry_date) {
    return null;
  }

  const today = new Date();
  const expiryDate = new Date(asset.warranty_expiry_date);
  const daysUntilExpiry = differenceInDays(expiryDate, today);
  const isExpired = daysUntilExpiry < 0;
  const isExpiringSoon = daysUntilExpiry >= 0 && daysUntilExpiry <= 90;

  const getStatusColor = () => {
    if (isExpired) return 'bg-red-100 border-red-300 text-red-800';
    if (daysUntilExpiry <= 30) return 'bg-orange-100 border-orange-300 text-orange-800';
    if (daysUntilExpiry <= 90) return 'bg-yellow-100 border-yellow-300 text-yellow-800';
    return 'bg-green-100 border-green-300 text-green-800';
  };

  const getStatusIcon = () => {
    if (isExpired) return <AlertTriangle className="h-5 w-5 text-red-600" />;
    if (isExpiringSoon) return <Clock className="h-5 w-5 text-orange-600" />;
    return <CheckCircle2 className="h-5 w-5 text-green-600" />;
  };

  const getStatusText = () => {
    if (isExpired) return 'Expired';
    if (daysUntilExpiry <= 30) return 'Expiring Soon';
    if (daysUntilExpiry <= 90) return 'Expiring in 90 Days';
    return 'Valid';
  };

  return (
    <Card className={`border-2 ${getStatusColor()}`}>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          {getStatusIcon()}
          Warranty Status
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm text-slate-700">Status</span>
          <Badge className={getStatusColor()}>
            {getStatusText()}
          </Badge>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-slate-700">Expiry Date</span>
          <div className="flex items-center gap-1 text-sm font-medium">
            <Calendar className="h-3 w-3" />
            {format(expiryDate, 'MMM d, yyyy')}
          </div>
        </div>
        {!isExpired && (
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-700">Days Remaining</span>
            <span className={`text-sm font-bold ${
              daysUntilExpiry <= 30 ? 'text-red-600' : 
              daysUntilExpiry <= 90 ? 'text-orange-600' : 
              'text-green-600'
            }`}>
              {daysUntilExpiry} days
            </span>
          </div>
        )}
        {isExpired && (
          <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-800">
            ⚠️ Warranty has expired. Consider renewal or replacement.
          </div>
        )}
      </CardContent>
    </Card>
  );
}