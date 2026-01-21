import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, Clock, Users, DollarSign, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function AmenityBookingForm({ buildingId, onSuccess }) {
  const [formData, setFormData] = useState({
    amenity_id: '',
    booking_date: '',
    start_time: '',
    end_time: '',
    guests: 1,
    purpose: ''
  });

  const queryClient = useQueryClient();

  const { data: amenities = [] } = useQuery({
    queryKey: ['amenities', buildingId],
    queryFn: () => base44.entities.Amenity.filter({ building_id: buildingId }),
    enabled: !!buildingId
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const user = await base44.auth.me();
      const residents = await base44.entities.Resident.filter({ email: user.email });
      const resident = residents[0];

      return base44.entities.AmenityBooking.create({
        building_id: buildingId,
        amenity_id: formData.amenity_id,
        resident_id: resident?.id,
        resident_name: user.full_name,
        resident_email: user.email,
        unit_number: resident?.unit_number,
        booking_date: formData.booking_date,
        start_time: formData.start_time,
        end_time: formData.end_time,
        guests: formData.guests,
        purpose: formData.purpose,
        status: 'pending'
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['amenityBookings'] });
      toast.success('Booking request submitted');
      setFormData({
        amenity_id: '',
        booking_date: '',
        start_time: '',
        end_time: '',
        guests: 1,
        purpose: ''
      });
      if (onSuccess) onSuccess();
    }
  });

  const selectedAmenity = amenities.find(a => a.id === formData.amenity_id);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Book Amenity</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={(e) => { e.preventDefault(); createMutation.mutate(); }} className="space-y-4">
          <div>
            <Label>Amenity *</Label>
            <Select value={formData.amenity_id} onValueChange={(v) => setFormData({ ...formData, amenity_id: v })}>
              <SelectTrigger className="mt-1.5">
                <SelectValue placeholder="Select amenity" />
              </SelectTrigger>
              <SelectContent>
                {amenities.filter(a => a.status === 'available').map(amenity => (
                  <SelectItem key={amenity.id} value={amenity.id}>
                    {amenity.name}
                    {amenity.booking_fee && ` ($${amenity.booking_fee})`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label>Date *</Label>
              <Input
                type="date"
                value={formData.booking_date}
                onChange={(e) => setFormData({ ...formData, booking_date: e.target.value })}
                required
                className="mt-1.5"
              />
            </div>

            <div>
              <Label>Start Time *</Label>
              <Input
                type="time"
                value={formData.start_time}
                onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                required
                className="mt-1.5"
              />
            </div>

            <div>
              <Label>End Time *</Label>
              <Input
                type="time"
                value={formData.end_time}
                onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                required
                className="mt-1.5"
              />
            </div>
          </div>

          <div>
            <Label>Number of Guests</Label>
            <Input
              type="number"
              min="1"
              value={formData.guests}
              onChange={(e) => setFormData({ ...formData, guests: parseInt(e.target.value) })}
              className="mt-1.5"
            />
          </div>

          <div>
            <Label>Purpose</Label>
            <Textarea
              value={formData.purpose}
              onChange={(e) => setFormData({ ...formData, purpose: e.target.value })}
              placeholder="Describe the purpose of your booking"
              className="mt-1.5"
              rows={3}
            />
          </div>

          {selectedAmenity?.booking_fee && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center gap-2 text-sm text-blue-700">
                <DollarSign className="h-4 w-4" />
                <span>Booking Fee: ${selectedAmenity.booking_fee}</span>
              </div>
            </div>
          )}

          <Button 
            type="submit" 
            className="w-full bg-blue-600 hover:bg-blue-700"
            disabled={createMutation.isPending}
          >
            {createMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Submitting...
              </>
            ) : (
              'Submit Booking Request'
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}