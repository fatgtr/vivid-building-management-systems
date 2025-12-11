import React from 'react';
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const statusStyles = {
  // Work Order statuses
  open: "bg-yellow-50 text-yellow-700 border-yellow-200",
  in_progress: "bg-blue-50 text-blue-700 border-blue-200",
  on_hold: "bg-orange-50 text-orange-700 border-orange-200",
  completed: "bg-emerald-50 text-emerald-700 border-emerald-200",
  cancelled: "bg-slate-50 text-slate-600 border-slate-200",
  
  // General statuses
  active: "bg-emerald-50 text-emerald-700 border-emerald-200",
  inactive: "bg-slate-50 text-slate-600 border-slate-200",
  pending: "bg-yellow-50 text-yellow-700 border-yellow-200",
  pending_approval: "bg-yellow-50 text-yellow-700 border-yellow-200",
  
  // Unit statuses
  occupied: "bg-emerald-50 text-emerald-700 border-emerald-200",
  vacant: "bg-blue-50 text-blue-700 border-blue-200",
  maintenance: "bg-orange-50 text-orange-700 border-orange-200",
  
  // Booking statuses
  approved: "bg-emerald-50 text-emerald-700 border-emerald-200",
  rejected: "bg-red-50 text-red-700 border-red-200",
  
  // Inspection statuses
  scheduled: "bg-blue-50 text-blue-700 border-blue-200",
  passed: "bg-emerald-50 text-emerald-700 border-emerald-200",
  failed: "bg-red-50 text-red-700 border-red-200",
  requires_followup: "bg-orange-50 text-orange-700 border-orange-200",
  
  // Priority
  low: "bg-slate-50 text-slate-600 border-slate-200",
  medium: "bg-blue-50 text-blue-700 border-blue-200",
  high: "bg-orange-50 text-orange-700 border-orange-200",
  urgent: "bg-red-50 text-red-700 border-red-200",
  
  // Announcement types
  general: "bg-slate-50 text-slate-600 border-slate-200",
  emergency: "bg-red-50 text-red-700 border-red-200",
  event: "bg-purple-50 text-purple-700 border-purple-200",
  policy: "bg-indigo-50 text-indigo-700 border-indigo-200",
  
  // Document status
  draft: "bg-yellow-50 text-yellow-700 border-yellow-200",
  published: "bg-emerald-50 text-emerald-700 border-emerald-200",
  archived: "bg-slate-50 text-slate-600 border-slate-200",
  
  // Amenity status
  available: "bg-emerald-50 text-emerald-700 border-emerald-200",
  closed: "bg-red-50 text-red-700 border-red-200",
};

export default function StatusBadge({ status, className }) {
  const formattedStatus = status?.replace(/_/g, ' ');
  
  return (
    <Badge 
      variant="outline" 
      className={cn(
        "font-medium capitalize border",
        statusStyles[status] || "bg-slate-50 text-slate-600 border-slate-200",
        className
      )}
    >
      {formattedStatus}
    </Badge>
  );
}