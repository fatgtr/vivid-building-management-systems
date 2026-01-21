import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useBuildingContext } from '@/components/BuildingContext';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ShoppingBag, Plus, Search, Heart, MessageSquare, Eye, Filter, X } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

export default function EnhancedMarketplace() {
  const { selectedBuildingId, user } = useBuildingContext();
  const [showDialog, setShowDialog] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [listingTypeFilter, setListingTypeFilter] = useState('all');
  const [imageFiles, setImageFiles] = useState([]);
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    building_id: selectedBuildingId || '',
    title: '',
    description: '',
    category: 'other',
    price: '',
    condition: 'good',
    listing_type: 'for_sale',
    negotiable: true,
    seller_name: user?.full_name || '',
    seller_email: user?.email || '',
    seller_phone: ''
  });

  const { data: items = [] } = useQuery({
    queryKey: ['marketplace', selectedBuildingId],
    queryFn: async () => {
      const all = await base44.entities.MarketplaceItem.list('-created_date');
      return selectedBuildingId ? all.filter(i => i.building_id === selectedBuildingId) : all;
    }
  });

  const createMutation = useMutation({
    mutationFn: async (data) => {
      let imageUrls = [];
      if (imageFiles.length > 0) {
        for (const file of imageFiles) {
          const { file_url } = await base44.integrations.Core.UploadFile({ file });
          imageUrls.push(file_url);
        }
      }
      return await base44.entities.MarketplaceItem.create({
        ...data,
        images: imageUrls,
        expires_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['marketplace'] });
      setShowDialog(false);
      setImageFiles([]);
      toast.success('Listing created!');
    }
  });

  const interestMutation = useMutation({
    mutationFn: async (itemId) => {
      const item = items.find(i => i.id === itemId);
      const interested = item.interested_users || [];
      if (!interested.includes(user?.email)) {
        interested.push(user?.email);
      }
      return await base44.entities.MarketplaceItem.update(itemId, {
        interested_users: interested
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['marketplace'] });
      toast.success('Interest recorded!');
    }
  });

  const incrementViews = async (itemId) => {
    const item = items.find(i => i.id === itemId);
    await base44.entities.MarketplaceItem.update(itemId, {
      views: (item.views || 0) + 1
    });
  };

  const filteredItems = items.filter(item => {
    const matchesSearch = item.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         item.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || item.category === categoryFilter;
    const matchesType = listingTypeFilter === 'all' || item.listing_type === listingTypeFilter;
    return matchesSearch && matchesCategory && matchesType && item.status === 'active';
  });

  const categories = [
    { value: 'furniture', label: 'Furniture' },
    { value: 'electronics', label: 'Electronics' },
    { value: 'appliances', label: 'Appliances' },
    { value: 'books', label: 'Books' },
    { value: 'clothing', label: 'Clothing' },
    { value: 'sports', label: 'Sports' },
    { value: 'kids', label: 'Kids' },
    { value: 'services', label: 'Services' },
    { value: 'other', label: 'Other' }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Community Marketplace</h1>
          <p className="text-sm text-slate-500 mt-1">Buy, sell, and trade with your neighbors</p>
        </div>
        <Button onClick={() => setShowDialog(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Create Listing
        </Button>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search items..."
                className="pl-10"
              />
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map(cat => (
                  <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={listingTypeFilter} onValueChange={setListingTypeFilter}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="for_sale">For Sale</SelectItem>
                <SelectItem value="free">Free</SelectItem>
                <SelectItem value="wanted">Wanted</SelectItem>
                <SelectItem value="service_offered">Service Offered</SelectItem>
                <SelectItem value="service_wanted">Service Wanted</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Items Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredItems.map((item) => (
          <Card key={item.id} className="overflow-hidden hover:shadow-lg transition-shadow">
            {item.images?.length > 0 && (
              <div className="aspect-video bg-slate-100 overflow-hidden">
                <img 
                  src={item.images[0]} 
                  alt={item.title}
                  className="w-full h-full object-cover"
                />
              </div>
            )}
            <CardHeader>
              <div className="flex items-start justify-between mb-2">
                <Badge className="capitalize">{item.listing_type?.replace(/_/g, ' ')}</Badge>
                <div className="flex items-center gap-1 text-xs text-slate-500">
                  <Eye className="h-3 w-3" />
                  {item.views || 0}
                </div>
              </div>
              <CardTitle className="text-lg">{item.title}</CardTitle>
              <div className="flex items-center justify-between mt-2">
                {item.listing_type === 'for_sale' && (
                  <div className="flex items-center gap-2">
                    <p className="text-2xl font-bold text-slate-900">
                      ${item.price}
                    </p>
                    {item.negotiable && (
                      <Badge variant="outline" className="text-xs">Negotiable</Badge>
                    )}
                  </div>
                )}
                {item.listing_type === 'free' && (
                  <Badge className="bg-green-100 text-green-800">FREE</Badge>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-slate-600 mb-3 line-clamp-2">{item.description}</p>
              
              <div className="flex items-center justify-between text-xs text-slate-500 mb-3">
                <span className="capitalize">{item.condition}</span>
                <span className="capitalize">{item.category}</span>
              </div>

              <div className="flex gap-2">
                <Button 
                  size="sm" 
                  className="flex-1"
                  onClick={() => {
                    setSelectedItem(item);
                    incrementViews(item.id);
                  }}
                >
                  View Details
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => interestMutation.mutate(item.id)}
                  disabled={item.interested_users?.includes(user?.email)}
                >
                  <Heart className={`h-4 w-4 ${item.interested_users?.includes(user?.email) ? 'fill-red-500 text-red-500' : ''}`} />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredItems.length === 0 && (
        <Card className="p-12 text-center">
          <ShoppingBag className="h-16 w-16 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-600 font-medium mb-2">No items found</p>
          <p className="text-sm text-slate-500">Try adjusting your filters or create a new listing</p>
        </Card>
      )}

      {/* Create Listing Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Listing</DialogTitle>
          </DialogHeader>
          <form onSubmit={(e) => {
            e.preventDefault();
            createMutation.mutate(formData);
          }} className="space-y-4">
            <div>
              <Label>Title *</Label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="What are you listing?"
                required
              />
            </div>
            <div>
              <Label>Description *</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Provide details..."
                rows={4}
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Category *</Label>
                <Select value={formData.category} onValueChange={(v) => setFormData({ ...formData, category: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map(cat => (
                      <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
                    <SelectItem value="service_wanted">Service Wanted</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            {formData.listing_type === 'for_sale' && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Price *</Label>
                  <Input
                    type="number"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    placeholder="0.00"
                    step="0.01"
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
              </div>
            )}
            <div>
              <Label>Photos</Label>
              <Input
                type="file"
                accept="image/*"
                multiple
                onChange={(e) => setImageFiles(Array.from(e.target.files))}
              />
              <p className="text-xs text-slate-500 mt-1">Upload up to 5 photos</p>
            </div>
            <div>
              <Label>Contact Phone</Label>
              <Input
                type="tel"
                value={formData.seller_phone}
                onChange={(e) => setFormData({ ...formData, seller_phone: e.target.value })}
                placeholder="(optional)"
              />
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

      {/* Item Details Dialog */}
      {selectedItem && (
        <Dialog open={!!selectedItem} onOpenChange={() => setSelectedItem(null)}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>{selectedItem.title}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {selectedItem.images?.length > 0 && (
                <div className="grid grid-cols-2 gap-2">
                  {selectedItem.images.map((img, idx) => (
                    <img key={idx} src={img} alt="" className="w-full h-48 object-cover rounded-lg" />
                  ))}
                </div>
              )}
              <div>
                <p className="text-slate-700">{selectedItem.description}</p>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-slate-500">Category</p>
                  <p className="font-semibold capitalize">{selectedItem.category}</p>
                </div>
                <div>
                  <p className="text-slate-500">Condition</p>
                  <p className="font-semibold capitalize">{selectedItem.condition}</p>
                </div>
                <div>
                  <p className="text-slate-500">Listed by</p>
                  <p className="font-semibold">{selectedItem.seller_name}</p>
                </div>
                <div>
                  <p className="text-slate-500">Unit</p>
                  <p className="font-semibold">{selectedItem.seller_unit || 'N/A'}</p>
                </div>
              </div>
              <div className="flex gap-2 pt-4 border-t">
                <Button className="flex-1" onClick={() => window.location.href = `mailto:${selectedItem.seller_email}`}>
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Contact Seller
                </Button>
                {selectedItem.seller_phone && (
                  <Button variant="outline" onClick={() => window.location.href = `tel:${selectedItem.seller_phone}`}>
                    Call
                  </Button>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}