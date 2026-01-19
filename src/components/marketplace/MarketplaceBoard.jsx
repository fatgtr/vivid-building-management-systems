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
import { ShoppingBag, Plus, Search, Eye, DollarSign, Heart } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import EmptyState from '@/components/common/EmptyState';

export default function MarketplaceBoard() {
  const { selectedBuildingId, user } = useBuildingContext();
  const [showDialog, setShowDialog] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    building_id: selectedBuildingId || '',
    title: '',
    description: '',
    category: 'other',
    price: '',
    listing_type: 'for_sale',
    condition: 'good',
    negotiable: true,
    seller_name: user?.full_name || '',
    seller_email: user?.email || ''
  });

  const { data: items = [] } = useQuery({
    queryKey: ['marketplaceItems', selectedBuildingId],
    queryFn: async () => {
      const all = await base44.entities.MarketplaceItem.list('-created_date');
      return selectedBuildingId ? all.filter(i => i.building_id === selectedBuildingId && i.status === 'active') : all;
    }
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.MarketplaceItem.create({
      ...data,
      expires_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['marketplaceItems'] });
      setShowDialog(false);
      toast.success('Listing created successfully');
    }
  });

  const filteredItems = items.filter(i => {
    const matchesSearch = i.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         i.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = filterCategory === 'all' || i.category === filterCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Building Marketplace</h2>
          <p className="text-slate-600">Buy, sell, and trade with your neighbors</p>
        </div>
        <Button onClick={() => setShowDialog(true)} className="bg-blue-600 hover:bg-blue-700">
          <Plus className="h-4 w-4 mr-2" />
          Create Listing
        </Button>
      </div>

      <div className="flex gap-4 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search items..."
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
            <SelectItem value="furniture">Furniture</SelectItem>
            <SelectItem value="electronics">Electronics</SelectItem>
            <SelectItem value="appliances">Appliances</SelectItem>
            <SelectItem value="books">Books</SelectItem>
            <SelectItem value="clothing">Clothing</SelectItem>
            <SelectItem value="sports">Sports</SelectItem>
            <SelectItem value="kids">Kids</SelectItem>
            <SelectItem value="services">Services</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {filteredItems.length === 0 ? (
        <EmptyState
          icon={ShoppingBag}
          title="No listings yet"
          description="Be the first to list an item in the marketplace"
          action={() => setShowDialog(true)}
          actionLabel="Create Listing"
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredItems.map((item) => (
            <Card key={item.id} className="overflow-hidden hover:shadow-lg transition-shadow">
              <div className="h-48 bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
                <ShoppingBag className="h-16 w-16 text-slate-300" />
              </div>
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-semibold text-lg text-slate-900 line-clamp-1">{item.title}</h3>
                  {item.listing_type === 'for_sale' ? (
                    <span className="text-lg font-bold text-green-600 flex items-center">
                      <DollarSign className="h-4 w-4" />
                      {item.price}
                    </span>
                  ) : (
                    <Badge>{item.listing_type === 'free' ? 'FREE' : 'Wanted'}</Badge>
                  )}
                </div>
                <p className="text-sm text-slate-600 line-clamp-2 mb-3">{item.description}</p>
                <div className="flex flex-wrap gap-2 mb-3">
                  <Badge variant="outline" className="capitalize">{item.category}</Badge>
                  <Badge variant="outline" className="capitalize">{item.condition?.replace(/_/g, ' ')}</Badge>
                  {item.negotiable && <Badge variant="outline">Negotiable</Badge>}
                </div>
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span>{item.seller_name} • Unit {item.seller_unit}</span>
                  <span className="flex items-center gap-1">
                    <Eye className="h-3 w-3" /> {item.views || 0}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create Listing Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Marketplace Listing</DialogTitle>
          </DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); createMutation.mutate(formData); }} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label>Listing Title *</Label>
                <Input
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g., Dining Table Set"
                  required
                />
              </div>
              <div>
                <Label>Listing Type *</Label>
                <Select value={formData.listing_type} onValueChange={(v) => setFormData({ ...formData, listing_type: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="for_sale">For Sale</SelectItem>
                    <SelectItem value="free">Free</SelectItem>
                    <SelectItem value="wanted">Wanted</SelectItem>
                    <SelectItem value="service_offered">Service Offered</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Category *</Label>
                <Select value={formData.category} onValueChange={(v) => setFormData({ ...formData, category: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="furniture">Furniture</SelectItem>
                    <SelectItem value="electronics">Electronics</SelectItem>
                    <SelectItem value="appliances">Appliances</SelectItem>
                    <SelectItem value="books">Books</SelectItem>
                    <SelectItem value="clothing">Clothing</SelectItem>
                    <SelectItem value="sports">Sports & Outdoors</SelectItem>
                    <SelectItem value="kids">Kids & Baby</SelectItem>
                    <SelectItem value="services">Services</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {formData.listing_type === 'for_sale' && (
                <>
                  <div>
                    <Label>Price ($) *</Label>
                    <Input
                      type="number"
                      value={formData.price}
                      onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <Label>Condition *</Label>
                    <Select value={formData.condition} onValueChange={(v) => setFormData({ ...formData, condition: v })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="new">New</SelectItem>
                        <SelectItem value="like_new">Like New</SelectItem>
                        <SelectItem value="good">Good</SelectItem>
                        <SelectItem value="fair">Fair</SelectItem>
                        <SelectItem value="for_parts">For Parts</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}
              <div className="col-span-2">
                <Label>Description *</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={4}
                  required
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? 'Creating...' : 'Create Listing'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}