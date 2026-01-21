import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useBuildingContext } from '@/components/BuildingContext';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Search, Calendar as CalendarIcon, Clock, Users, DollarSign, MapPin } from 'lucide-react';
import AmenityBookingCalendar from './AmenityBookingCalendar';
import StatusBadge from '@/components/common/StatusBadge';
import StripeCheckoutButton from '@/components/payments/StripeCheckoutButton';
import { format } from 'date-fns';

const amenityTypeIcons = {
  gym: '🏋️',
  pool: '🏊',
  meeting_room: '📋',
  party_room: '🎉',
  rooftop: '🌇',
  bbq_area: '🍖',
  tennis_court: '🎾',
  parking: '🅿️',
  storage: '📦',
  other: '✨'
};

export default function ResidentAmenityList() {
  const { selectedBuildingId } = useBuildingContext();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAmenity, setSelectedAmenity] = useState(null);
  const [showBookingCalendar, setShowBookingCalendar] = useState(false);

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: amenities = [], isLoading } = useQuery({
    queryKey: ['amenities', selectedBuildingId],
    queryFn: async () => {
      const allAmenities = await base44.entities.Amenity.list();
      return selectedBuildingId 
        ? allAmenities.filter(a => a.building_id === selectedBuildingId)
        : allAmenities;
    },
  });

  const { data: myBookings = [] } = useQuery({
    queryKey: ['myAmenityBookings', user?.email],
    queryFn: async () => {
      if (!user?.email) return [];
      const resident = await base44.entities.Resident.filter({ email: user.email });
      if (!resident[0]) return [];
      return await base44.entities.AmenityBooking.filter({ resident_id: resident[0].id });
    },
    enabled: !!user?.email,
  });

  const filteredAmenities = amenities.filter(a => 
    a.name?.toLowerCase().includes(searchQuery.toLowerCase()) &&
    a.requires_booking
  );

  const handleBookNow = (amenity) => {
    setSelectedAmenity(amenity);
    setShowBookingCalendar(true);
  };

  const upcomingBookings = myBookings
    .filter(b => b.status !== 'cancelled' && b.status !== 'rejected')
    .filter(b => new Date(b.booking_date) >= new Date())
    .sort((a, b) => new Date(a.booking_date) - new Date(b.booking_date));

  const pastBookings = myBookings
    .filter(b => new Date(b.booking_date) < new Date())
    .sort((a, b) => new Date(b.booking_date) - new Date(a.booking_date));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Building Amenities</h2>
          <p className="text-sm text-slate-600 mt-1">
            {filteredAmenities.length} amenities available for booking
          </p>
        </div>
      </div>

      <Tabs defaultValue="browse" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="browse">Browse Amenities</TabsTrigger>
          <TabsTrigger value="mybookings">
            My Bookings ({upcomingBookings.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="browse" className="space-y-4">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search amenities..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          {filteredAmenities.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <CalendarIcon className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-500">No amenities available for booking</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredAmenities.map((amenity) => (
                <Card key={amenity.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                  <div className="h-32 bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center relative">
                    <span className="text-5xl">
                      {amenityTypeIcons[amenity.amenity_type] || '✨'}
                    </span>
                    <div className="absolute top-3 right-3">
                      <StatusBadge status={amenity.status} />
                    </div>
                  </div>
                  
                  <CardContent className="p-5">
                    <h3 className="font-semibold text-lg text-slate-900 mb-3">{amenity.name}</h3>
                    
                    <div className="space-y-2 text-sm mb-4">
                      {amenity.location && (
                        <div className="flex items-center gap-2 text-slate-600">
                          <MapPin className="h-4 w-4 text-slate-400" />
                          <span>{amenity.location}</span>
                        </div>
                      )}
                      {amenity.capacity && (
                        <div className="flex items-center gap-2 text-slate-600">
                          <Users className="h-4 w-4 text-slate-400" />
                          <span>Capacity: {amenity.capacity}</span>
                        </div>
                      )}
                      {(amenity.available_from || amenity.available_to) && (
                        <div className="flex items-center gap-2 text-slate-600">
                          <Clock className="h-4 w-4 text-slate-400" />
                          <span>{amenity.available_from} - {amenity.available_to}</span>
                        </div>
                      )}
                      {amenity.booking_fee > 0 && (
                        <div className="flex items-center gap-2 text-slate-600">
                          <DollarSign className="h-4 w-4 text-slate-400" />
                          <span className="font-semibold text-blue-600">${amenity.booking_fee}</span>
                        </div>
                      )}
                    </div>

                    <Button 
                      className="w-full bg-blue-600 hover:bg-blue-700"
                      onClick={() => handleBookNow(amenity)}
                      disabled={amenity.status !== 'available'}
                    >
                      <CalendarIcon className="h-4 w-4 mr-2" />
                      {amenity.status === 'available' ? 'Book Now' : 'Unavailable'}
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="mybookings" className="space-y-6">
          {/* Upcoming Bookings */}
          <div>
            <h3 className="text-lg font-semibold mb-4 text-slate-900">
              Upcoming Bookings ({upcomingBookings.length})
            </h3>
            {upcomingBookings.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <p className="text-slate-500">No upcoming bookings</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {upcomingBookings.map((booking) => {
                  const amenity = amenities.find(a => a.id === booking.amenity_id);
                  return (
                    <Card key={booking.id} className="border-l-4 border-l-blue-600">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h4 className="font-semibold text-slate-900">
                                {amenity?.name || 'Unknown Amenity'}
                              </h4>
                              <StatusBadge status={booking.status} />
                            </div>
                            <div className="space-y-1 text-sm text-slate-600">
                              <div className="flex items-center gap-2">
                                <CalendarIcon className="h-4 w-4 text-slate-400" />
                                <span>{format(new Date(booking.booking_date), 'EEEE, MMMM d, yyyy')}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Clock className="h-4 w-4 text-slate-400" />
                                <span>{booking.start_time} - {booking.end_time}</span>
                              </div>
                              {booking.guests > 0 && (
                                <div className="flex items-center gap-2">
                                  <Users className="h-4 w-4 text-slate-400" />
                                  <span>{booking.guests} guests</span>
                                </div>
                              )}
                              {booking.purpose && (
                                <p className="text-slate-500 mt-2">Purpose: {booking.purpose}</p>
                              )}
                            </div>
                          </div>
                          {amenity?.booking_fee > 0 && (
                            <div className="text-right">
                              <p className="text-sm text-slate-500">Fee</p>
                              <p className="text-lg font-bold text-blue-600">${amenity.booking_fee}</p>
                              {!booking.fee_paid && booking.status === 'approved' ? (
                                <div className="mt-2">
                                  <StripeCheckoutButton 
                                    bookingId={booking.id} 
                                    amount={amenity.booking_fee}
                                    label="Pay"
                                  />
                                </div>
                              ) : booking.fee_paid ? (
                                <Badge className="mt-1 bg-green-100 text-green-800">Paid</Badge>
                              ) : null}
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>

          {/* Past Bookings */}
          <div>
            <h3 className="text-lg font-semibold mb-4 text-slate-900">
              Past Bookings
            </h3>
            {pastBookings.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <p className="text-slate-500">No past bookings</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {pastBookings.slice(0, 5).map((booking) => {
                  const amenity = amenities.find(a => a.id === booking.amenity_id);
                  return (
                    <Card key={booking.id} className="opacity-75">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="font-semibold text-slate-700">
                                {amenity?.name || 'Unknown Amenity'}
                              </h4>
                              <StatusBadge status={booking.status} />
                            </div>
                            <div className="text-sm text-slate-600">
                              {format(new Date(booking.booking_date), 'MMM d, yyyy')} • {booking.start_time} - {booking.end_time}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Booking Calendar Dialog */}
      <Dialog open={showBookingCalendar} onOpenChange={setShowBookingCalendar}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          {selectedAmenity && (
            <AmenityBookingCalendar 
              amenity={selectedAmenity} 
              buildingId={selectedBuildingId || selectedAmenity.building_id}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}