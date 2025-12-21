import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useBuildingContext } from '@/components/BuildingContext';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import EmptyState from '@/components/common/EmptyState';
import StatusBadge from '@/components/common/StatusBadge';
import { Calendar, Search, Building2, MoreVertical, Pencil, Trash2, Users, Clock, DollarSign, MapPin, Plus } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { format } from 'date-fns';

const amenityTypes = [
  { value: 'gym', label: 'Gym', icon: '🏋️' },
  { value: 'pool', label: 'Pool', icon: '🏊' },
  { value: 'meeting_room', label: 'Meeting Room', icon: '📋' },
  { value: 'party_room', label: 'Party Room', icon: '🎉' },
  { value: 'rooftop', label: 'Rooftop', icon: '🌇' },
  { value: 'bbq_area', label: 'BBQ Area', icon: '🍖' },
  { value: 'tennis_court', label: 'Tennis Court', icon: '🎾' },
  { value: 'parking', label: 'Parking', icon: '🅿️' },
  { value: 'storage', label: 'Storage', icon: '📦' },
  { value: 'move_in_lift', label: 'Move-in Lift', icon: '⬆️' },
  { value: 'move_out_lift', label: 'Move-out Lift', icon: '⬇️' },
  { value: 'loading_dock', label: 'Loading Dock', icon: '🚚' },
  { value: 'other', label: 'Other', icon: '✨' },
];

const initialFormState = {
  building_id: '',
  name: '',
  description: '',
  location: '',
  capacity: '',
  amenity_type: 'other',
  requires_booking: true,
  booking_fee: '',
  max_booking_hours: '',
  available_from: '',
  available_to: '',
  rules: '',
  status: 'available',
};

const initialBookingForm = {
  amenity_id: '',
  building_id: '',
  resident_id: '',
  resident_name: '',
  unit_number: '',
  booking_date: '',
  start_time: '',
  end_time: '',
  guests: '',
  purpose: '',
  status: 'pending',
};

