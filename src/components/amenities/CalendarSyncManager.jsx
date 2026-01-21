import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useBuildingContext } from '@/components/BuildingContext';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, Check, Loader2, RefreshCw, AlertCircle } from 'lucide-react';
import OutlookCalendarSync from './OutlookCalendarSync';
import { toast } from 'sonner';

export default function CalendarSyncManager() {
  const { selectedBuildingId } = useBuildingContext();
  const [syncing, setSyncing] = useState(false);
  const queryClient = useQueryClient();

  const { data: bookings = [], isLoading } = useQuery({
    queryKey: ['amenity-bookings', selectedBuildingId],
    queryFn: () => base44.entities.AmenityBooking.filter({ 
      building_id: selectedBuildingId,
      status: 'approved'
    }),
    enabled: !!selectedBuildingId,
  });

  const syncToCalendar = async (bookingId) => {
    try {
      const response = await base44.functions.invoke('syncToGoogleCalendar', { bookingId });
      if (response.data.success) {
        toast.success('Synced to Google Calendar');
        queryClient.invalidateQueries({ queryKey: ['amenity-bookings'] });
      }
    } catch (error) {
      console.error('Calendar sync failed:', error);
      toast.error('Failed to sync to calendar');
    }
  };

  const syncAllBookings = async () => {
    setSyncing(true);
    const unsyncedBookings = bookings.filter(b => !b.calendar_event_id);
    let successCount = 0;
    let failCount = 0;

    for (const booking of unsyncedBookings) {
      try {
        await syncToCalendar(booking.id);
        successCount++;
      } catch (error) {
        failCount++;
      }
    }

    setSyncing(false);
    toast.success(`Synced ${successCount} bookings to calendar${failCount > 0 ? `, ${failCount} failed` : ''}`);
  };

  const syncedCount = bookings.filter(b => b.calendar_event_id).length;
  const unsyncedCount = bookings.length - syncedCount;

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <OutlookCalendarSync />
      
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Calendar Sync Manager
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center p-4 bg-slate-50 rounded-lg">
            <div className="text-2xl font-bold text-slate-900">{bookings.length}</div>
            <div className="text-sm text-slate-500">Total Bookings</div>
          </div>
          <div className="text-center p-4 bg-green-50 rounded-lg">
            <div className="text-2xl font-bold text-green-600">{syncedCount}</div>
            <div className="text-sm text-slate-500">Synced</div>
          </div>
          <div className="text-center p-4 bg-orange-50 rounded-lg">
            <div className="text-2xl font-bold text-orange-600">{unsyncedCount}</div>
            <div className="text-sm text-slate-500">Pending</div>
          </div>
        </div>

        {unsyncedCount > 0 && (
          <Button 
            onClick={syncAllBookings}
            disabled={syncing}
            className="w-full bg-blue-600 hover:bg-blue-700"
          >
            {syncing ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Syncing {unsyncedCount} bookings...
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4 mr-2" />
                Sync All Unsynced Bookings
              </>
            )}
          </Button>
        )}

        <div className="space-y-2 max-h-96 overflow-y-auto">
          {bookings.map(booking => (
            <div 
              key={booking.id}
              className="flex items-center justify-between p-3 border border-slate-200 rounded-lg hover:bg-slate-50"
            >
              <div className="flex-1">
                <div className="font-medium text-slate-900">{booking.resident_name}</div>
                <div className="text-sm text-slate-500">
                  {booking.booking_date} • {booking.start_time} - {booking.end_time}
                </div>
              </div>
              {booking.calendar_event_id ? (
                <Badge className="bg-green-100 text-green-800">
                  <Check className="h-3 w-3 mr-1" />
                  Synced
                </Badge>
              ) : (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => syncToCalendar(booking.id)}
                >
                  <Calendar className="h-3 w-3 mr-1" />
                  Sync
                </Button>
              )}
            </div>
          ))}
        </div>

        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-start gap-2">
          <AlertCircle className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
          <div className="text-sm text-blue-900">
            <strong>Note:</strong> Bookings are automatically synced to your connected Google Calendar. 
            Staff can view all amenity bookings in their calendar app.
          </div>
        </div>
      </CardContent>
    </Card>
    </div>
  );
}