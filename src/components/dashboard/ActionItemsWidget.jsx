import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertCircle, Wrench, FileText, Calendar, ShoppingBag, CheckCircle2, TrendingUp } from 'lucide-react';

export default function ActionItemsWidget({ workOrders, documents, amenityBookings, marketplaceItems }) {
  const urgentWorkOrders = workOrders.filter(wo => wo.status === 'open' && wo.priority === 'urgent').length;
  const expiredDocs = documents.filter(d => d.expiry_date && new Date(d.expiry_date) < new Date()).length;
  const pendingBookings = (amenityBookings || []).filter(b => b.status === 'pending').length;
  const pendingMarketplace = (marketplaceItems || []).filter(m => m.status === 'active' && m.requires_approval).length;

  const items = [
    urgentWorkOrders > 0 && {
      icon: Wrench, label: 'Urgent Work Orders', count: urgentWorkOrders,
      color: 'text-orange-600', bg: 'bg-orange-50', page: 'WorkOrders'
    },
    expiredDocs > 0 && {
      icon: FileText, label: 'Expired Documents', count: expiredDocs,
      color: 'text-red-600', bg: 'bg-red-50', page: 'Documents'
    },
    pendingBookings > 0 && {
      icon: Calendar, label: 'Pending Amenity Bookings', count: pendingBookings,
      color: 'text-blue-600', bg: 'bg-blue-50', page: 'Amenities'
    },
    pendingMarketplace > 0 && {
      icon: ShoppingBag, label: 'Marketplace Approvals', count: pendingMarketplace,
      color: 'text-purple-600', bg: 'bg-purple-50', page: 'Marketplace'
    },
  ].filter(Boolean);

  return (
    <Card className="overflow-hidden border-2 border-red-200 shadow-xl hover:shadow-2xl transition-all duration-300 hover:border-red-400">
      <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-red-500/20 to-transparent rounded-bl-full" />
      <CardHeader className="pb-3 bg-gradient-to-r from-red-50 to-orange-50">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-red-500 to-orange-600 flex items-center justify-center shadow-lg shadow-red-500/30 animate-pulse">
            <AlertCircle className="h-5 w-5 text-white" />
          </div>
          <CardTitle className="text-base font-bold text-slate-900">Items Requiring Action</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-2 pt-3">
        {items.length === 0 ? (
          <div className="text-center py-8">
            <div className="inline-flex items-center justify-center w-12 h-12 bg-green-100 rounded-full mb-2">
              <CheckCircle2 className="h-6 w-6 text-green-600" />
            </div>
            <p className="text-sm font-medium text-slate-700">All clear!</p>
            <p className="text-xs text-slate-500 mt-1">No items requiring action</p>
          </div>
        ) : (
          items.map(({ icon: Icon, label, count, color, bg, page }) => (
            <Link key={label} to={createPageUrl(page)}>
              <div className="flex items-center justify-between p-3 rounded-lg bg-white shadow-sm hover:shadow-md transition-shadow cursor-pointer">
                <div className="flex items-center gap-2">
                  <div className={`p-1.5 ${bg} rounded-lg`}>
                    <Icon className={`h-4 w-4 ${color}`} />
                  </div>
                  <span className="text-sm font-medium text-slate-700">{label}</span>
                </div>
                <Badge className={`${color} bg-transparent border border-current`}>{count}</Badge>
              </div>
            </Link>
          ))
        )}
      </CardContent>
    </Card>
  );
}