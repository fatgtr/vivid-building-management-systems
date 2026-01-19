import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useBuildingContext } from '@/components/BuildingContext';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Briefcase, Plus, Search, Phone, Mail, Star, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import PageHeader from '@/components/common/PageHeader';

export default function ServiceDirectory() {
  const { selectedBuildingId } = useBuildingContext();
  const [showDialog, setShowDialog] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    building_id: selectedBuildingId || '',
    category: 'plumber',
    business_name: '',
    contact_name: '',
    phone: '',
    email: '',
    description: ''
  });

  const { data: providers = [] } = useQuery({
    queryKey: ['serviceProviders'],
    queryFn: () => base44.entities.ServiceProvider.list()
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.ServiceProvider.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['serviceProviders'] });
      setShowDialog(false);
      toast.success('Service provider added');
    }
  });

  const filteredProviders = providers.filter(p => {
    const matchesSearch = p.business_name?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = filterCategory === 'all' || p.category === filterCategory;
    const matchesBuilding = !p.building_id || p.building_id === selectedBuildingId;
    return matchesSearch && matchesCategory && matchesBuilding;
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Local Services Directory"
        subtitle="Recommended contractors and service providers"
        action={() => setShowDialog(true)}
        actionLabel="Add Provider"
      />

      <div className="flex gap-4 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search providers..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={filterCategory} onValueChange={setFilterCategory}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All Categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            <SelectItem value="plumber">Plumber</SelectItem>
            <SelectItem value="electrician">Electrician</SelectItem>
            <SelectItem value="locksmith">Locksmith</SelectItem>
            <SelectItem value="cleaner">Cleaner</SelectItem>
            <SelectItem value="handyman">Handyman</SelectItem>
            <SelectItem value="pest_control">Pest Control</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredProviders.map((provider) => (
          <Card key={provider.id} className="hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h3 className="font-bold text-lg text-slate-900">{provider.business_name}</h3>
                  <p className="text-sm text-slate-600">{provider.contact_name}</p>
                </div>
                {provider.building_approved && (
                  <Badge className="bg-blue-600">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Approved
                  </Badge>
                )}
              </div>

              <div className="space-y-2 mb-4">
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="h-4 w-4 text-slate-400" />
                  <span>{provider.phone}</span>
                </div>
                {provider.email && (
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="h-4 w-4 text-slate-400" />
                    <span>{provider.email}</span>
                  </div>
                )}
                {provider.rating > 0 && (
                  <div className="flex items-center gap-2 text-sm">
                    <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                    <span>{provider.rating.toFixed(1)} ({provider.reviews_count} reviews)</span>
                  </div>
                )}
              </div>

              <Badge className="capitalize">{provider.category?.replace(/_/g, ' ')}</Badge>
              {provider.description && (
                <p className="text-sm text-slate-600 mt-3 line-clamp-2">{provider.description}</p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Service Provider</DialogTitle>
          </DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); createMutation.mutate(formData); }} className="space-y-4">
            <div>
              <Label>Business Name *</Label>
              <Input
                value={formData.business_name}
                onChange={(e) => setFormData({ ...formData, business_name: e.target.value })}
                required
              />
            </div>
            <div>
              <Label>Category *</Label>
              <Select value={formData.category} onValueChange={(v) => setFormData({ ...formData, category: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="plumber">Plumber</SelectItem>
                  <SelectItem value="electrician">Electrician</SelectItem>
                  <SelectItem value="locksmith">Locksmith</SelectItem>
                  <SelectItem value="cleaner">Cleaner</SelectItem>
                  <SelectItem value="handyman">Handyman</SelectItem>
                  <SelectItem value="pest_control">Pest Control</SelectItem>
                  <SelectItem value="gardener">Gardener</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Contact Name</Label>
              <Input
                value={formData.contact_name}
                onChange={(e) => setFormData({ ...formData, contact_name: e.target.value })}
              />
            </div>
            <div>
              <Label>Phone *</Label>
              <Input
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                required
              />
            </div>
            <div>
              <Label>Email</Label>
              <Input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? 'Adding...' : 'Add Provider'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}