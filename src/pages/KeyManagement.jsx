import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useBuildingContext } from '@/components/BuildingContext';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Key, Plus, Search } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import PageHeader from '@/components/common/PageHeader';

export default function KeyManagement() {
  const { selectedBuildingId } = useBuildingContext();
  const [showDialog, setShowDialog] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    building_id: selectedBuildingId || '',
    key_type: 'physical_key',
    key_number: '',
    description: '',
    issued_to_type: 'resident',
    issued_to_name: '',
    unit_number: '',
    issue_date: new Date().toISOString().split('T')[0]
  });

  const { data: keys = [] } = useQuery({
    queryKey: ['keys', selectedBuildingId],
    queryFn: async () => {
      const all = await base44.entities.KeyRegister.list();
      return selectedBuildingId ? all.filter(k => k.building_id === selectedBuildingId) : all;
    }
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.KeyRegister.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['keys'] });
      setShowDialog(false);
      toast.success('Key registered');
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.KeyRegister.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['keys'] });
      toast.success('Key returned');
    }
  });

  const filteredKeys = keys.filter(k =>
    k.issued_to_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    k.key_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    k.unit_number?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Key & Access Management"
        subtitle="Track keys, fobs, and access cards"
        action={() => setShowDialog(true)}
        actionLabel="Register Key"
      />

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <Input
          placeholder="Search keys..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50">
              <TableHead>Type</TableHead>
              <TableHead>Number/ID</TableHead>
              <TableHead>Issued To</TableHead>
              <TableHead>Unit</TableHead>
              <TableHead>Issue Date</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredKeys.map((key) => (
              <TableRow key={key.id}>
                <TableCell className="capitalize">{key.key_type?.replace(/_/g, ' ')}</TableCell>
                <TableCell className="font-medium">{key.key_number}</TableCell>
                <TableCell>{key.issued_to_name}</TableCell>
                <TableCell>Unit {key.unit_number}</TableCell>
                <TableCell>{format(new Date(key.issue_date), 'MMM d, yyyy')}</TableCell>
                <TableCell>
                  <Badge className={
                    key.status === 'active' ? 'bg-green-600' :
                    key.status === 'lost' ? 'bg-red-600' : 'bg-slate-600'
                  }>
                    {key.status}
                  </Badge>
                </TableCell>
                <TableCell>
                  {key.status === 'active' && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => updateMutation.mutate({
                        id: key.id,
                        data: { ...key, status: 'returned', return_date: new Date().toISOString().split('T')[0] }
                      })}
                    >
                      Mark Returned
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Register Key/Access Card</DialogTitle>
          </DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); createMutation.mutate(formData); }} className="space-y-4">
            <div>
              <Label>Type *</Label>
              <Select value={formData.key_type} onValueChange={(v) => setFormData({ ...formData, key_type: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="physical_key">Physical Key</SelectItem>
                  <SelectItem value="fob">Fob</SelectItem>
                  <SelectItem value="access_card">Access Card</SelectItem>
                  <SelectItem value="code">Access Code</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Key Number/ID *</Label>
              <Input
                value={formData.key_number}
                onChange={(e) => setFormData({ ...formData, key_number: e.target.value })}
                required
              />
            </div>
            <div>
              <Label>Description</Label>
              <Input
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="e.g., Main entrance, Unit door"
              />
            </div>
            <div>
              <Label>Issued To *</Label>
              <Input
                value={formData.issued_to_name}
                onChange={(e) => setFormData({ ...formData, issued_to_name: e.target.value })}
                required
              />
            </div>
            <div>
              <Label>Unit Number</Label>
              <Input
                value={formData.unit_number}
                onChange={(e) => setFormData({ ...formData, unit_number: e.target.value })}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? 'Registering...' : 'Register'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}