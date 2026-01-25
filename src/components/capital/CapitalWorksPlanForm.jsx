import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import CapitalWorksPlanLinksPanel from './CapitalWorksPlanLinksPanel';
import { Plus, Trash2, Save, FileText, DollarSign, TrendingUp } from 'lucide-react';
import { toast } from 'sonner';

const CATEGORIES = [
  { value: 'structural_components', label: 'Structural Components' },
  { value: 'exterior_materials_finishes', label: 'Exterior Materials and Finishes' },
  { value: 'doors_windows', label: 'Doors and Windows' },
  { value: 'roofing', label: 'Roofing' },
  { value: 'electrical_system', label: 'Electrical System' },
  { value: 'plumbing_system', label: 'Plumbing System' },
  { value: 'hvac', label: 'HVAC' },
  { value: 'fire_safety_systems', label: 'Fire Safety Systems' },
  { value: 'elevators_escalators_travelators', label: 'Elevators, Escalators and Travelators' },
  { value: 'technology_communication', label: 'Technology and Communication' },
  { value: 'security_alarms', label: 'Security Alarms' },
  { value: 'accessibility_infrastructure', label: 'Accessibility Infrastructure' },
  { value: 'landscaping_exterior', label: 'Landscaping and Exterior Elements' },
  { value: 'amenities_facilities', label: 'Amenities and Facilities' },
  { value: 'furnishings_fixtures', label: 'Furnishings and Fixtures' },
  { value: 'car_parking_area', label: 'Car Parking Areas Components' },
  { value: 'waterproofing_systems', label: 'Waterproofing Systems' },
  { value: 'other', label: 'Other Category' }
];

