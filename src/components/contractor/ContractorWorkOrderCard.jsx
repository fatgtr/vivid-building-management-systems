import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import StatusBadge from '@/components/common/StatusBadge';
import ContractorWorkOrderDetail from '@/components/contractor/ContractorWorkOrderDetail';
import { Building2, MapPin, Calendar, DollarSign, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';

const categoryIcons = {
  plumbing: '🔧',
  electrical: '⚡',
  hvac: '❄️',
  appliance: '🔌',
  structural: '🏗️',
  pest_control: '🐛',
  cleaning: '🧹',
  landscaping: '🌳',
  security: '🔒',
  other: '📋'
};

export default function ContractorWorkOrderCard({ workOrder, onGenerateBid }) {
  const [showDetail, setShowDetail] = useState(false);

  const { data: buildings = [] } = useQuery({
    queryKey: ['buildings'],
    queryFn: () => base44.entities.Building.list(),
  });

  const building = buildings.find(b => b.id === workOrder.building_id);

  return (
    <>
      <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => setShowDetail(true)}>
        <CardContent className="p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-4 flex-1">
              <div className="text-3xl">{categoryIcons[workOrder.category] || '📋'}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="font-semibold text-lg text-slate-900">{workOrder.title}</h3>
                  <StatusBadge status={workOrder.status} />
                  {workOrder.priority === 'urgent' && (
                    <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs font-medium rounded-full">Urgent</span>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-3 text-sm text-slate-500 mb-2">
                  {building && (
                    <span className="flex items-center gap-1">
                      <Building2 className="h-3.5 w-3.5" />
                      {building.name}
                    </span>
                  )}
                  {workOrder.job_area && (
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5" />
                      {workOrder.job_area}
                    </span>
                  )}
                  {workOrder.due_date && (
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5" />
                      Due: {format(new Date(workOrder.due_date), 'MMM d, yyyy')}
                    </span>
                  )}
                  {workOrder.estimated_cost && (
                    <span className="flex items-center gap-1">
                      <DollarSign className="h-3.5 w-3.5" />
                      ${workOrder.estimated_cost}
                    </span>
                  )}
                </div>
                <p className="text-slate-600 text-sm line-clamp-2">{workOrder.description}</p>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={() => setShowDetail(true)}>
              <ChevronRight className="h-5 w-5" />
            </Button>
          </div>
        </CardContent>
      </Card>

      <Dialog open={showDetail} onOpenChange={setShowDetail}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Work Order Details</DialogTitle>
          </DialogHeader>
          <ContractorWorkOrderDetail workOrder={workOrder} onClose={() => setShowDetail(false)} />
        </DialogContent>
      </Dialog>
    </>
  );
}