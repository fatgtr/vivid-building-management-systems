import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Activity, Calendar, DollarSign, Wrench, AlertTriangle, TrendingUp, Clock } from 'lucide-react';
import { format, differenceInMonths, differenceInYears } from 'date-fns';

export default function AssetLifecycleTracker({ assetId }) {
  const queryClient = useQueryClient();

  const { data: asset } = useQuery({
    queryKey: ['asset', assetId],
    queryFn: () => base44.entities.Asset.get(assetId),
    enabled: !!assetId
  });

  const { data: serviceRecords = [] } = useQuery({
    queryKey: ['serviceRecords', assetId],
    queryFn: () => base44.entities.ServiceRecord.filter({ asset_id: assetId }),
    enabled: !!assetId
  });

  const { data: workOrders = [] } = useQuery({
    queryKey: ['assetWorkOrders', assetId],
    queryFn: () => base44.entities.WorkOrder.filter({ asset_id: assetId }),
    enabled: !!assetId
  });

  if (!asset) return null;

  // Calculate asset age
  const installDate = asset.installation_date ? new Date(asset.installation_date) : null;
  const ageMonths = installDate ? differenceInMonths(new Date(), installDate) : 0;
  const ageYears = installDate ? differenceInYears(new Date(), installDate) : 0;

  // Expected lifespan and remaining life
  const expectedLifespan = asset.expected_lifespan || 120; // months
  const remainingLife = Math.max(0, expectedLifespan - ageMonths);
  const lifespanProgress = (ageMonths / expectedLifespan) * 100;

  // Calculate total maintenance costs
  const totalCosts = workOrders
    .filter(wo => wo.actual_cost)
    .reduce((sum, wo) => sum + wo.actual_cost, 0);

  // Calculate depreciation
  const purchaseValue = asset.purchase_value || 0;
  const currentValue = asset.current_value || purchaseValue * (1 - (ageMonths / expectedLifespan));
  const depreciation = purchaseValue - currentValue;

  // Service frequency
  const monthsSinceLastService = asset.last_service_date 
    ? differenceInMonths(new Date(), new Date(asset.last_service_date))
    : null;

  // Health score (0-100)
  const healthScore = Math.max(0, Math.min(100, 
    100 - (lifespanProgress * 0.4) - 
    (workOrders.filter(wo => wo.priority === 'urgent').length * 10) -
    (monthsSinceLastService && monthsSinceLastService > 6 ? 20 : 0)
  ));

  const getHealthColor = (score) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-blue-600';
    if (score >= 40) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Health Score</p>
                <p className={`text-3xl font-bold ${getHealthColor(healthScore)}`}>
                  {healthScore.toFixed(0)}%
                </p>
              </div>
              <Activity className={`h-10 w-10 opacity-20 ${getHealthColor(healthScore)}`} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Age</p>
                <p className="text-3xl font-bold">{ageYears}y</p>
                <p className="text-xs text-slate-600">{ageMonths % 12}m</p>
              </div>
              <Clock className="h-10 w-10 text-blue-600 opacity-20" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Total Costs</p>
                <p className="text-3xl font-bold text-orange-600">${totalCosts.toFixed(0)}</p>
              </div>
              <DollarSign className="h-10 w-10 text-orange-600 opacity-20" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Work Orders</p>
                <p className="text-3xl font-bold">{workOrders.length}</p>
              </div>
              <Wrench className="h-10 w-10 text-purple-600 opacity-20" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Lifecycle Progress */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Lifecycle Progress
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <div className="flex justify-between mb-2">
              <span className="text-sm font-medium">Expected Lifespan</span>
              <span className="text-sm text-slate-600">
                {remainingLife} months remaining ({(remainingLife / 12).toFixed(1)} years)
              </span>
            </div>
            <Progress value={lifespanProgress} className="h-3" />
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t">
            <div>
              <p className="text-xs text-slate-500">Installation Date</p>
              <p className="font-semibold">
                {installDate ? format(installDate, 'MMM d, yyyy') : 'Unknown'}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Last Service</p>
              <p className="font-semibold">
                {asset.last_service_date 
                  ? format(new Date(asset.last_service_date), 'MMM d, yyyy')
                  : 'Never'}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Purchase Value</p>
              <p className="font-semibold">${purchaseValue.toFixed(0)}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Current Value</p>
              <p className="font-semibold text-green-600">${currentValue.toFixed(0)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs for History */}
      <Card>
        <CardHeader>
          <CardTitle>Asset History</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="workorders">
            <TabsList>
              <TabsTrigger value="workorders">Work Orders ({workOrders.length})</TabsTrigger>
              <TabsTrigger value="service">Service Records ({serviceRecords.length})</TabsTrigger>
              <TabsTrigger value="costs">Cost Analysis</TabsTrigger>
            </TabsList>

            <TabsContent value="workorders" className="space-y-3">
              {workOrders.length === 0 ? (
                <p className="text-sm text-slate-500 py-4">No work orders yet</p>
              ) : (
                workOrders.map(wo => (
                  <div key={wo.id} className="p-4 border rounded-lg">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-medium">{wo.title}</p>
                        <p className="text-sm text-slate-600">{wo.description}</p>
                        <p className="text-xs text-slate-500 mt-1">
                          {format(new Date(wo.created_date), 'MMM d, yyyy')}
                        </p>
                      </div>
                      <div className="text-right">
                        <Badge>{wo.status}</Badge>
                        {wo.actual_cost && (
                          <p className="text-sm font-semibold mt-1">${wo.actual_cost}</p>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </TabsContent>

            <TabsContent value="service" className="space-y-3">
              {serviceRecords.length === 0 ? (
                <p className="text-sm text-slate-500 py-4">No service records yet</p>
              ) : (
                serviceRecords.map(record => (
                  <div key={record.id} className="p-4 border rounded-lg">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-medium">{record.service_type}</p>
                        <p className="text-sm text-slate-600">{record.description}</p>
                        <p className="text-xs text-slate-500 mt-1">
                          {format(new Date(record.service_date), 'MMM d, yyyy')}
                        </p>
                      </div>
                      {record.cost && (
                        <p className="text-sm font-semibold">${record.cost}</p>
                      )}
                    </div>
                  </div>
                ))
              )}
            </TabsContent>

            <TabsContent value="costs">
              <div className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-slate-50 rounded-lg">
                    <p className="text-sm text-slate-600">Total Maintenance</p>
                    <p className="text-2xl font-bold">${totalCosts.toFixed(2)}</p>
                  </div>
                  <div className="p-4 bg-slate-50 rounded-lg">
                    <p className="text-sm text-slate-600">Depreciation</p>
                    <p className="text-2xl font-bold text-orange-600">${depreciation.toFixed(2)}</p>
                  </div>
                </div>

                <div className="p-4 border rounded-lg">
                  <p className="text-sm font-medium mb-2">Cost Breakdown</p>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Purchase Price:</span>
                      <span className="font-semibold">${purchaseValue.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Total Maintenance:</span>
                      <span className="font-semibold">${totalCosts.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Depreciation:</span>
                      <span className="font-semibold text-orange-600">-${depreciation.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between border-t pt-2 font-bold">
                      <span>Current Value:</span>
                      <span className="text-green-600">${currentValue.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}