export default function CapitalWorksPlanForm({ buildingId, building, existingPlan, onClose }) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState(existingPlan || {
    building_id: buildingId,
    strata_plan_number: building?.strata_plan_number || '',
    registration_date: '',
    number_of_unit_entitlements: building?.total_units || 0,
    number_of_lots: building?.strata_lots || 0,
    opening_balance: 0,
    start_date: new Date().toISOString().split('T')[0],
    gst_status: 'registered',
    current_levy_per_unit_entitlement: 0,
    inflation_rate: 3.5,
    expenditure_items: [],
    contingency_allowance_percentage: 10,
    status: 'draft',
    notes: ''
  });

  const saveMutation = useMutation({
    mutationFn: (data) => {
      return existingPlan 
        ? base44.entities.CapitalWorksPlan.update(existingPlan.id, data)
        : base44.entities.CapitalWorksPlan.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['capitalWorksPlans'] });
      toast.success(existingPlan ? 'Plan updated' : 'Plan created');
      if (onClose) onClose();
    },
    onError: (error) => {
      toast.error('Failed to save: ' + error.message);
    }
  });

  const addExpenditureItem = (category) => {
    const newItem = {
      category,
      item_name: '',
      proposed_work: '',
      current_cost: 0,
      year_1_cost: 0,
      year_2_cost: 0,
      year_3_cost: 0,
      year_4_cost: 0,
      year_5_cost: 0,
      year_6_cost: 0,
      year_7_cost: 0,
      year_8_cost: 0,
      year_9_cost: 0,
      year_10_cost: 0
    };
    setFormData({
      ...formData,
      expenditure_items: [...formData.expenditure_items, newItem]
    });
  };

  const updateExpenditureItem = (index, field, value) => {
    const updated = [...formData.expenditure_items];
    updated[index] = { ...updated[index], [field]: value };
    setFormData({ ...formData, expenditure_items: updated });
  };

  const removeExpenditureItem = (index) => {
    setFormData({
      ...formData,
      expenditure_items: formData.expenditure_items.filter((_, i) => i !== index)
    });
  };

  const calculateTotals = () => {
    const totals = { year_1: 0, year_2: 0, year_3: 0, year_4: 0, year_5: 0, year_6: 0, year_7: 0, year_8: 0, year_9: 0, year_10: 0 };
    formData.expenditure_items.forEach(item => {
      for (let i = 1; i <= 10; i++) {
        totals[`year_${i}`] += item[`year_${i}_cost`] || 0;
      }
    });
    return totals;
  };

  const calculateInflatedCost = (currentCost, year) => {
    return currentCost * Math.pow(1 + (formData.inflation_rate / 100), year);
  };

  const autoCalculateCosts = (index) => {
    const item = formData.expenditure_items[index];
    if (item.current_cost > 0) {
      const updated = [...formData.expenditure_items];
      for (let i = 1; i <= 10; i++) {
        updated[index][`year_${i}_cost`] = calculateInflatedCost(item.current_cost, i);
      }
      setFormData({ ...formData, expenditure_items: updated });
      toast.success('Costs calculated with inflation');
    }
  };

  const totals = calculateTotals();

  return (
    <div className="space-y-6">
      <Tabs defaultValue="details" className="w-full">
        <TabsList>
          <TabsTrigger value="details">Plan Details</TabsTrigger>
          <TabsTrigger value="expenditure">Expenditure Items</TabsTrigger>
          {existingPlan && <TabsTrigger value="links">Linked Items</TabsTrigger>}
        </TabsList>

        <TabsContent value="details" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                10-Year Capital Works Fund Plan
              </CardTitle>
              <CardDescription>
                NSW prescribed form under clause 17I of the Strata Schemes Management Regulation 2016
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <h3 className="text-lg font-semibold">1. Scheme Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Strata Plan Number</Label>
                  <Input
                    value={formData.strata_plan_number}
                    onChange={(e) => setFormData({ ...formData, strata_plan_number: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Registration Date</Label>
                  <Input
                    type="date"
                    value={formData.registration_date}
                    onChange={(e) => setFormData({ ...formData, registration_date: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Number of Unit Entitlements</Label>
                  <Input
                    type="number"
                    value={formData.number_of_unit_entitlements}
                    onChange={(e) => setFormData({ ...formData, number_of_unit_entitlements: parseFloat(e.target.value) })}
                  />
                </div>
                <div>
                  <Label>Number of Lots</Label>
                  <Input
                    type="number"
                    value={formData.number_of_lots}
                    onChange={(e) => setFormData({ ...formData, number_of_lots: parseInt(e.target.value) })}
                  />
                </div>
                <div>
                  <Label>Opening Capital Works Fund Balance ($)</Label>
                  <Input
                    type="number"
                    value={formData.opening_balance}
                    onChange={(e) => setFormData({ ...formData, opening_balance: parseFloat(e.target.value) })}
                  />
                </div>
                <div>
                  <Label>Start Date of Plan</Label>
                  <Input
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                  />
                </div>
                <div>
                  <Label>GST Status</Label>
                  <Select value={formData.gst_status} onValueChange={(v) => setFormData({ ...formData, gst_status: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="registered">Registered</SelectItem>
                      <SelectItem value="unregistered">Unregistered</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Current Levy per Unit Entitlement (incl. GST)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.current_levy_per_unit_entitlement}
                    onChange={(e) => setFormData({ ...formData, current_levy_per_unit_entitlement: parseFloat(e.target.value) })}
                  />
                </div>
                <div>
                  <Label>Assumed Inflation Rate (%)</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={formData.inflation_rate}
                    onChange={(e) => setFormData({ ...formData, inflation_rate: parseFloat(e.target.value) })}
                  />
                </div>
                <div>
                  <Label>Contingency Allowance (%)</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={formData.contingency_allowance_percentage}
                    onChange={(e) => setFormData({ ...formData, contingency_allowance_percentage: parseFloat(e.target.value) })}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="expenditure" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>2. Anticipated Expenditure: Years 1-10</CardTitle>
                <Badge variant="outline">
                  {formData.expenditure_items.length} items
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <Tabs defaultValue="structural_components" className="w-full">
                <ScrollArea className="w-full" orientation="horizontal">
                  <TabsList className="inline-flex w-max h-auto p-1 mb-2">
                    {CATEGORIES.map(cat => (
                      <TabsTrigger key={cat.value} value={cat.value} className="text-xs whitespace-nowrap">
                        {cat.label}
                      </TabsTrigger>
                    ))}
                  </TabsList>
                </ScrollArea>

                {CATEGORIES.map(category => (
                  <TabsContent key={category.value} value={category.value} className="space-y-3">
                    {formData.expenditure_items
                      .map((item, index) => ({ item, index }))
                      .filter(({ item }) => item.category === category.value)
                      .map(({ item, index }) => (
                        <Card key={index}>
                          <CardContent className="p-4 space-y-3">
                            <div className="flex justify-between items-start">
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 flex-1">
                                <div>
                                  <Label className="text-xs">Item Name</Label>
                                  <Input
                                    value={item.item_name}
                                    onChange={(e) => updateExpenditureItem(index, 'item_name', e.target.value)}
                                    placeholder="e.g., Steel beams"
                                  />
                                </div>
                                <div className="md:col-span-2">
                                  <Label className="text-xs">Proposed Work</Label>
                                  <Input
                                    value={item.proposed_work}
                                    onChange={(e) => updateExpenditureItem(index, 'proposed_work', e.target.value)}
                                    placeholder="Details of work to be done"
                                  />
                                </div>
                              </div>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => removeExpenditureItem(index)}
                                className="text-red-600"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                            
                            <div className="grid grid-cols-2 md:grid-cols-6 gap-2">
                              <div>
                                <Label className="text-xs">Current Cost ($)</Label>
                                <div className="flex gap-1">
                                  <Input
                                    type="number"
                                    step="0.01"
                                    value={item.current_cost}
                                    onChange={(e) => updateExpenditureItem(index, 'current_cost', parseFloat(e.target.value))}
                                  />
                                  <Button
                                    variant="outline"
                                    size="icon"
                                    onClick={() => autoCalculateCosts(index)}
                                    title="Auto-calculate with inflation"
                                  >
                                    <TrendingUp className="h-3 w-3" />
                                  </Button>
                                </div>
                              </div>
                              {[1, 2, 3, 4, 5].map(year => (
                                <div key={year}>
                                  <Label className="text-xs">Year {year} ($)</Label>
                                  <Input
                                    type="number"
                                    step="0.01"
                                    value={item[`year_${year}_cost`]}
                                    onChange={(e) => updateExpenditureItem(index, `year_${year}_cost`, parseFloat(e.target.value))}
                                  />
                                </div>
                              ))}
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                              {[6, 7, 8, 9, 10].map(year => (
                                <div key={year}>
                                  <Label className="text-xs">Year {year} ($)</Label>
                                  <Input
                                    type="number"
                                    step="0.01"
                                    value={item[`year_${year}_cost`]}
                                    onChange={(e) => updateExpenditureItem(index, `year_${year}_cost`, parseFloat(e.target.value))}
                                  />
                                </div>
                              ))}
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    
                    <Button
                      variant="outline"
                      onClick={() => addExpenditureItem(category.value)}
                      className="w-full"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Item to {category.label}
                    </Button>
                  </TabsContent>
                ))}
              </Tabs>

              <Card className="bg-blue-50 border-blue-200">
                <CardContent className="p-4">
                  <h4 className="font-semibold mb-3 flex items-center gap-2">
                    <DollarSign className="h-4 w-4" />
                    Total Anticipated Expenditure (Excluding Contingency)
                  </h4>
                  <div className="grid grid-cols-5 md:grid-cols-10 gap-2 text-sm">
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(year => (
                      <div key={year} className="text-center">
                        <div className="text-xs text-slate-600">Y{year}</div>
                        <div className="font-semibold">${totals[`year_${year}`].toLocaleString()}</div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </CardContent>
          </Card>
        </TabsContent>

        {existingPlan && (
          <TabsContent value="links">
            <CapitalWorksPlanLinksPanel
              planId={existingPlan.id}
              buildingId={buildingId}
              linkedDocuments={formData.documents || []}
              linkedAssets={formData.related_asset_ids || []}
              onUpdate={() => queryClient.invalidateQueries({ queryKey: ['capitalWorksPlans'] })}
            />
          </TabsContent>
        )}
      </Tabs>

      <Card>
        <CardContent className="p-6 space-y-4">
          <div>
            <Label>Additional Notes</Label>
            <Textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={3}
              placeholder="Any additional information about the plan..."
            />
          </div>

          <div className="flex gap-3 justify-end pt-4 border-t">
            {onClose && (
              <Button variant="outline" onClick={onClose}>
                Cancel
              </Button>
            )}
            <Button
              onClick={() => saveMutation.mutate({ ...formData, status: 'draft' })}
              disabled={saveMutation.isPending}
              variant="outline"
            >
              <Save className="h-4 w-4 mr-2" />
              Save as Draft
            </Button>
            <Button
              onClick={() => saveMutation.mutate({ ...formData, status: 'approved' })}
              disabled={saveMutation.isPending}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Save className="h-4 w-4 mr-2" />
              Save and Submit for Approval
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}