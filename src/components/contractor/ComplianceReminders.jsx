import React, { useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertTriangle, AlertCircle, CheckCircle2, Calendar, Upload } from 'lucide-react';
import { format, differenceInDays, parseISO } from 'date-fns';
import { toast } from 'sonner';

const complianceFields = [
  { key: 'license_expiry_date', label: 'Trade License', uploadLabel: 'Upload Trade License' },
  { key: 'insurance_expiry', label: 'General Insurance', uploadLabel: 'Upload Insurance Certificate' },
  { key: 'work_cover_expiry_date', label: 'Workers Compensation', uploadLabel: 'Upload Work Cover' },
  { key: 'public_liability_expiry_date', label: 'Public Liability Insurance', uploadLabel: 'Upload Public Liability' },
];

export default function ComplianceReminders({ contractor, onDocumentUpload }) {
  const getExpiryStatus = (expiryDate) => {
    if (!expiryDate) return { status: 'missing', color: 'red', icon: AlertTriangle, label: 'Not Set' };
    
    const days = differenceInDays(parseISO(expiryDate), new Date());
    
    if (days < 0) return { status: 'expired', color: 'red', icon: AlertTriangle, label: 'Expired' };
    if (days <= 30) return { status: 'expiring_soon', color: 'orange', icon: AlertCircle, label: `${days} days left` };
    if (days <= 60) return { status: 'warning', color: 'yellow', icon: Calendar, label: `${days} days left` };
    return { status: 'compliant', color: 'green', icon: CheckCircle2, label: 'Valid' };
  };

  const complianceItems = complianceFields.map(field => {
    const expiryDate = contractor[field.key];
    const status = getExpiryStatus(expiryDate);
    return {
      ...field,
      expiryDate,
      ...status
    };
  });

  const criticalItems = complianceItems.filter(item => 
    item.status === 'expired' || item.status === 'expiring_soon' || item.status === 'missing'
  );

  // Show reminders on mount for critical items
  useEffect(() => {
    if (criticalItems.length > 0) {
      criticalItems.forEach(item => {
        if (item.status === 'expired') {
          toast.error(`${item.label} has expired! Please upload a new certificate.`, {
            duration: 10000,
          });
        } else if (item.status === 'expiring_soon') {
          toast.warning(`${item.label} expires in ${differenceInDays(parseISO(item.expiryDate), new Date())} days.`, {
            duration: 8000,
          });
        }
      });
    }
  }, [contractor.id]);

  const colorClasses = {
    red: 'bg-red-50 border-red-200 text-red-900',
    orange: 'bg-orange-50 border-orange-200 text-orange-900',
    yellow: 'bg-yellow-50 border-yellow-200 text-yellow-900',
    green: 'bg-green-50 border-green-200 text-green-900',
  };

  const badgeClasses = {
    red: 'bg-red-100 text-red-700',
    orange: 'bg-orange-100 text-orange-700',
    yellow: 'bg-yellow-100 text-yellow-700',
    green: 'bg-emerald-100 text-emerald-700',
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Compliance Status</CardTitle>
          {criticalItems.length > 0 && (
            <Badge className="bg-red-100 text-red-700">
              {criticalItems.length} Require Action
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {complianceItems.map((item) => {
          const Icon = item.icon;
          return (
            <div 
              key={item.key} 
              className={`p-4 rounded-lg border ${colorClasses[item.color]} transition-all`}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Icon className={`h-5 w-5 text-${item.color}-600`} />
                  <div>
                    <p className="font-medium">{item.label}</p>
                    {item.expiryDate && (
                      <p className="text-xs opacity-75 mt-0.5">
                        Expires: {format(parseISO(item.expiryDate), 'MMM d, yyyy')}
                      </p>
                    )}
                  </div>
                </div>
                <Badge className={badgeClasses[item.color]}>
                  {item.label}
                </Badge>
              </div>

              {(item.status === 'expired' || item.status === 'expiring_soon' || item.status === 'missing') && (
                <div className="mt-3 pt-3 border-t border-current/10">
                  <Button 
                    size="sm" 
                    variant="outline" 
                    className="w-full"
                    onClick={() => onDocumentUpload?.(item.key)}
                  >
                    <Upload className="h-3 w-3 mr-2" />
                    {item.uploadLabel}
                  </Button>
                </div>
              )}
            </div>
          );
        })}

        {criticalItems.length === 0 && (
          <div className="text-center py-6">
            <CheckCircle2 className="h-12 w-12 text-emerald-500 mx-auto mb-2" />
            <p className="text-sm font-medium text-slate-900">All Compliance Documents Valid</p>
            <p className="text-xs text-slate-500 mt-1">Your certifications are up to date</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}