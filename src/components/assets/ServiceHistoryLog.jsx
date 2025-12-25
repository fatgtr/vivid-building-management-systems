import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Wrench, 
  Calendar, 
  User, 
  FileText, 
  DollarSign, 
  CheckCircle,
  AlertCircle,
  Clock
} from 'lucide-react';
import { format } from 'date-fns';

const serviceTypeColors = {
  'scheduled_maintenance': 'bg-blue-50 text-blue-700 border-blue-200',
  'preventative_maintenance': 'bg-green-50 text-green-700 border-green-200',
  'corrective_maintenance': 'bg-orange-50 text-orange-700 border-orange-200',
  'emergency_repair': 'bg-red-50 text-red-700 border-red-200',
  'inspection': 'bg-purple-50 text-purple-700 border-purple-200',
  'testing': 'bg-cyan-50 text-cyan-700 border-cyan-200',
  'replacement': 'bg-amber-50 text-amber-700 border-amber-200',
  'upgrade': 'bg-indigo-50 text-indigo-700 border-indigo-200',
};

const statusIcons = {
  'completed': CheckCircle,
  'incomplete': AlertCircle,
  'requires_followup': Clock,
  'failed': AlertCircle,
};

export default function ServiceHistoryLog({ assetId }) {
  const { data: serviceRecords = [], isLoading } = useQuery({
    queryKey: ['serviceRecords', assetId],
    queryFn: () => base44.entities.ServiceRecord.filter({ asset_id: assetId }, '-service_date'),
  });

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
      </div>
    );
  }

  if (serviceRecords.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-8 text-center">
          <Wrench className="h-8 w-8 mx-auto mb-2 text-slate-300" />
          <p className="text-sm text-slate-500">No service history yet</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      <h4 className="font-medium text-slate-900 flex items-center gap-2">
        <Wrench className="h-4 w-4" />
        Service History ({serviceRecords.length} records)
      </h4>
      
      <ScrollArea className="h-[500px] pr-4">
        <div className="space-y-3">
          {serviceRecords.map((record) => {
            const StatusIcon = statusIcons[record.status] || CheckCircle;
            const statusColor = record.status === 'completed' ? 'text-green-600' : 
                               record.status === 'failed' ? 'text-red-600' : 'text-orange-600';
            
            return (
              <Card key={record.id} className="border-2">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge className={serviceTypeColors[record.service_type] || 'bg-slate-100'}>
                          {record.service_type?.replace(/_/g, ' ')}
                        </Badge>
                        <div className={`flex items-center gap-1 text-sm ${statusColor}`}>
                          <StatusIcon className="h-3 w-3" />
                          <span className="capitalize">{record.status}</span>
                        </div>
                      </div>
                      <CardTitle className="text-base">
                        {record.description || 'Service Record'}
                      </CardTitle>
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent className="space-y-3 text-sm">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex items-center gap-2 text-slate-600">
                      <Calendar className="h-3 w-3" />
                      <span>{format(new Date(record.service_date), 'MMM d, yyyy')}</span>
                    </div>
                    
                    {record.contractor_name && (
                      <div className="flex items-center gap-2 text-slate-600">
                        <User className="h-3 w-3" />
                        <span className="truncate">{record.contractor_name}</span>
                      </div>
                    )}
                    
                    {record.technician_name && (
                      <div className="flex items-center gap-2 text-slate-600 col-span-2">
                        <User className="h-3 w-3" />
                        <span>Technician: {record.technician_name}</span>
                      </div>
                    )}
                  </div>

                  {record.findings && (
                    <div className="bg-slate-50 rounded-lg p-3">
                      <p className="text-xs font-medium text-slate-700 mb-1">Findings:</p>
                      <p className="text-xs text-slate-600">{record.findings}</p>
                    </div>
                  )}

                  {record.issues_found && record.issues_found.length > 0 && (
                    <div className="bg-orange-50 rounded-lg p-3">
                      <p className="text-xs font-medium text-orange-700 mb-1">Issues Found:</p>
                      <ul className="text-xs text-orange-600 list-disc list-inside space-y-0.5">
                        {record.issues_found.map((issue, idx) => (
                          <li key={idx}>{issue}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {record.recommendations && (
                    <div className="bg-blue-50 rounded-lg p-3">
                      <p className="text-xs font-medium text-blue-700 mb-1">Recommendations:</p>
                      <p className="text-xs text-blue-600">{record.recommendations}</p>
                    </div>
                  )}

                  {record.parts_replaced && record.parts_replaced.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-slate-700 mb-1">Parts Replaced:</p>
                      <div className="space-y-1">
                        {record.parts_replaced.map((part, idx) => (
                          <div key={idx} className="text-xs text-slate-600 flex justify-between">
                            <span>{part.part_name} {part.part_number && `(${part.part_number})`}</span>
                            <span className="text-slate-500">
                              Qty: {part.quantity} {part.cost && `• $${part.cost.toFixed(2)}`}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-2 border-t border-slate-200">
                    <div className="flex gap-3">
                      {record.labour_hours && (
                        <span className="text-xs text-slate-500">
                          {record.labour_hours}h labour
                        </span>
                      )}
                      {record.next_service_date && (
                        <span className="text-xs text-slate-500">
                          Next: {format(new Date(record.next_service_date), 'MMM d, yyyy')}
                        </span>
                      )}
                    </div>
                    
                    {record.total_cost && (
                      <div className="flex items-center gap-1 text-slate-700 font-medium">
                        <DollarSign className="h-3 w-3" />
                        <span className="text-xs">${record.total_cost.toFixed(2)}</span>
                      </div>
                    )}
                  </div>

                  {record.documents && record.documents.length > 0 && (
                    <div className="flex items-center gap-1 text-xs text-blue-600">
                      <FileText className="h-3 w-3" />
                      <span>{record.documents.length} attached document(s)</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}