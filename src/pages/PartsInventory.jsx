import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useBuildingContext } from '@/components/BuildingContext';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Package,
  Plus,
  Search,
  AlertTriangle,
  TrendingDown,
  Edit,
  ArrowUpDown,
  ArrowDownUp,
  DollarSign,
  Wrench,
  Eye,
  BarChart3,
  PackageOpen
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const CATEGORIES = [
  { value: 'electrical', label: 'Electrical' },
  { value: 'plumbing', label: 'Plumbing' },
  { value: 'hvac', label: 'HVAC' },
  { value: 'fire_safety', label: 'Fire Safety' },
  { value: 'appliance', label: 'Appliance' },
  { value: 'structural', label: 'Structural' },
  { value: 'cleaning', label: 'Cleaning' },
  { value: 'general_maintenance', label: 'General Maintenance' },
  { value: 'tools', label: 'Tools' },
  { value: 'other', label: 'Other' },
];

const UNITS = [
  { value: 'each', label: 'Each' },
  { value: 'box', label: 'Box' },
  { value: 'case', label: 'Case' },
  { value: 'pair', label: 'Pair' },
  { value: 'set', label: 'Set' },
  { value: 'roll', label: 'Roll' },
  { value: 'meter', label: 'Meter' },
  { value: 'liter', label: 'Liter' },
  { value: 'kg', label: 'Kilogram' },
];

