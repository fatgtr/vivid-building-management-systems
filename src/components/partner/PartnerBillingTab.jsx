import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { toast } from 'sonner';
import { DollarSign, Calendar, FileText, Download, Eye, Send } from 'lucide-react';
import { format } from 'date-fns';

export default function PartnerBillingTab({ partnerId }) {
  const [billingForm, setBillingForm] = useState({
    billing_cycle: 'monthly',
    rate_per_lot_monthly: 2.25,
    auto_billing_enabled: true,
    billing_email: '',
    payment_terms_days: 30,
    next_billing_date: '',
  });

  const queryClient = useQueryClient();

  const { data: billingConfig } = useQuery({
    queryKey: ['partnerBilling', partnerId],
    queryFn: async () => {
      const configs = await base44.entities.PartnerBilling.list();
      return configs.find(c => c.partner_id === partnerId);
    },
  });

  const { data: buildings = [] } = useQuery({
    queryKey: ['partnerBuildings', partnerId],
    queryFn: async () => {
      const allBuildings = await base44.entities.Building.list();
      return allBuildings.filter(b => b.partner_id === partnerId);
    },
  });

  const { data: invoices = [] } = useQuery({
    queryKey: ['partnerInvoices', partnerId],
    queryFn: async () => {
      const allInvoices = await base44.entities.PartnerInvoice.list('-created_date');
      return allInvoices.filter(i => i.partner_id === partnerId);
    },
  });

  React.useEffect(() => {
    if (billingConfig) {
      setBillingForm({
        billing_cycle: billingConfig.billing_cycle || 'monthly',
        rate_per_lot_monthly: billingConfig.rate_per_lot_monthly || 2.25,
        auto_billing_enabled: billingConfig.auto_billing_enabled ?? true,
        billing_email: billingConfig.billing_email || '',
        payment_terms_days: billingConfig.payment_terms_days || 30,
        next_billing_date: billingConfig.next_billing_date || '',
      });
    }
  }, [billingConfig]);

  const saveBillingMutation = useMutation({
    mutationFn: async (data) => {
      if (billingConfig) {
        return await base44.entities.PartnerBilling.update(billingConfig.id, data);
      } else {
        return await base44.entities.PartnerBilling.create({ ...data, partner_id: partnerId });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['partnerBilling', partnerId] });
      toast.success('Billing configuration saved');
    },
  });

  const generateInvoiceMutation = useMutation({
    mutationFn: async () => {
      const response = await base44.functions.invoke('generatePartnerInvoice', { partnerId });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['partnerInvoices', partnerId] });
      toast.success('Invoice generated');
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to generate invoice');
    },
  });

  const totalLots = buildings.reduce((sum, b) => sum + (b.strata_lots || 0), 0);
  const monthlyRevenue = totalLots * billingForm.rate_per_lot_monthly;
  const cycleMultiplier = billingForm.billing_cycle === 'monthly' ? 1 : billingForm.billing_cycle === 'quarterly' ? 3 : 12;
  const billingAmount = monthlyRevenue * cycleMultiplier;

  return (
    <div className="space-y-6">
      {/* Billing Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-slate-600">Total Buildings</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-slate-900">{buildings.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-slate-600">Total Lots</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-slate-900">{totalLots}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-slate-600">Monthly Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-emerald-600">${monthlyRevenue.toFixed(2)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-slate-600">Next Billing Amount</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-blue-600">${billingAmount.toFixed(2)}</p>
            <p className="text-xs text-slate-500 mt-1 capitalize">{billingForm.billing_cycle}</p>
          </CardContent>
        </Card>
      </div>

      {/* Billing Configuration */}
      <Card>
        <CardHeader>
          <CardTitle>Billing Configuration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="billing_cycle">Billing Cycle</Label>
              <Select 
                value={billingForm.billing_cycle} 
                onValueChange={(v) => setBillingForm({ ...billingForm, billing_cycle: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="quarterly">Quarterly (Every 3 months)</SelectItem>
                  <SelectItem value="yearly">Yearly (Annual)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="rate_per_lot_monthly">Rate per Lot (Monthly)</Label>
              <div className="flex items-center gap-2">
                <span className="text-slate-600">$</span>
                <Input
                  id="rate_per_lot_monthly"
                  type="number"
                  step="0.01"
                  value={billingForm.rate_per_lot_monthly}
                  onChange={(e) => setBillingForm({ ...billingForm, rate_per_lot_monthly: parseFloat(e.target.value) })}
                />
              </div>
            </div>
            <div>
              <Label htmlFor="billing_email">Billing Email</Label>
              <Input
                id="billing_email"
                type="email"
                value={billingForm.billing_email}
                onChange={(e) => setBillingForm({ ...billingForm, billing_email: e.target.value })}
                placeholder="billing@partner.com"
              />
            </div>
            <div>
              <Label htmlFor="payment_terms_days">Payment Terms (Days)</Label>
              <Input
                id="payment_terms_days"
                type="number"
                value={billingForm.payment_terms_days}
                onChange={(e) => setBillingForm({ ...billingForm, payment_terms_days: parseInt(e.target.value) })}
                placeholder="30"
              />
            </div>
            <div>
              <Label htmlFor="next_billing_date">Next Billing Date</Label>
              <Input
                id="next_billing_date"
                type="date"
                value={billingForm.next_billing_date}
                onChange={(e) => setBillingForm({ ...billingForm, next_billing_date: e.target.value })}
              />
            </div>
            <div className="flex items-center gap-2">
              <Switch
                id="auto_billing"
                checked={billingForm.auto_billing_enabled}
                onCheckedChange={(v) => setBillingForm({ ...billingForm, auto_billing_enabled: v })}
              />
              <Label htmlFor="auto_billing">Enable Automatic Billing</Label>
            </div>
          </div>
          <Button onClick={() => saveBillingMutation.mutate(billingForm)} disabled={saveBillingMutation.isPending}>
            Save Billing Configuration
          </Button>
        </CardContent>
      </Card>

      {/* Building Breakdown */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Building Breakdown</CardTitle>
          <Button size="sm" onClick={() => generateInvoiceMutation.mutate()} disabled={generateInvoiceMutation.isPending}>
            <FileText className="h-4 w-4 mr-2" />
            Generate Invoice
          </Button>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {buildings.map((building) => (
              <div key={building.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                <div>
                  <p className="font-medium text-slate-900">{building.name}</p>
                  <p className="text-sm text-slate-500">{building.strata_plan_number}</p>
                </div>
                <div className="text-right">
                  <p className="font-medium text-slate-900">{building.strata_lots || 0} lots</p>
                  <p className="text-sm text-emerald-600">
                    ${((building.strata_lots || 0) * billingForm.rate_per_lot_monthly * cycleMultiplier).toFixed(2)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Recent Invoices */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Invoices</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {invoices.slice(0, 10).map((invoice) => (
              <div key={invoice.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-slate-50">
                <div className="flex items-center gap-3">
                  <FileText className="h-5 w-5 text-slate-400" />
                  <div>
                    <p className="font-medium text-slate-900">{invoice.invoice_number}</p>
                    <p className="text-sm text-slate-500">
                      {format(new Date(invoice.billing_period_start), 'MMM d')} - {format(new Date(invoice.billing_period_end), 'MMM d, yyyy')}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className="font-medium text-slate-900">${invoice.total_amount?.toFixed(2)}</p>
                    <Badge variant={invoice.status === 'paid' ? 'default' : invoice.status === 'overdue' ? 'destructive' : 'secondary'}>
                      {invoice.status}
                    </Badge>
                  </div>
                  <Button size="sm" variant="ghost">
                    <Download className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
            {invoices.length === 0 && (
              <p className="text-center text-slate-500 py-8">No invoices yet</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}