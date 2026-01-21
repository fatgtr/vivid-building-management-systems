import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useBuildingContext } from '@/components/BuildingContext';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DollarSign, TrendingUp, AlertCircle, CheckCircle, Plus, Search } from 'lucide-react';
import { format, isPast } from 'date-fns';
import { toast } from 'sonner';
import PageHeader from '@/components/common/PageHeader';

import LevyPaymentManager from '@/components/financial/LevyPaymentManager';
import { useBuildingContext } from '@/components/BuildingContext';

export default function FinancialManagement() {
  const { selectedBuildingId } = useBuildingContext();
  const { selectedBuildingId } = useBuildingContext();
  const [showDialog, setShowDialog] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    building_id: selectedBuildingId || '',
    unit_id: '',
    period: '',
    due_date: '',
    amount: '',
    admin_fund: '',
    sinking_fund: '',
    special_levy: ''
  });

  const { data: levies = [] } = useQuery({
    queryKey: ['levies', selectedBuildingId],
    queryFn: async () => {
      const all = await base44.entities.LevyPayment.list('-due_date');
      return selectedBuildingId ? all.filter(l => l.building_id === selectedBuildingId) : all;
    }
  });

  const { data: units = [] } = useQuery({
    queryKey: ['units'],
    queryFn: () => base44.entities.Unit.list()
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.LevyPayment.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['levies'] });
      setShowDialog(false);
      toast.success('Levy created');
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.LevyPayment.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['levies'] });
      toast.success('Payment recorded');
    }
  });

  const totalOutstanding = levies.filter(l => l.status !== 'paid').reduce((sum, l) => sum + (l.amount - (l.paid_amount || 0)), 0);
  const totalCollected = levies.filter(l => l.status === 'paid').reduce((sum, l) => sum + l.amount, 0);
  const overdueCount = levies.filter(l => l.status === 'overdue' || (l.status === 'pending' && isPast(new Date(l.due_date)))).length;

  const filteredLevies = levies.filter(l => {
    const unit = units.find(u => u.id === l.unit_id);
    return unit?.unit_number?.toLowerCase().includes(searchQuery.toLowerCase()) || l.period?.toLowerCase().includes(searchQuery.toLowerCase());
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Financial Management"
        subtitle="Levy payments and financial tracking"
        action={() => setShowDialog(true)}
        actionLabel="Create Levy"
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-slate-600">Total Outstanding</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <div className="p-3 bg-orange-100 rounded-lg">
                <AlertCircle className="h-6 w-6 text-orange-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">${totalOutstanding.toFixed(2)}</p>
                <p className="text-xs text-slate-500">{overdueCount} overdue</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-slate-600">Total Collected</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <div className="p-3 bg-green-100 rounded-lg">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">${totalCollected.toFixed(2)}</p>
                <p className="text-xs text-slate-500">This year</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-slate-600">Collection Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <div className="p-3 bg-blue-100 rounded-lg">
                <TrendingUp className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {((totalCollected / (totalCollected + totalOutstanding)) * 100 || 0).toFixed(1)}%
                </p>
                <p className="text-xs text-slate-500">Payment rate</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <Input
          placeholder="Search by unit or period..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50">
              <TableHead>Unit</TableHead>
              <TableHead>Period</TableHead>
              <TableHead>Due Date</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Paid</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredLevies.map((levy) => {
              const unit = units.find(u => u.id === levy.unit_id);
              return (
                <TableRow key={levy.id}>
                  <TableCell className="font-medium">Unit {unit?.unit_number}</TableCell>
                  <TableCell>{levy.period}</TableCell>
                  <TableCell>{format(new Date(levy.due_date), 'MMM d, yyyy')}</TableCell>
                  <TableCell>${levy.amount.toFixed(2)}</TableCell>
                  <TableCell>${(levy.paid_amount || 0).toFixed(2)}</TableCell>
                  <TableCell>
                    <Badge className={
                      levy.status === 'paid' ? 'bg-green-600' :
                      levy.status === 'overdue' ? 'bg-red-600' :
                      levy.status === 'partial' ? 'bg-orange-600' : 'bg-slate-600'
                    }>
                      {levy.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {levy.status !== 'paid' && (
                      <Button
                        size="sm"
                        onClick={() => updateMutation.mutate({
                          id: levy.id,
                          data: { ...levy, status: 'paid', paid_amount: levy.amount, paid_date: new Date().toISOString().split('T')[0] }
                        })}
                      >
                        Mark Paid
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
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Levy Payment</DialogTitle>
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
              <Label>Period *</Label>
              <Input
                value={formData.period}
                onChange={(e) => setFormData({ ...formData, period: e.target.value })}
                placeholder="e.g., Q1 2026"
                required
              />
            </div>
            <div>
              <Label>Due Date *</Label>
              <Input
                type="date"
                value={formData.due_date}
                onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                required
              />
            </div>
            <div>
              <Label>Total Amount *</Label>
              <Input
                type="number"
                step="0.01"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Admin Fund</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.admin_fund}
                  onChange={(e) => setFormData({ ...formData, admin_fund: e.target.value })}
                />
              </div>
              <div>
                <Label>Sinking Fund</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.sinking_fund}
                  onChange={(e) => setFormData({ ...formData, sinking_fund: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? 'Creating...' : 'Create Levy'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}