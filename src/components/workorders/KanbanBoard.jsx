import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertCircle, Clock, Building2, Eye, Star, User, Repeat } from 'lucide-react';
import { format } from 'date-fns';
import StatusBadge from '@/components/common/StatusBadge';
import { cn } from "@/lib/utils";

const columns = [
  { id: 'open', title: 'Open', color: 'bg-yellow-500' },
  { id: 'in_progress', title: 'In Progress', color: 'bg-blue-500' },
  { id: 'on_hold', title: 'On Hold', color: 'bg-orange-500' },
  { id: 'completed', title: 'Completed', color: 'bg-green-500' },
];

const priorityIcons = {
  urgent: <AlertCircle className="h-3 w-3 text-red-500" />,
  high: <AlertCircle className="h-3 w-3 text-orange-500" />,
  medium: <Clock className="h-3 w-3 text-blue-500" />,
  low: <Clock className="h-3 w-3 text-slate-400" />,
};

export default function KanbanBoard({ workOrders, buildings, units, onViewDetails, onStatusChange }) {
  const getBuildingName = (buildingId) => buildings.find(b => b.id === buildingId)?.name || 'Unknown';
  const getUnitNumber = (unitId) => units.find(u => u.id === unitId)?.unit_number || '';

  const getOrdersByStatus = (status) => {
    return workOrders.filter(order => order.status === status);
  };

  const handleDragStart = (e, orderId) => {
    e.dataTransfer.setData('orderId', orderId);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = (e, newStatus) => {
    e.preventDefault();
    const orderId = e.dataTransfer.getData('orderId');
    const order = workOrders.find(o => o.id === orderId);
    if (order && order.status !== newStatus) {
      onStatusChange(order, newStatus);
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {columns.map(column => {
        const orders = getOrdersByStatus(column.id);
        return (
          <div
            key={column.id}
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, column.id)}
            className="flex flex-col"
          >
            <div className="mb-3 flex items-center gap-2">
              <div className={cn("w-3 h-3 rounded-full", column.color)} />
              <h3 className="font-semibold text-slate-900">{column.title}</h3>
              <Badge variant="secondary" className="ml-auto">{orders.length}</Badge>
            </div>
            
            <div className="flex-1 space-y-3 min-h-[400px] bg-slate-50 rounded-lg p-3">
              {orders.map(order => (
                <Card
                  key={order.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, order.id)}
                  className="cursor-move hover:shadow-md transition-shadow border-l-4"
                  style={{ borderLeftColor: columns.find(c => c.id === order.status)?.color.replace('bg-', '#') }}
                >
                  <CardContent className="p-3">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-1">
                        {priorityIcons[order.priority]}
                        <span className="text-xs text-slate-500 capitalize">{order.priority}</span>
                      </div>
                      {order.rating && (
                        <div className="flex items-center gap-1">
                          <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />
                          <span className="text-xs font-medium">{order.rating}</span>
                        </div>
                      )}
                    </div>
                    
                    <h4 className="font-medium text-sm text-slate-900 mb-1 line-clamp-2">
                      {order.title}
                    </h4>
                    
                    <div className="space-y-1 text-xs text-slate-600">
                      <div className="flex items-center gap-1">
                        <Building2 className="h-3 w-3 text-slate-400" />
                        <span className="truncate">
                          {getBuildingName(order.building_id)}
                          {order.unit_id && ` • Unit ${getUnitNumber(order.unit_id)}`}
                        </span>
                      </div>
                      {order.category && (
                        <div className="flex items-center gap-1">
                          <Badge variant="outline" className="h-4 px-1.5 text-[10px] capitalize">{order.category.replace(/_/g, ' ')}</Badge>
                        </div>
                      )}
                      {order.assigned_to && (
                        <div className="flex items-center gap-1">
                          <User className="h-3 w-3 text-slate-400" />
                          <span className="truncate">{order.assigned_to}</span>
                        </div>
                      )}
                      {order.due_date && (
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3 text-slate-400" />
                          <span>Due: {format(new Date(order.due_date), 'MMM d')}</span>
                        </div>
                      )}
                      {order.is_recurring && (
                        <div className="flex items-center gap-1">
                          <Repeat className="h-3 w-3 text-slate-400" />
                          <span className="capitalize">{order.recurrence_pattern}</span>
                        </div>
                      )}
                    </div>

                    <div className="mt-2 pt-2 border-t border-slate-100">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-full text-xs"
                        onClick={() => onViewDetails(order)}
                      >
                        <Eye className="h-3 w-3 mr-1" /> View Details
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
              
              {orders.length === 0 && (
                <div className="text-center py-8 text-slate-400 text-sm">
                  No work orders
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}