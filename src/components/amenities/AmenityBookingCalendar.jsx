import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Calendar, Clock, Users, DollarSign, MapPin, CheckCircle2, AlertCircle, CreditCard } from 'lucide-react';
import { format, addDays, startOfWeek, isSameDay, parseISO } from 'date-fns';
import { toast } from 'sonner';

export default function AmenityBookingCalendar({ amenity, buildingId }) {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedTimeSlot, setSelectedTimeSlot] = useState(null);
  const [showBookingDialog, setShowBookingDialog] = useState(false);
  const [bookingForm, setBookingForm] = useState({
    guests: '',
    purpose: '',
    notes: '',
    payment_method: 'card'
  });

  const queryClient = useQueryClient();

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: resident } = useQuery({
    queryKey: ['currentResident', user?.email],
    queryFn: async () => {
      if (!user?.email) return null;
      const residents = await base44.entities.Resident.filter({ email: user.email });
      return residents[0] || null;
    },
    enabled: !!user?.email,
  });

  const { data: bookings = [] } = useQuery({
    queryKey: ['amenityBookings', amenity.id],
    queryFn: () => base44.entities.AmenityBooking.filter({ amenity_id: amenity.id }),
  });

  const createBookingMutation = useMutation({
    mutationFn: (data) => base44.entities.AmenityBooking.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['amenityBookings'] });
      setShowBookingDialog(false);
      setSelectedTimeSlot(null);
      setBookingForm({ guests: '', purpose: '', notes: '', payment_method: 'card' });
      toast.success('Booking request submitted successfully!');
    },
    onError: (error) => {
      toast.error('Failed to create booking. Please try again.');
    }
  });

  // Generate time slots based on amenity availability
  const timeSlots = useMemo(() => {
    if (!amenity.available_from || !amenity.available_to) return [];
    
    const slots = [];
    const [startHour, startMin] = amenity.available_from.split(':').map(Number);
    const [endHour, endMin] = amenity.available_to.split(':').map(Number);
    
    const duration = amenity.max_booking_hours || 1;
    let currentHour = startHour;
    let currentMin = startMin;
    
    while (currentHour < endHour || (currentHour === endHour && currentMin < endMin)) {
      const endSlotHour = currentHour + Math.floor(duration);
      const endSlotMin = currentMin;
      
      if (endSlotHour < endHour || (endSlotHour === endHour && endSlotMin <= endMin)) {
        slots.push({
          start: `${String(currentHour).padStart(2, '0')}:${String(currentMin).padStart(2, '0')}`,
          end: `${String(endSlotHour).padStart(2, '0')}:${String(endSlotMin).padStart(2, '0')}`
        });
      }
      
      currentHour += Math.floor(duration);
      currentMin += (duration % 1) * 60;
      if (currentMin >= 60) {
        currentHour++;
        currentMin -= 60;
      }
    }
    
    return slots;
  }, [amenity]);

  // Check if a time slot is available
  const isSlotAvailable = (date, slot) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return !bookings.some(booking => 
      booking.booking_date === dateStr &&
      booking.status !== 'cancelled' &&
      booking.status !== 'rejected' &&
      (
        (booking.start_time <= slot.start && booking.end_time > slot.start) ||
        (booking.start_time < slot.end && booking.end_time >= slot.end) ||
        (booking.start_time >= slot.start && booking.end_time <= slot.end)
      )
    );
  };

  const handleBookSlot = () => {
    if (!selectedTimeSlot) return;
    setShowBookingDialog(true);
  };

  const handleSubmitBooking = async (e) => {
    e.preventDefault();
    
    if (!resident) {
      toast.error('Resident information not found');
      return;
    }

    const bookingData = {
      amenity_id: amenity.id,
      building_id: buildingId,
      resident_id: resident.id,
      resident_name: user.full_name,
      unit_number: resident.unit_number,
      booking_date: format(selectedDate, 'yyyy-MM-dd'),
      start_time: selectedTimeSlot.start,
      end_time: selectedTimeSlot.end,
      guests: bookingForm.guests ? Number(bookingForm.guests) : 0,
      purpose: bookingForm.purpose,
      notes: bookingForm.notes,
      status: amenity.booking_fee > 0 ? 'pending' : 'approved',
      fee_paid: false
    };

    await createBookingMutation.mutateAsync(bookingData);
  };

  // Generate week days for calendar header
  const weekDays = useMemo(() => {
    const start = startOfWeek(selectedDate);
    return Array.from({ length: 7 }, (_, i) => addDays(start, i));
  }, [selectedDate]);

  const navigateWeek = (direction) => {
    setSelectedDate(prev => addDays(prev, direction * 7));
  };

  return (
    <div className="space-y-6">
      {/* Amenity Info Card */}
      <Card className="border-blue-200 bg-gradient-to-br from-blue-50 to-white">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="text-2xl">{amenity.name}</span>
            {amenity.status === 'available' ? (
              <Badge className="bg-green-100 text-green-800 border-green-200">
                <CheckCircle2 className="h-3 w-3 mr-1" />
                Available
              </Badge>
            ) : (
              <Badge variant="destructive">
                <AlertCircle className="h-3 w-3 mr-1" />
                {amenity.status}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {amenity.description && (
            <p className="text-slate-600">{amenity.description}</p>
          )}
          
          <div className="grid grid-cols-2 gap-4">
            {amenity.location && (
              <div className="flex items-center gap-2 text-sm">
                <MapPin className="h-4 w-4 text-slate-400" />
                <span>{amenity.location}</span>
              </div>
            )}
            {amenity.capacity && (
              <div className="flex items-center gap-2 text-sm">
                <Users className="h-4 w-4 text-slate-400" />
                <span>Capacity: {amenity.capacity}</span>
              </div>
            )}
            {(amenity.available_from || amenity.available_to) && (
              <div className="flex items-center gap-2 text-sm">
                <Clock className="h-4 w-4 text-slate-400" />
                <span>{amenity.available_from} - {amenity.available_to}</span>
              </div>
            )}
            {amenity.booking_fee > 0 && (
              <div className="flex items-center gap-2 text-sm">
                <DollarSign className="h-4 w-4 text-slate-400" />
                <span className="font-semibold text-blue-600">${amenity.booking_fee} per booking</span>
              </div>
            )}
          </div>

          {amenity.rules && (
            <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-100">
              <p className="text-xs font-semibold text-blue-900 mb-1">Rules & Guidelines</p>
              <p className="text-xs text-slate-600">{amenity.rules}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Calendar Navigation */}
      <div className="flex items-center justify-between">
        <Button variant="outline" onClick={() => navigateWeek(-1)}>← Previous Week</Button>
        <h3 className="font-semibold text-lg">
          {format(weekDays[0], 'MMM d')} - {format(weekDays[6], 'MMM d, yyyy')}
        </h3>
        <Button variant="outline" onClick={() => navigateWeek(1)}>Next Week →</Button>
      </div>

      {/* Week Calendar Grid */}
      <Card>
        <CardContent className="p-0">
          <div className="grid grid-cols-7 border-b">
            {weekDays.map((day, idx) => (
              <div
                key={idx}
                className={`p-3 text-center border-r last:border-r-0 ${
                  isSameDay(day, new Date()) ? 'bg-blue-50 font-semibold' : ''
                }`}
              >
                <div className="text-xs text-slate-500">{format(day, 'EEE')}</div>
                <div className="text-lg font-semibold">{format(day, 'd')}</div>
              </div>
            ))}
          </div>

          {/* Time Slots Grid */}
          <div className="grid grid-cols-7">
            {weekDays.map((day, dayIdx) => (
              <div key={dayIdx} className="border-r last:border-r-0">
                {timeSlots.map((slot, slotIdx) => {
                  const available = isSlotAvailable(day, slot);
                  const isSelected = selectedTimeSlot?.start === slot.start && 
                                   selectedTimeSlot?.end === slot.end && 
                                   isSameDay(selectedDate, day);
                  
                  return (
                    <button
                      key={slotIdx}
                      onClick={() => {
                        if (available && amenity.status === 'available') {
                          setSelectedDate(day);
                          setSelectedTimeSlot(slot);
                        }
                      }}
                      disabled={!available || amenity.status !== 'available'}
                      className={`w-full p-2 text-xs border-b transition-colors ${
                        isSelected
                          ? 'bg-blue-600 text-white font-semibold'
                          : available && amenity.status === 'available'
                          ? 'hover:bg-blue-50 cursor-pointer'
                          : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                      }`}
                    >
                      <div>{slot.start}</div>
                      <div className="text-[10px] opacity-75">{slot.end}</div>
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Selected Slot Info */}
      {selectedTimeSlot && (
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold text-slate-900">
                  Selected: {format(selectedDate, 'EEEE, MMMM d, yyyy')}
                </p>
                <p className="text-sm text-slate-600">
                  {selectedTimeSlot.start} - {selectedTimeSlot.end}
                </p>
              </div>
              <Button onClick={handleBookSlot} className="bg-blue-600 hover:bg-blue-700">
                Book This Slot
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Booking Dialog */}
      <Dialog open={showBookingDialog} onOpenChange={setShowBookingDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Complete Your Booking</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmitBooking} className="space-y-4">
            <div className="p-3 bg-slate-50 rounded-lg">
              <p className="text-sm font-semibold text-slate-900">{amenity.name}</p>
              <p className="text-xs text-slate-600">
                {format(selectedDate, 'EEEE, MMMM d, yyyy')} • {selectedTimeSlot?.start} - {selectedTimeSlot?.end}
              </p>
            </div>

            <div>
              <Label htmlFor="guests">Number of Guests</Label>
              <Input
                id="guests"
                type="number"
                min="0"
                max={amenity.capacity}
                value={bookingForm.guests}
                onChange={(e) => setBookingForm({ ...bookingForm, guests: e.target.value })}
                placeholder="Optional"
              />
              {amenity.capacity && (
                <p className="text-xs text-slate-500 mt-1">Maximum capacity: {amenity.capacity}</p>
              )}
            </div>

            <div>
              <Label htmlFor="purpose">Purpose of Booking</Label>
              <Input
                id="purpose"
                value={bookingForm.purpose}
                onChange={(e) => setBookingForm({ ...bookingForm, purpose: e.target.value })}
                placeholder="e.g., Birthday party, Team meeting"
              />
            </div>

            <div>
              <Label htmlFor="notes">Additional Notes</Label>
              <Textarea
                id="notes"
                value={bookingForm.notes}
                onChange={(e) => setBookingForm({ ...bookingForm, notes: e.target.value })}
                placeholder="Any special requests or information"
                rows={3}
              />
            </div>

            {amenity.booking_fee > 0 && (
              <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                <div className="flex items-center justify-between mb-3">
                  <span className="font-semibold text-slate-900">Booking Fee</span>
                  <span className="text-lg font-bold text-blue-600">${amenity.booking_fee}</span>
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="payment_method"
                      value="card"
                      checked={bookingForm.payment_method === 'card'}
                      onChange={(e) => setBookingForm({ ...bookingForm, payment_method: e.target.value })}
                      className="text-blue-600"
                    />
                    <CreditCard className="h-4 w-4 text-slate-400" />
                    <span className="text-sm">Credit/Debit Card</span>
                  </Label>
                  <Label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="payment_method"
                      value="bank_transfer"
                      checked={bookingForm.payment_method === 'bank_transfer'}
                      onChange={(e) => setBookingForm({ ...bookingForm, payment_method: e.target.value })}
                      className="text-blue-600"
                    />
                    <DollarSign className="h-4 w-4 text-slate-400" />
                    <span className="text-sm">Bank Transfer</span>
                  </Label>
                </div>
                <p className="text-xs text-slate-500 mt-3">
                  Payment will be processed after booking approval
                </p>
              </div>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowBookingDialog(false)}>
                Cancel
              </Button>
              <Button 
                type="submit" 
                className="bg-blue-600 hover:bg-blue-700"
                disabled={createBookingMutation.isPending}
              >
                {createBookingMutation.isPending ? 'Processing...' : 'Confirm Booking'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}