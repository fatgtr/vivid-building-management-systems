import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { DollarSign, CreditCard, Download, Plus, Loader2, Calendar, CheckCircle2, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { createPageUrl } from '@/utils';

export default function LevyPaymentManager({ buildingId }) {
  const [showDialog, setShowDialog] = useState(false);
  const [formData, setFormData] = useState({
    unit_id: '',
    period: '',
    quarter: 'Q1',
    year: new Date().getFullYear(),
    amount: '',
    admin_fund: '',
    sinking_fund: '',
    due_date: ''
  });

  const queryClient = useQueryClient();

  const { data: levies = [], isLoading } = useQuery({
    queryKey: ['levies', buildingId],
    queryFn: () => base44.entities.LevyPayment.filter(
      buildingId ? { building_id: buildingId } : {},
      '-created_date'
    ),
  });

  const { data: units = [] } = useQuery({
    queryKey: ['units', buildingId],
    queryFn: () => base44.entities.Unit.filter(buildingId ? { building_id: buildingId } : {}),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.LevyPayment.create({
      ...data,
      building_id: buildingId,
      amount: parseFloat(data.amount),
      admin_fund: data.admin_fund ? parseFloat(data.admin_fund) : null,
      sinking_fund: data.sinking_fund ? parseFloat(data.sinking_fund) : null,
      status: 'pending'
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['levies'] });
      setShowDialog(false);
      setFormData({
        unit_id: '',
        period: '',
        quarter: 'Q1',
        year: new Date().getFullYear(),
        amount: '',
        admin_fund: '',
        sinking_fund: '',
        due_date: ''
      });
      toast.success('Levy created successfully');
    }
  });

  const payNowMutation = useMutation({
    mutationFn: async (levyId) => {
      const { data } = await base44.functions.invoke('createLevyCheckout', {
        levyId,
        successUrl: window.location.origin + createPageUrl('PaymentSuccess'),
        cancelUrl: window.location.origin + createPageUrl('PaymentCancel')
      });
      return data;
    },
    onSuccess: (data) => {
      if (data.url) {
        window.location.href = data.url;
      }
    },
    onError: () => {
      toast.error('Failed to create checkout session');
    }
  });

  const statusColors = {
    pending: 'bg-yellow-100 text-yellow-700',
    paid: 'bg-green-100 text-green-700',
    overdue: 'bg-red-100 text-red-700',
    partial: 'bg-blue-100 text-blue-700'
  };

  const totalOutstanding = levies
    .filter(l => l.status !== 'paid')
    .reduce((sum, l) => sum + l.amount, 0);

  const totalCollected = levies
    .filter(l => l.status === 'paid')
    .reduce((sum, l) => sum + l.amount, 0);

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Total Outstanding</p>
                <p className="text-3xl font-bold text-orange-600">${totalOutstanding.toFixed(2)}</p>
              </div>
              <AlertCircle className="h-10 w-10 text-orange-600 opacity-20" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Total Collected</p>
                <p className="text-3xl font-bold text-green-600">${totalCollected.toFixed(2)}</p>
              </div>
              <CheckCircle2 className="h-10 w-10 text-green-600 opacity-20" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Total Levies</p>
                <p className="text-3xl font-bold text-blue-600">{levies.length}</p>
              </div>
              <DollarSign className="h-10 w-10 text-blue-600 opacity-20" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Actions */}
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold">Levy Payments</h2>
        <Button onClick={() => setShowDialog(true)} className="bg-blue-600">
          <Plus className="h-4 w-4 mr-2" />
          Create Levy
        </Button>
      </div>

      {/* Levies List */}
      <div className="grid gap-4">
        {levies.map(levy => (
          <Card key={levy.id}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="font-semibold text-lg">{levy.period}</h3>
                    <Badge className={statusColors[levy.status]}>
                      {levy.status}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <p className="text-slate-500">Amount</p>
                      <p className="font-semibold">${levy.amount.toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-slate-500">Due Date</p>
                      <p className="font-medium">{format(new Date(levy.due_date), 'MMM d, yyyy')}</p>
                    </div>
                    {levy.paid_date && (
                      <div>
                        <p className="text-slate-500">Paid Date</p>
                        <p className="font-medium text-green-600">
                          {format(new Date(levy.paid_date), 'MMM d, yyyy')}
                        </p>
                      </div>
                    )}
                    {levy.payment_method && (
                      <div>
                        <p className="text-slate-500">Method</p>
                        <p className="font-medium capitalize">{levy.payment_method.replace('_', ' ')}</p>
                      </div>
                    )}
                  </div>
                </div>
                {levy.status === 'pending' && (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="gap-2"
                    onClick={() => payNowMutation.mutate(levy.id)}
                    disabled={payNowMutation.isPending}
                  >
                    <CreditCard className="h-4 w-4" />
                    {payNowMutation.isPending ? 'Processing...' : 'Pay Now'}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Create Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Levy Payment</DialogTitle>
          </DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); createMutation.mutate(formData); }} className="space-y-4">
            <div>
              <Label>Unit</Label>
              <Select value={formData.unit_id} onValueChange={(v) => setFormData({ ...formData, unit_id: v })}>
                <SelectTrigger className="mt-1.5">
                  <SelectValue placeholder="Select unit" />
                </SelectTrigger>
                <SelectContent>
                  {units.map(u => (
                    <SelectItem key={u.id} value={u.id}>Unit {u.unit_number}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Quarter</Label>
                <Select value={formData.quarter} onValueChange={(v) => setFormData({ ...formData, quarter: v })}>
                  <SelectTrigger className="mt-1.5">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {['Q1', 'Q2', 'Q3', 'Q4'].map(q => (
                      <SelectItem key={q} value={q}>{q}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Year</Label>
                <Input
                  type="number"
                  value={formData.year}
                  onChange={(e) => setFormData({ ...formData, year: parseInt(e.target.value) })}
                  className="mt-1.5"
                />
              </div>
            </div>

            <div>
              <Label>Total Amount</Label>
              <Input
                type="number"
                step="0.01"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                required
                className="mt-1.5"
              />
            </div>

            <div>
              <Label>Due Date</Label>
              <Input
                type="date"
                value={formData.due_date}
                onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                required
                className="mt-1.5"
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowDialog(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Creating...</>
                ) : (
                  'Create Levy'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}