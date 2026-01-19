import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useBuildingContext } from '@/components/BuildingContext';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Truck, Plus, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import PageHeader from '@/components/common/PageHeader';

export default function MoveCoordinator() {
  const { selectedBuildingId } = useBuildingContext();
  const [showDialog, setShowDialog] = useState(false);
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    building_id: selectedBuildingId || '',
    unit_id: '',
    resident_name: '',
    resident_phone: '',
    resident_email: '',
    move_type: 'move_in',
    move_date: '',
    start_time: '09:00',
    end_time: '17:00',
    lift_reserved: true,
    parking_spots_needed: 1
  });

  const { data: bookings = [] } = useQuery({
    queryKey: ['moveBookings', selectedBuildingId],
    queryFn: async () => {
      const all = await base44.entities.MoveBooking.list('-move_date');
      return selectedBuildingId ? all.filter(b => b.building_id === selectedBuildingId) : all;
    }
  });

  const { data: units = [] } = useQuery({
    queryKey: ['units'],
    queryFn: () => base44.entities.Unit.list()
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.MoveBooking.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['moveBookings'] });
      setShowDialog(false);
      toast.success('Move booking created');
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.MoveBooking.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['moveBookings'] });
      toast.success('Booking updated');
    }
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Move Coordinator"
        subtitle="Manage move-in and move-out bookings"
        action={() => setShowDialog(true)}
        actionLabel="Book Move"
      />

      <Card>
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50">
              <TableHead>Resident</TableHead>
              <TableHead>Unit</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Date & Time</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {bookings.map((booking) => {
              const unit = units.find(u => u.id === booking.unit_id);
              return (
                <TableRow key={booking.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{booking.resident_name}</p>
                      <p className="text-xs text-slate-500">{booking.resident_phone}</p>
                    </div>
                  </TableCell>
                  <TableCell>Unit {unit?.unit_number}</TableCell>
                  <TableCell>
                    <Badge className={booking.move_type === 'move_in' ? 'bg-green-600' : 'bg-orange-600'}>
                      {booking.move_type?.replace(/_/g, ' ')}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium">{format(new Date(booking.move_date), 'MMM d, yyyy')}</p>
                      <p className="text-xs text-slate-500">{booking.start_time} - {booking.end_time}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className={
                      booking.status === 'approved' ? 'bg-green-600' :
                      booking.status === 'completed' ? 'bg-slate-600' : 'bg-orange-600'
                    }>
                      {booking.status?.replace(/_/g, ' ')}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {booking.status === 'pending_approval' && (
                      <Button
                        size="sm"
                        onClick={() => updateMutation.mutate({
                          id: booking.id,
                          data: { ...booking, status: 'approved' }
                        })}
                      >
                        Approve
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Card>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Book Move</DialogTitle>
          </DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); createMutation.mutate(formData); }} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Resident Name *</Label>
                <Input
                  value={formData.resident_name}
                  onChange={(e) => setFormData({ ...formData, resident_name: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label>Unit *</Label>
                <Select value={formData.unit_id} onValueChange={(v) => setFormData({ ...formData, unit_id: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select unit" />
                  </SelectTrigger>
                  <SelectContent>
                    {units.filter(u => u.building_id === selectedBuildingId).map(u => (
                      <SelectItem key={u.id} value={u.id}>Unit {u.unit_number}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Phone *</Label>
                <Input
                  value={formData.resident_phone}
                  onChange={(e) => setFormData({ ...formData, resident_phone: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label>Email</Label>
                <Input
                  type="email"
                  value={formData.resident_email}
                  onChange={(e) => setFormData({ ...formData, resident_email: e.target.value })}
                />
              </div>
              <div>
                <Label>Move Type *</Label>
                <Select value={formData.move_type} onValueChange={(v) => setFormData({ ...formData, move_type: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="move_in">Move In</SelectItem>
                    <SelectItem value="move_out">Move Out</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Move Date *</Label>
                <Input
                  type="date"
                  value={formData.move_date}
                  onChange={(e) => setFormData({ ...formData, move_date: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label>Start Time *</Label>
                <Input
                  type="time"
                  value={formData.start_time}
                  onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label>End Time *</Label>
                <Input
                  type="time"
                  value={formData.end_time}
                  onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                  required
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? 'Booking...' : 'Create Booking'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}