export default function AmenitiesTab() {
  const { selectedBuildingId } = useBuildingContext();
  const [showDialog, setShowDialog] = useState(false);
  const [showBookingDialog, setShowBookingDialog] = useState(false);
  const [editingAmenity, setEditingAmenity] = useState(null);
  const [formData, setFormData] = useState(initialFormState);
  const [bookingForm, setBookingForm] = useState(initialBookingForm);
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteAmenity, setDeleteAmenity] = useState(null);
  const [activeTab, setActiveTab] = useState('amenities');

  const queryClient = useQueryClient();

  const { data: amenities = [], isLoading } = useQuery({
    queryKey: ['amenities'],
    queryFn: () => base44.entities.Amenity.list(),
  });

  const { data: buildings = [] } = useQuery({
    queryKey: ['buildings'],
    queryFn: () => base44.entities.Building.list(),
  });

  const { data: bookings = [] } = useQuery({
    queryKey: ['amenityBookings'],
    queryFn: () => base44.entities.AmenityBooking.list('-booking_date'),
  });

  const { data: residents = [] } = useQuery({
    queryKey: ['residents'],
    queryFn: () => base44.entities.Resident.list(),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Amenity.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['amenities'] });
      handleCloseDialog();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Amenity.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['amenities'] });
      handleCloseDialog();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Amenity.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['amenities'] });
      setDeleteAmenity(null);
    },
  });

  const createBookingMutation = useMutation({
    mutationFn: (data) => base44.entities.AmenityBooking.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['amenityBookings'] });
      setShowBookingDialog(false);
      setBookingForm(initialBookingForm);
    },
  });

  const updateBookingMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.AmenityBooking.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['amenityBookings'] });
    },
  });

  const handleCloseDialog = () => {
    setShowDialog(false);
    setEditingAmenity(null);
    setFormData(initialFormState);
  };

  const handleEdit = (amenity) => {
    setEditingAmenity(amenity);
    setFormData({
      building_id: amenity.building_id || '',
      name: amenity.name || '',
      description: amenity.description || '',
      location: amenity.location || '',
      capacity: amenity.capacity || '',
      amenity_type: amenity.amenity_type || 'other',
      requires_booking: amenity.requires_booking ?? true,
      booking_fee: amenity.booking_fee || '',
      max_booking_hours: amenity.max_booking_hours || '',
      available_from: amenity.available_from || '',
      available_to: amenity.available_to || '',
      rules: amenity.rules || '',
      status: amenity.status || 'available',
    });
    setShowDialog(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const data = {
      ...formData,
      capacity: formData.capacity ? Number(formData.capacity) : null,
      booking_fee: formData.booking_fee ? Number(formData.booking_fee) : null,
      max_booking_hours: formData.max_booking_hours ? Number(formData.max_booking_hours) : null,
    };

    if (editingAmenity) {
      updateMutation.mutate({ id: editingAmenity.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleBookingSubmit = async (e) => {
    e.preventDefault();
    const data = {
      ...bookingForm,
      guests: bookingForm.guests ? Number(bookingForm.guests) : null,
    };
    
    try {
      await createBookingMutation.mutateAsync(data);

      const amenity = amenities.find(a => a.id === data.amenity_id);
      const resident = residents.find(r => r.id === data.resident_id);

      if (resident && amenity && ['move_in_lift', 'move_out_lift', 'loading_dock'].includes(amenity.amenity_type)) {
        await base44.functions.invoke('sendBylawsOnBooking', {
          residentEmail: resident.email,
          documentType: amenity.name,
          buildingId: amenity.building_id
        });
      }
    } catch (error) {
      console.error('Booking error:', error);
    }
  };

  const handleBookingStatusChange = (booking, newStatus) => {
    updateBookingMutation.mutate({ id: booking.id, data: { ...booking, status: newStatus } });
  };

  const getBuildingName = (buildingId) => buildings.find(b => b.id === buildingId)?.name || 'Unknown';
  const getAmenityName = (amenityId) => amenities.find(a => a.id === amenityId)?.name || 'Unknown';
  const getAmenityIcon = (type) => amenityTypes.find(t => t.value === type)?.icon || '✨';

  const filteredAmenities = amenities.filter(a => {
    const matchesSearch = a.name?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesBuilding = !selectedBuildingId || a.building_id === selectedBuildingId;
    return matchesSearch && matchesBuilding;
  });

  if (isLoading) {
    return <Skeleton className="h-96 rounded-xl" />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-600">
          {amenities.length} amenities, <span className="font-semibold text-orange-600">{bookings.filter(b => b.status === 'pending').length}</span> pending bookings
        </p>
        <Button onClick={() => setShowDialog(true)} className="bg-blue-600 hover:bg-blue-700">
          <Plus className="h-4 w-4 mr-2" />
          Add Amenity
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="amenities">Amenities</TabsTrigger>
          <TabsTrigger value="bookings">Bookings ({bookings.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="amenities" className="space-y-4 mt-4">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search amenities..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          {filteredAmenities.length === 0 ? (
            <EmptyState
              icon={Calendar}
              title="No amenities found"
              description="Add amenities to your buildings for residents to book"
              action={() => setShowDialog(true)}
              actionLabel="Add Amenity"
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredAmenities.map((amenity) => (
                <Card key={amenity.id} className="border-0 shadow-sm hover:shadow-md transition-shadow overflow-hidden">
                  <div className="h-32 bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center relative">
                    <span className="text-5xl">{getAmenityIcon(amenity.amenity_type)}</span>
                    <div className="absolute top-3 right-3">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="secondary" size="icon" className="h-8 w-8 bg-white/90 hover:bg-white">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEdit(amenity)}>
                            <Pencil className="mr-2 h-4 w-4" /> Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setDeleteAmenity(amenity)} className="text-red-600">
                            <Trash2 className="mr-2 h-4 w-4" /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    <div className="absolute bottom-3 left-3">
                      <StatusBadge status={amenity.status} />
                    </div>
                  </div>
                  <CardContent className="p-5">
                    <h3 className="font-semibold text-lg text-slate-900 mb-1">{amenity.name}</h3>
                    <p className="text-sm text-slate-500 mb-3">{getBuildingName(amenity.building_id)}</p>
                    
                    <div className="space-y-2 text-sm">
                      {amenity.capacity && (
                        <div className="flex items-center gap-2 text-slate-600">
                          <Users className="h-4 w-4 text-slate-400" />
                          <span>Capacity: {amenity.capacity}</span>
                        </div>
                      )}
                      {amenity.location && (
                        <div className="flex items-center gap-2 text-slate-600">
                          <MapPin className="h-4 w-4 text-slate-400" />
                          <span>{amenity.location}</span>
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
                          <span>${amenity.booking_fee} per booking</span>
                        </div>
                      )}
                    </div>

                    {amenity.requires_booking && (
                      <Button 
                        className="w-full mt-4 bg-blue-600 hover:bg-blue-700"
                        onClick={() => {
                          setBookingForm({ ...initialBookingForm, amenity_id: amenity.id, building_id: amenity.building_id });
                          setShowBookingDialog(true);
                        }}
                      >
                        Book Now
                      </Button>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="bookings" className="mt-4">
          <Card className="border-0 shadow-sm overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50">
                  <TableHead>Amenity</TableHead>
                  <TableHead>Resident</TableHead>
                  <TableHead>Date & Time</TableHead>
                  <TableHead>Guests</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-24">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {bookings.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-slate-500">
                      No bookings yet
                    </TableCell>
                  </TableRow>
                ) : (
                  bookings.filter(b => !selectedBuildingId || b.building_id === selectedBuildingId).map((booking) => (
                    <TableRow key={booking.id}>
                      <TableCell>
                        <span className="font-medium">{getAmenityName(booking.amenity_id)}</span>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium text-slate-900">{booking.resident_name}</p>
                          {booking.unit_number && <p className="text-xs text-slate-500">Unit {booking.unit_number}</p>}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{booking.booking_date && format(new Date(booking.booking_date), 'MMM d, yyyy')}</p>
                          <p className="text-xs text-slate-500">{booking.start_time} - {booking.end_time}</p>
                        </div>
                      </TableCell>
                      <TableCell>{booking.guests || '-'}</TableCell>
                      <TableCell>
                        <StatusBadge status={booking.status} />
                      </TableCell>
                      <TableCell>
                        {booking.status === 'pending' && (
                          <div className="flex gap-1">
                            <Button size="sm" variant="outline" className="h-7 text-xs text-emerald-600 border-emerald-200 hover:bg-emerald-50"
                              onClick={() => handleBookingStatusChange(booking, 'approved')}>
                              Approve
                            </Button>
                            <Button size="sm" variant="outline" className="h-7 text-xs text-red-600 border-red-200 hover:bg-red-50"
                              onClick={() => handleBookingStatusChange(booking, 'rejected')}>
                              Reject
                            </Button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Add/Edit Amenity Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingAmenity ? 'Edit Amenity' : 'Add New Amenity'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <Label htmlFor="building_id">Building *</Label>
                <Select value={formData.building_id} onValueChange={(v) => setFormData({ ...formData, building_id: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select building" />
                  </SelectTrigger>
                  <SelectContent>
                    {buildings.map(b => (
                      <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="name">Amenity Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="amenity_type">Type *</Label>
                <Select value={formData.amenity_type} onValueChange={(v) => setFormData({ ...formData, amenity_type: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {amenityTypes.map(t => (
                      <SelectItem key={t.value} value={t.value}>{t.icon} {t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="location">Location</Label>
                <Input
                  id="location"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  placeholder="e.g., Ground floor, Level 10"
                />
              </div>
              <div>
                <Label htmlFor="capacity">Capacity</Label>
                <Input
                  id="capacity"
                  type="number"
                  value={formData.capacity}
                  onChange={(e) => setFormData({ ...formData, capacity: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="available_from">Available From</Label>
                <Input
                  id="available_from"
                  value={formData.available_from}
                  onChange={(e) => setFormData({ ...formData, available_from: e.target.value })}
                  placeholder="e.g., 06:00"
                />
              </div>
              <div>
                <Label htmlFor="available_to">Available Until</Label>
                <Input
                  id="available_to"
                  value={formData.available_to}
                  onChange={(e) => setFormData({ ...formData, available_to: e.target.value })}
                  placeholder="e.g., 22:00"
                />
              </div>
              <div>
                <Label htmlFor="booking_fee">Booking Fee ($)</Label>
                <Input
                  id="booking_fee"
                  type="number"
                  value={formData.booking_fee}
                  onChange={(e) => setFormData({ ...formData, booking_fee: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="max_booking_hours">Max Booking Hours</Label>
                <Input
                  id="max_booking_hours"
                  type="number"
                  value={formData.max_booking_hours}
                  onChange={(e) => setFormData({ ...formData, max_booking_hours: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="status">Status</Label>
                <Select value={formData.status} onValueChange={(v) => setFormData({ ...formData, status: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="available">Available</SelectItem>
                    <SelectItem value="maintenance">Maintenance</SelectItem>
                    <SelectItem value="closed">Closed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-3">
                <Switch
                  id="requires_booking"
                  checked={formData.requires_booking}
                  onCheckedChange={(v) => setFormData({ ...formData, requires_booking: v })}
                />
                <Label htmlFor="requires_booking">Requires Booking</Label>
              </div>
              <div className="md:col-span-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={2}
                />
              </div>
              <div className="md:col-span-2">
                <Label htmlFor="rules">Rules</Label>
                <Textarea
                  id="rules"
                  value={formData.rules}
                  onChange={(e) => setFormData({ ...formData, rules: e.target.value })}
                  rows={2}
                  placeholder="Usage rules and guidelines"
                />
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleCloseDialog}>Cancel</Button>
              <Button type="submit" className="bg-blue-600 hover:bg-blue-700" disabled={createMutation.isPending || updateMutation.isPending}>
                {createMutation.isPending || updateMutation.isPending ? 'Saving...' : (editingAmenity ? 'Update' : 'Create')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Booking Dialog */}
      <Dialog open={showBookingDialog} onOpenChange={setShowBookingDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Book Amenity</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleBookingSubmit} className="space-y-4">
            <div>
              <Label htmlFor="resident_name">Resident Name *</Label>
              <Input
                id="resident_name"
                value={bookingForm.resident_name}
                onChange={(e) => setBookingForm({ ...bookingForm, resident_name: e.target.value })}
                required
              />
            </div>
            <div>
              <Label htmlFor="unit_number">Unit Number</Label>
              <Input
                id="unit_number"
                value={bookingForm.unit_number}
                onChange={(e) => setBookingForm({ ...bookingForm, unit_number: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="booking_date">Date *</Label>
              <Input
                id="booking_date"
                type="date"
                value={bookingForm.booking_date}
                onChange={(e) => setBookingForm({ ...bookingForm, booking_date: e.target.value })}
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="start_time">Start Time *</Label>
                <Input
                  id="start_time"
                  type="time"
                  value={bookingForm.start_time}
                  onChange={(e) => setBookingForm({ ...bookingForm, start_time: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="end_time">End Time *</Label>
                <Input
                  id="end_time"
                  type="time"
                  value={bookingForm.end_time}
                  onChange={(e) => setBookingForm({ ...bookingForm, end_time: e.target.value })}
                  required
                />
              </div>
            </div>
            <div>
              <Label htmlFor="guests">Number of Guests</Label>
              <Input
                id="guests"
                type="number"
                value={bookingForm.guests}
                onChange={(e) => setBookingForm({ ...bookingForm, guests: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="purpose">Purpose</Label>
              <Input
                id="purpose"
                value={bookingForm.purpose}
                onChange={(e) => setBookingForm({ ...bookingForm, purpose: e.target.value })}
                placeholder="e.g., Birthday party"
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowBookingDialog(false)}>Cancel</Button>
              <Button type="submit" className="bg-blue-600 hover:bg-blue-700" disabled={createBookingMutation.isPending}>
                {createBookingMutation.isPending ? 'Booking...' : 'Book'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteAmenity} onOpenChange={() => setDeleteAmenity(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Amenity</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deleteAmenity?.name}"?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteMutation.mutate(deleteAmenity.id)} className="bg-red-600 hover:bg-red-700">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}