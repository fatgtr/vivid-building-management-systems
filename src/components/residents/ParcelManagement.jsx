import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useBuildingContext } from '@/components/BuildingContext';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Package, Search, CheckCircle, Bell, Camera, MapPin } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import EmptyState from '@/components/common/EmptyState';

export default function ParcelManagement() {
  const { selectedBuildingId } = useBuildingContext();
  const [showDialog, setShowDialog] = useState(false);
  const [showCollectDialog, setShowCollectDialog] = useState(false);
  const [selectedParcel, setSelectedParcel] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    building_id: selectedBuildingId || '',
    recipient_name: '',
    recipient_unit: '',
    carrier: 'auspost',
    tracking_number: '',
    package_type: 'small_box',
    storage_location: '',
    notes: '',
    requires_refrigeration: false,
    perishable: false
  });

  const { data: parcels = [] } = useQuery({
    queryKey: ['parcels', selectedBuildingId],
    queryFn: async () => {
      const all = await base44.entities.Parcel.list('-received_date');
      return selectedBuildingId ? all.filter(p => p.building_id === selectedBuildingId) : all;
    }
  });

  const { data: residents = [] } = useQuery({
    queryKey: ['residents'],
    queryFn: () => base44.entities.Resident.list()
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Parcel.create({
      ...data,
      received_date: new Date().toISOString(),
      received_by: 'Front Desk'
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['parcels'] });
      setShowDialog(false);
      setFormData({
        building_id: selectedBuildingId || '',
        recipient_name: '',
        recipient_unit: '',
        carrier: 'auspost',
        tracking_number: '',
        package_type: 'small_box',
        storage_location: '',
        notes: '',
        requires_refrigeration: false,
        perishable: false
      });
      toast.success('Parcel logged successfully');
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Parcel.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['parcels'] });
      setShowCollectDialog(false);
      setSelectedParcel(null);
      toast.success('Parcel marked as collected');
    }
  });

  const handleCollect = (collectedBy) => {
    if (!selectedParcel) return;
    updateMutation.mutate({
      id: selectedParcel.id,
      data: {
        ...selectedParcel,
        collected: true,
        collected_date: new Date().toISOString(),
        collected_by: collectedBy,
        status: 'collected'
      }
    });
  };

  const filteredParcels = parcels.filter(p =>
    p.recipient_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.recipient_unit?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.tracking_number?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const pendingParcels = filteredParcels.filter(p => !p.collected);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Parcel Management</h2>
          <p className="text-slate-600">{pendingParcels.length} parcels awaiting collection</p>
        </div>
        <Button onClick={() => setShowDialog(true)} className="bg-blue-600 hover:bg-blue-700">
          <Package className="h-4 w-4 mr-2" />
          Log Parcel
        </Button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <Input
          placeholder="Search parcels..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      {filteredParcels.length === 0 ? (
        <EmptyState
          icon={Package}
          title="No parcels"
          description="Log parcels as they arrive at the building"
          action={() => setShowDialog(true)}
          actionLabel="Log Parcel"
        />
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50">
                <TableHead>Recipient</TableHead>
                <TableHead>Carrier</TableHead>
                <TableHead>Package Type</TableHead>
                <TableHead>Received</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredParcels.map((parcel) => (
                <TableRow key={parcel.id} className={parcel.collected ? 'opacity-60' : ''}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{parcel.recipient_name}</p>
                      <p className="text-xs text-slate-500">Unit {parcel.recipient_unit}</p>
                    </div>
                  </TableCell>
                  <TableCell className="capitalize">{parcel.carrier}</TableCell>
                  <TableCell className="capitalize">{parcel.package_type?.replace(/_/g, ' ')}</TableCell>
                  <TableCell className="text-sm">
                    {format(new Date(parcel.received_date), 'MMM d, h:mm a')}
                  </TableCell>
                  <TableCell>
                    {parcel.storage_location && (
                      <div className="flex items-center gap-1 text-sm">
                        <MapPin className="h-3 w-3 text-slate-400" />
                        {parcel.storage_location}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge className={parcel.collected ? 'bg-green-600' : 'bg-orange-600'}>
                      {parcel.collected ? 'Collected' : 'Pending'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {!parcel.collected && (
                      <Button
                        size="sm"
                        onClick={() => {
                          setSelectedParcel(parcel);
                          setShowCollectDialog(true);
                        }}
                        className="h-7"
                      >
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Collect
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* Log Parcel Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Log New Parcel</DialogTitle>
          </DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); createMutation.mutate(formData); }} className="space-y-4">
            <div>
              <Label>Recipient Name *</Label>
              <Input
                value={formData.recipient_name}
                onChange={(e) => setFormData({ ...formData, recipient_name: e.target.value })}
                required
              />
            </div>
            <div>
              <Label>Unit Number *</Label>
              <Input
                value={formData.recipient_unit}
                onChange={(e) => setFormData({ ...formData, recipient_unit: e.target.value })}
                required
              />
            </div>
            <div>
              <Label>Carrier</Label>
              <Select value={formData.carrier} onValueChange={(v) => setFormData({ ...formData, carrier: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="auspost">Australia Post</SelectItem>
                  <SelectItem value="fedex">FedEx</SelectItem>
                  <SelectItem value="dhl">DHL</SelectItem>
                  <SelectItem value="amazon">Amazon</SelectItem>
                  <SelectItem value="startrack">Star Track</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Tracking Number</Label>
              <Input
                value={formData.tracking_number}
                onChange={(e) => setFormData({ ...formData, tracking_number: e.target.value })}
              />
            </div>
            <div>
              <Label>Package Type</Label>
              <Select value={formData.package_type} onValueChange={(v) => setFormData({ ...formData, package_type: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="envelope">Envelope</SelectItem>
                  <SelectItem value="small_box">Small Box</SelectItem>
                  <SelectItem value="medium_box">Medium Box</SelectItem>
                  <SelectItem value="large_box">Large Box</SelectItem>
                  <SelectItem value="oversized">Oversized</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Storage Location</Label>
              <Input
                value={formData.storage_location}
                onChange={(e) => setFormData({ ...formData, storage_location: e.target.value })}
                placeholder="e.g., Shelf A3, Locker 12"
              />
            </div>
            <div>
              <Label>Notes</Label>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={2}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? 'Logging...' : 'Log Parcel'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Collect Parcel Dialog */}
      <Dialog open={showCollectDialog} onOpenChange={setShowCollectDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Confirm Collection</DialogTitle>
          </DialogHeader>
          <form onSubmit={(e) => {
            e.preventDefault();
            const formData = new FormData(e.target);
            handleCollect(formData.get('collected_by'));
          }} className="space-y-4">
            <p className="text-sm text-slate-600">
              Confirm collection for {selectedParcel?.recipient_name}
            </p>
            <div>
              <Label>Collected By</Label>
              <Input name="collected_by" required placeholder="Enter name" />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowCollectDialog(false)}>Cancel</Button>
              <Button type="submit">Confirm</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}