export default function PartsInventory() {
  const { selectedBuildingId } = useBuildingContext();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showPartDialog, setShowPartDialog] = useState(false);
  const [showTransactionDialog, setShowTransactionDialog] = useState(false);
  const [editingPart, setEditingPart] = useState(null);
  const [selectedPart, setSelectedPart] = useState(null);
  const [sortBy, setSortBy] = useState('name');

  const [partForm, setPartForm] = useState({
    name: '',
    sku: '',
    description: '',
    category: 'general_maintenance',
    manufacturer: '',
    model_number: '',
    supplier: '',
    supplier_contact: '',
    quantity_on_hand: 0,
    unit_of_measure: 'each',
    reorder_point: 10,
    reorder_quantity: 50,
    location: '',
    unit_cost: 0,
    barcode: '',
    image_url: '',
    notes: '',
  });

  const [transactionForm, setTransactionForm] = useState({
    transaction_type: 'purchase',
    quantity: 0,
    unit_cost: 0,
    supplier: '',
    purchase_order_number: '',
    invoice_number: '',
    notes: '',
  });

  const { data: parts = [], isLoading } = useQuery({
    queryKey: ['parts', selectedBuildingId],
    queryFn: () => selectedBuildingId 
      ? base44.entities.Part.filter({ building_id: selectedBuildingId })
      : base44.entities.Part.list(),
  });

  const { data: transactions = [] } = useQuery({
    queryKey: ['inventoryTransactions', selectedPart?.id],
    queryFn: () => selectedPart 
      ? base44.entities.InventoryTransaction.filter({ part_id: selectedPart.id })
      : Promise.resolve([]),
    enabled: !!selectedPart,
  });

  const createPartMutation = useMutation({
    mutationFn: (data) => base44.entities.Part.create({
      ...data,
      building_id: selectedBuildingId,
      total_value: data.quantity_on_hand * data.unit_cost,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['parts'] });
      setShowPartDialog(false);
      resetPartForm();
      toast.success('Part added successfully');
    },
  });

  const updatePartMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Part.update(id, {
      ...data,
      total_value: data.quantity_on_hand * data.unit_cost,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['parts'] });
      setShowPartDialog(false);
      setEditingPart(null);
      resetPartForm();
      toast.success('Part updated successfully');
    },
  });

  const createTransactionMutation = useMutation({
    mutationFn: async (data) => {
      const user = await base44.auth.me();
      const part = selectedPart;
      
      const quantityChange = data.transaction_type === 'usage' || data.transaction_type === 'waste' 
        ? -Math.abs(data.quantity) 
        : Math.abs(data.quantity);
      
      const newQuantity = part.quantity_on_hand + quantityChange;
      
      // Create transaction
      await base44.entities.InventoryTransaction.create({
        ...data,
        part_id: part.id,
        building_id: selectedBuildingId,
        performed_by: user.id,
        performed_by_name: user.full_name,
        previous_quantity: part.quantity_on_hand,
        new_quantity: newQuantity,
        total_cost: Math.abs(data.quantity) * data.unit_cost,
      });

      // Update part quantity and status
      let status = 'active';
      if (newQuantity === 0) status = 'out_of_stock';
      else if (part.reorder_point && newQuantity <= part.reorder_point) status = 'low_stock';

      await base44.entities.Part.update(part.id, {
        quantity_on_hand: newQuantity,
        status: status,
        last_purchased_date: data.transaction_type === 'purchase' ? new Date().toISOString().split('T')[0] : part.last_purchased_date,
        last_used_date: data.transaction_type === 'usage' ? new Date().toISOString().split('T')[0] : part.last_used_date,
        total_value: newQuantity * part.unit_cost,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['parts'] });
      queryClient.invalidateQueries({ queryKey: ['inventoryTransactions'] });
      setShowTransactionDialog(false);
      resetTransactionForm();
      toast.success('Transaction recorded successfully');
    },
  });

  const resetPartForm = () => {
    setPartForm({
      name: '',
      sku: '',
      description: '',
      category: 'general_maintenance',
      manufacturer: '',
      model_number: '',
      supplier: '',
      supplier_contact: '',
      quantity_on_hand: 0,
      unit_of_measure: 'each',
      reorder_point: 10,
      reorder_quantity: 50,
      location: '',
      unit_cost: 0,
      barcode: '',
      image_url: '',
      notes: '',
    });
  };

  const resetTransactionForm = () => {
    setTransactionForm({
      transaction_type: 'purchase',
      quantity: 0,
      unit_cost: 0,
      supplier: '',
      purchase_order_number: '',
      invoice_number: '',
      notes: '',
    });
  };

  const handleEditPart = (part) => {
    setEditingPart(part);
    setPartForm({
      name: part.name || '',
      sku: part.sku || '',
      description: part.description || '',
      category: part.category || 'general_maintenance',
      manufacturer: part.manufacturer || '',
      model_number: part.model_number || '',
      supplier: part.supplier || '',
      supplier_contact: part.supplier_contact || '',
      quantity_on_hand: part.quantity_on_hand || 0,
      unit_of_measure: part.unit_of_measure || 'each',
      reorder_point: part.reorder_point || 10,
      reorder_quantity: part.reorder_quantity || 50,
      location: part.location || '',
      unit_cost: part.unit_cost || 0,
      barcode: part.barcode || '',
      image_url: part.image_url || '',
      notes: part.notes || '',
    });
    setShowPartDialog(true);
  };

  const handleAddTransaction = (part) => {
    setSelectedPart(part);
    setTransactionForm({
      ...transactionForm,
      unit_cost: part.unit_cost || 0,
      supplier: part.supplier || '',
    });
    setShowTransactionDialog(true);
  };

  const handleSubmitPart = (e) => {
    e.preventDefault();
    if (editingPart) {
      updatePartMutation.mutate({ id: editingPart.id, data: partForm });
    } else {
      createPartMutation.mutate(partForm);
    }
  };

  const handleSubmitTransaction = (e) => {
    e.preventDefault();
    createTransactionMutation.mutate(transactionForm);
  };

  // Filter and sort parts
  const filteredParts = parts
    .filter(part => {
      const matchesSearch = !searchQuery || 
        part.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        part.sku?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        part.manufacturer?.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesCategory = selectedCategory === 'all' || part.category === selectedCategory;
      
      const matchesStatus = statusFilter === 'all' || part.status === statusFilter;
      
      return matchesSearch && matchesCategory && matchesStatus;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return (a.name || '').localeCompare(b.name || '');
        case 'quantity':
          return (a.quantity_on_hand || 0) - (b.quantity_on_hand || 0);
        case 'value':
          return (a.total_value || 0) - (b.total_value || 0);
        case 'status':
          return (a.status || '').localeCompare(b.status || '');
        default:
          return 0;
      }
    });

  // Calculate metrics
  const totalValue = parts.reduce((sum, part) => sum + (part.total_value || 0), 0);
  const lowStockItems = parts.filter(p => p.status === 'low_stock' || p.status === 'out_of_stock').length;
  const totalItems = parts.reduce((sum, part) => sum + (part.quantity_on_hand || 0), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Parts Inventory</h1>
          <p className="text-slate-600 mt-1">Manage your parts and supplies inventory</p>
        </div>
        <Button onClick={() => setShowPartDialog(true)} className="bg-blue-600 hover:bg-blue-700">
          <Plus className="h-4 w-4 mr-2" />
          Add Part
        </Button>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Total Parts</p>
                <p className="text-2xl font-bold text-slate-900">{parts.length}</p>
              </div>
              <div className="h-12 w-12 rounded-lg bg-blue-100 flex items-center justify-center">
                <Package className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Total Items</p>
                <p className="text-2xl font-bold text-slate-900">{totalItems}</p>
              </div>
              <div className="h-12 w-12 rounded-lg bg-green-100 flex items-center justify-center">
                <PackageOpen className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Total Value</p>
                <p className="text-2xl font-bold text-slate-900">${totalValue.toFixed(2)}</p>
              </div>
              <div className="h-12 w-12 rounded-lg bg-purple-100 flex items-center justify-center">
                <DollarSign className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className={cn(lowStockItems > 0 && "border-orange-300 bg-orange-50")}>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Low Stock Alerts</p>
                <p className="text-2xl font-bold text-orange-600">{lowStockItems}</p>
              </div>
              <div className="h-12 w-12 rounded-lg bg-orange-100 flex items-center justify-center">
                <AlertTriangle className="h-6 w-6 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search parts..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger>
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {CATEGORIES.map(cat => (
                  <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="low_stock">Low Stock</SelectItem>
                <SelectItem value="out_of_stock">Out of Stock</SelectItem>
                <SelectItem value="discontinued">Discontinued</SelectItem>
              </SelectContent>
            </Select>

            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger>
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="name">Name</SelectItem>
                <SelectItem value="quantity">Quantity</SelectItem>
                <SelectItem value="value">Total Value</SelectItem>
                <SelectItem value="status">Status</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Parts List */}
      <div className="grid grid-cols-1 gap-4">
        {filteredParts.map(part => (
          <Card key={part.id} className={cn(
            "hover:shadow-md transition-shadow",
            part.status === 'low_stock' && "border-orange-300",
            part.status === 'out_of_stock' && "border-red-300"
          )}>
            <CardContent className="pt-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold text-slate-900">{part.name}</h3>
                    {part.sku && (
                      <Badge variant="outline" className="text-xs">
                        SKU: {part.sku}
                      </Badge>
                    )}
                    <Badge className={cn(
                      part.status === 'active' && "bg-green-100 text-green-700",
                      part.status === 'low_stock' && "bg-orange-100 text-orange-700",
                      part.status === 'out_of_stock' && "bg-red-100 text-red-700",
                      part.status === 'discontinued' && "bg-slate-100 text-slate-700"
                    )}>
                      {part.status?.replace('_', ' ')}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-3">
                    <div>
                      <p className="text-xs text-slate-500">Quantity</p>
                      <p className="text-sm font-medium text-slate-900">
                        {part.quantity_on_hand} {part.unit_of_measure}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Category</p>
                      <p className="text-sm font-medium text-slate-900 capitalize">
                        {part.category?.replace('_', ' ')}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Location</p>
                      <p className="text-sm font-medium text-slate-900">
                        {part.location || 'N/A'}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Total Value</p>
                      <p className="text-sm font-medium text-slate-900">
                        ${(part.total_value || 0).toFixed(2)}
                      </p>
                    </div>
                  </div>

                  {part.reorder_point && part.quantity_on_hand <= part.reorder_point && (
                    <div className="mt-3 p-2 bg-orange-50 border border-orange-200 rounded-lg flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-orange-600" />
                      <span className="text-xs text-orange-900">
                        Below reorder point ({part.reorder_point}). Suggested reorder: {part.reorder_quantity}
                      </span>
                    </div>
                  )}
                </div>

                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => handleEditPart(part)}>
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => handleAddTransaction(part)}>
                    <ArrowUpDown className="h-4 w-4 mr-1" />
                    Transaction
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {filteredParts.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center">
              <Package className="h-12 w-12 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-600">No parts found</p>
              <p className="text-sm text-slate-500 mt-1">Add your first part to get started</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Part Dialog */}
      <Dialog open={showPartDialog} onOpenChange={setShowPartDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingPart ? 'Edit Part' : 'Add New Part'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmitPart} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label>Part Name *</Label>
                <Input
                  value={partForm.name}
                  onChange={(e) => setPartForm({ ...partForm, name: e.target.value })}
                  required
                />
              </div>

              <div>
                <Label>SKU / Part Number</Label>
                <Input
                  value={partForm.sku}
                  onChange={(e) => setPartForm({ ...partForm, sku: e.target.value })}
                />
              </div>

              <div>
                <Label>Category *</Label>
                <Select value={partForm.category} onValueChange={(v) => setPartForm({ ...partForm, category: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map(cat => (
                      <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="col-span-2">
                <Label>Description</Label>
                <Textarea
                  value={partForm.description}
                  onChange={(e) => setPartForm({ ...partForm, description: e.target.value })}
                  rows={2}
                />
              </div>

              <div>
                <Label>Manufacturer</Label>
                <Input
                  value={partForm.manufacturer}
                  onChange={(e) => setPartForm({ ...partForm, manufacturer: e.target.value })}
                />
              </div>

              <div>
                <Label>Model Number</Label>
                <Input
                  value={partForm.model_number}
                  onChange={(e) => setPartForm({ ...partForm, model_number: e.target.value })}
                />
              </div>

              <div>
                <Label>Quantity on Hand</Label>
                <Input
                  type="number"
                  value={partForm.quantity_on_hand}
                  onChange={(e) => setPartForm({ ...partForm, quantity_on_hand: parseFloat(e.target.value) || 0 })}
                />
              </div>

              <div>
                <Label>Unit of Measure</Label>
                <Select value={partForm.unit_of_measure} onValueChange={(v) => setPartForm({ ...partForm, unit_of_measure: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {UNITS.map(unit => (
                      <SelectItem key={unit.value} value={unit.value}>{unit.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Unit Cost ($)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={partForm.unit_cost}
                  onChange={(e) => setPartForm({ ...partForm, unit_cost: parseFloat(e.target.value) || 0 })}
                />
              </div>

              <div>
                <Label>Storage Location</Label>
                <Input
                  value={partForm.location}
                  onChange={(e) => setPartForm({ ...partForm, location: e.target.value })}
                  placeholder="e.g., Warehouse A, Shelf 5"
                />
              </div>

              <div>
                <Label>Reorder Point</Label>
                <Input
                  type="number"
                  value={partForm.reorder_point}
                  onChange={(e) => setPartForm({ ...partForm, reorder_point: parseFloat(e.target.value) || 0 })}
                />
              </div>

              <div>
                <Label>Reorder Quantity</Label>
                <Input
                  type="number"
                  value={partForm.reorder_quantity}
                  onChange={(e) => setPartForm({ ...partForm, reorder_quantity: parseFloat(e.target.value) || 0 })}
                />
              </div>

              <div>
                <Label>Supplier</Label>
                <Input
                  value={partForm.supplier}
                  onChange={(e) => setPartForm({ ...partForm, supplier: e.target.value })}
                />
              </div>

              <div>
                <Label>Supplier Contact</Label>
                <Input
                  value={partForm.supplier_contact}
                  onChange={(e) => setPartForm({ ...partForm, supplier_contact: e.target.value })}
                />
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => {
                setShowPartDialog(false);
                setEditingPart(null);
                resetPartForm();
              }}>
                Cancel
              </Button>
              <Button type="submit" disabled={createPartMutation.isPending || updatePartMutation.isPending}>
                {editingPart ? 'Update' : 'Create'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Transaction Dialog */}
      <Dialog open={showTransactionDialog} onOpenChange={setShowTransactionDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record Transaction - {selectedPart?.name}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmitTransaction} className="space-y-4">
            <div>
              <Label>Transaction Type *</Label>
              <Select value={transactionForm.transaction_type} onValueChange={(v) => setTransactionForm({ ...transactionForm, transaction_type: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="purchase">Purchase (Add Stock)</SelectItem>
                  <SelectItem value="usage">Usage (Remove Stock)</SelectItem>
                  <SelectItem value="adjustment">Adjustment</SelectItem>
                  <SelectItem value="transfer">Transfer</SelectItem>
                  <SelectItem value="return">Return</SelectItem>
                  <SelectItem value="waste">Waste/Discard</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Quantity *</Label>
              <Input
                type="number"
                value={transactionForm.quantity}
                onChange={(e) => setTransactionForm({ ...transactionForm, quantity: parseFloat(e.target.value) || 0 })}
                required
              />
              <p className="text-xs text-slate-500 mt-1">
                Current stock: {selectedPart?.quantity_on_hand} {selectedPart?.unit_of_measure}
              </p>
            </div>

            <div>
              <Label>Unit Cost ($)</Label>
              <Input
                type="number"
                step="0.01"
                value={transactionForm.unit_cost}
                onChange={(e) => setTransactionForm({ ...transactionForm, unit_cost: parseFloat(e.target.value) || 0 })}
              />
            </div>

            {transactionForm.transaction_type === 'purchase' && (
              <>
                <div>
                  <Label>Supplier</Label>
                  <Input
                    value={transactionForm.supplier}
                    onChange={(e) => setTransactionForm({ ...transactionForm, supplier: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Purchase Order Number</Label>
                  <Input
                    value={transactionForm.purchase_order_number}
                    onChange={(e) => setTransactionForm({ ...transactionForm, purchase_order_number: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Invoice Number</Label>
                  <Input
                    value={transactionForm.invoice_number}
                    onChange={(e) => setTransactionForm({ ...transactionForm, invoice_number: e.target.value })}
                  />
                </div>
              </>
            )}

            <div>
              <Label>Notes</Label>
              <Textarea
                value={transactionForm.notes}
                onChange={(e) => setTransactionForm({ ...transactionForm, notes: e.target.value })}
                rows={3}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => {
                setShowTransactionDialog(false);
                setSelectedPart(null);
                resetTransactionForm();
              }}>
                Cancel
              </Button>
              <Button type="submit" disabled={createTransactionMutation.isPending}>
                Record Transaction
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}