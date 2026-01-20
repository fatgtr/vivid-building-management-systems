import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Wrench, Calendar, Eye, Link as LinkIcon } from 'lucide-react';
import { format } from 'date-fns';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export default function AssetRelationships({ assetId }) {
  const { data: workOrders = [] } = useQuery({
    queryKey: ['asset-work-orders', assetId],
    queryFn: () => base44.entities.WorkOrder.filter({ asset_id: assetId }),
    enabled: !!assetId
  });

  const { data: schedules = [] } = useQuery({
    queryKey: ['asset-schedules', assetId],
    queryFn: () => base44.entities.MaintenanceSchedule.filter({ asset_id: assetId }),
    enabled: !!assetId
  });

  const openWorkOrders = workOrders.filter(wo => wo.status === 'open' || wo.status === 'in_progress');
  const activeSchedules = schedules.filter(s => s.status === 'active');

  return (
    <div className="space-y-4">
      {/* Linked Work Orders */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Wrench className="h-5 w-5 text-orange-600" />
              Related Work Orders
            </CardTitle>
            <Badge variant="secondary">{workOrders.length} total</Badge>
          </div>
        </CardHeader>
        <CardContent>
          {workOrders.length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-4">No work orders linked to this asset</p>
          ) : (
            <div className="space-y-2">
              {workOrders.slice(0, 5).map(wo => (
                <div key={wo.id} className="flex items-center justify-between p-3 border border-slate-200 rounded-lg hover:bg-slate-50">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{wo.title}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant={
                        wo.status === 'completed' ? 'default' :
                        wo.status === 'in_progress' ? 'secondary' :
                        'outline'
                      } className="text-xs">
                        {wo.status?.replace(/_/g, ' ')}
                      </Badge>
                      <Badge className={
                        wo.priority === 'urgent' ? 'bg-red-100 text-red-800' :
                        wo.priority === 'high' ? 'bg-orange-100 text-orange-800' :
                        'bg-blue-100 text-blue-800'
                      } variant="outline">
                        {wo.priority}
                      </Badge>
                      {wo.created_date && (
                        <span className="text-xs text-slate-500">
                          {format(new Date(wo.created_date), 'MMM d')}
                        </span>
                      )}
                    </div>
                  </div>
                  <Link to={createPageUrl('WorkOrders')}>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <Eye className="h-4 w-4" />
                    </Button>
                  </Link>
                </div>
              ))}
              {workOrders.length > 5 && (
                <Link to={createPageUrl('WorkOrders')}>
                  <Button variant="outline" size="sm" className="w-full mt-2">
                    View All {workOrders.length} Work Orders
                  </Button>
                </Link>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Linked Maintenance Schedules */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Calendar className="h-5 w-5 text-purple-600" />
              Maintenance Schedules
            </CardTitle>
            <Badge variant="secondary">{activeSchedules.length} active</Badge>
          </div>
        </CardHeader>
        <CardContent>
          {schedules.length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-4">No maintenance schedules configured</p>
          ) : (
            <div className="space-y-2">
              {schedules.map(schedule => (
                <div key={schedule.id} className="p-3 border border-slate-200 rounded-lg">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="font-medium text-sm">{schedule.task_title}</p>
                      <p className="text-xs text-slate-600 mt-1">{schedule.description}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <Badge variant="outline" className="text-xs capitalize">
                          {schedule.frequency?.replace(/_/g, ' ')}
                        </Badge>
                        {schedule.status === 'active' && (
                          <Badge className="bg-green-100 text-green-800 text-xs">
                            Active
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}