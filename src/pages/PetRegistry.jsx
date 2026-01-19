import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useBuildingContext } from '@/components/BuildingContext';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Heart, Plus, Search } from 'lucide-react';
import { toast } from 'sonner';
import PageHeader from '@/components/common/PageHeader';

export default function PetRegistry() {
  const { selectedBuildingId } = useBuildingContext();
  const [showDialog, setShowDialog] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    building_id: selectedBuildingId || '',
    unit_id: '',
    pet_name: '',
    pet_type: 'dog',
    breed: '',
    microchip_number: '',
    registration_number: ''
  });

  const { data: pets = [] } = useQuery({
    queryKey: ['pets', selectedBuildingId],
    queryFn: async () => {
      const all = await base44.entities.PetRegistry.list();
      return selectedBuildingId ? all.filter(p => p.building_id === selectedBuildingId && p.status === 'active') : all;
    }
  });

  const { data: units = [] } = useQuery({
    queryKey: ['units'],
    queryFn: () => base44.entities.Unit.list()
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.PetRegistry.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pets'] });
      setShowDialog(false);
      toast.success('Pet registered');
    }
  });

  const filteredPets = pets.filter(p =>
    p.pet_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.breed?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Pet Registry"
        subtitle="Building pet registrations and approvals"
        action={() => setShowDialog(true)}
        actionLabel="Register Pet"
      />

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <Input
          placeholder="Search pets..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {filteredPets.map((pet) => {
          const unit = units.find(u => u.id === pet.unit_id);
          return (
            <Card key={pet.id}>
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="h-16 w-16 rounded-full bg-gradient-to-br from-pink-400 to-purple-500 flex items-center justify-center">
                    <Heart className="h-8 w-8 text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-lg">{pet.pet_name}</h3>
                    <p className="text-sm text-slate-600">{pet.breed}</p>
                    <p className="text-xs text-slate-500 mt-1">Unit {unit?.unit_number}</p>
                    <div className="flex gap-2 mt-2">
                      <Badge className="capitalize">{pet.pet_type}</Badge>
                      {pet.approved && <Badge className="bg-green-600">Approved</Badge>}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Register Pet</DialogTitle>
          </DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); createMutation.mutate(formData); }} className="space-y-4">
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
              <Label>Pet Name *</Label>
              <Input
                value={formData.pet_name}
                onChange={(e) => setFormData({ ...formData, pet_name: e.target.value })}
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Pet Type *</Label>
                <Select value={formData.pet_type} onValueChange={(v) => setFormData({ ...formData, pet_type: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="dog">Dog</SelectItem>
                    <SelectItem value="cat">Cat</SelectItem>
                    <SelectItem value="bird">Bird</SelectItem>
                    <SelectItem value="fish">Fish</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Breed</Label>
                <Input
                  value={formData.breed}
                  onChange={(e) => setFormData({ ...formData, breed: e.target.value })}
                />
              </div>
            </div>
            <div>
              <Label>Microchip Number</Label>
              <Input
                value={formData.microchip_number}
                onChange={(e) => setFormData({ ...formData, microchip_number: e.target.value })}
              />
            </div>
            <div>
              <Label>Council Registration</Label>
              <Input
                value={formData.registration_number}
                onChange={(e) => setFormData({ ...formData, registration_number: e.target.value })}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? 'Registering...' : 'Register Pet'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}