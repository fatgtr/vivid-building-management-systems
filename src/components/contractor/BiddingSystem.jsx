import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { DollarSign, Clock, FileText, CheckCircle, X, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

export default function BiddingSystem({ workOrderId, contractorId, onBidSubmitted }) {
  const [showBidDialog, setShowBidDialog] = useState(false);
  const [bidData, setBidData] = useState({
    estimated_cost: '',
    estimated_hours: '',
    materials_cost: '',
    labor_cost: '',
    timeline_days: '',
    bid_notes: '',
    scope_of_work: ''
  });
  const queryClient = useQueryClient();

  const { data: workOrder } = useQuery({
    queryKey: ['workOrder', workOrderId],
    queryFn: () => base44.entities.WorkOrder.get(workOrderId),
    enabled: !!workOrderId
  });

  const { data: existingBids = [] } = useQuery({
    queryKey: ['bids', workOrderId],
    queryFn: async () => {
      const tasks = await base44.entities.Task.filter({ 
        work_order_id: workOrderId,
        task_type: 'bid_proposal'
      });
      return tasks;
    },
    enabled: !!workOrderId
  });

  const myBid = existingBids.find(b => b.assigned_to_contractor_id === contractorId);
  const allBids = existingBids.filter(b => b.status !== 'rejected');

  const submitBidMutation = useMutation({
    mutationFn: async (data) => {
      return await base44.entities.Task.create({
        work_order_id: workOrderId,
        building_id: workOrder.building_id,
        assigned_to_contractor_id: contractorId,
        task_type: 'bid_proposal',
        title: `Bid Proposal for ${workOrder.title}`,
        description: data.scope_of_work,
        status: 'pending',
        estimated_cost: parseFloat(data.estimated_cost),
        estimated_hours: parseFloat(data.estimated_hours),
        due_date: new Date(Date.now() + data.timeline_days * 24 * 60 * 60 * 1000).toISOString(),
        metadata: {
          materials_cost: parseFloat(data.materials_cost),
          labor_cost: parseFloat(data.labor_cost),
          timeline_days: parseInt(data.timeline_days),
          bid_notes: data.bid_notes,
          submitted_date: new Date().toISOString()
        }
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bids'] });
      setShowBidDialog(false);
      toast.success('Bid submitted successfully!');
      onBidSubmitted?.();
    },
    onError: () => {
      toast.error('Failed to submit bid');
    }
  });

  const updateBidMutation = useMutation({
    mutationFn: async ({ bidId, updates }) => {
      return await base44.entities.Task.update(bidId, updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bids'] });
      toast.success('Bid updated');
    }
  });

  const handleSubmitBid = (e) => {
    e.preventDefault();
    submitBidMutation.mutate(bidData);
  };

  const getBidStatusColor = (status) => {
    switch (status) {
      case 'approved': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-slate-100 text-slate-800';
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Bidding Status</CardTitle>
            {!myBid && (
              <Button onClick={() => setShowBidDialog(true)} size="sm">
                <DollarSign className="h-4 w-4 mr-2" />
                Submit Bid
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {myBid ? (
            <div className="space-y-4">
              <div className="p-4 border border-slate-200 rounded-lg bg-slate-50">
                <div className="flex items-center justify-between mb-3">
                  <Badge className={getBidStatusColor(myBid.status)}>
                    {myBid.status || 'pending'}
                  </Badge>
                  <p className="text-sm text-slate-500">
                    Submitted {format(new Date(myBid.created_date), 'MMM d, yyyy')}
                  </p>
                </div>
                
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <p className="text-xs text-slate-500">Bid Amount</p>
                    <p className="text-2xl font-bold text-slate-900">
                      ${myBid.estimated_cost?.toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Timeline</p>
                    <p className="text-2xl font-bold text-slate-900">
                      {myBid.metadata?.timeline_days} days
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-slate-500">Materials</p>
                    <p className="font-semibold">${myBid.metadata?.materials_cost?.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-slate-500">Labor</p>
                    <p className="font-semibold">${myBid.metadata?.labor_cost?.toLocaleString()}</p>
                  </div>
                </div>

                {myBid.metadata?.bid_notes && (
                  <div className="mt-4 pt-4 border-t border-slate-200">
                    <p className="text-xs text-slate-500 mb-1">Notes</p>
                    <p className="text-sm text-slate-700">{myBid.metadata.bid_notes}</p>
                  </div>
                )}
              </div>

              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => {
                    setBidData({
                      estimated_cost: myBid.estimated_cost?.toString(),
                      estimated_hours: myBid.estimated_hours?.toString(),
                      materials_cost: myBid.metadata?.materials_cost?.toString(),
                      labor_cost: myBid.metadata?.labor_cost?.toString(),
                      timeline_days: myBid.metadata?.timeline_days?.toString(),
                      bid_notes: myBid.metadata?.bid_notes || '',
                      scope_of_work: myBid.description
                    });
                    setShowBidDialog(true);
                  }}
                >
                  Update Bid
                </Button>
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <DollarSign className="h-12 w-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-600 mb-2">No bid submitted yet</p>
              <p className="text-sm text-slate-500">Submit your bid to compete for this job</p>
            </div>
          )}
        </CardContent>
      </Card>

      {allBids.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Competing Bids ({allBids.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {allBids.map((bid) => (
                <div key={bid.id} className="p-3 border border-slate-200 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge className={getBidStatusColor(bid.status)}>
                        {bid.status || 'pending'}
                      </Badge>
                      {bid.assigned_to_contractor_id === contractorId && (
                        <Badge variant="outline">Your Bid</Badge>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-slate-900">
                        ${bid.estimated_cost?.toLocaleString()}
                      </p>
                      <p className="text-xs text-slate-500">
                        {bid.metadata?.timeline_days} days
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Dialog open={showBidDialog} onOpenChange={setShowBidDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{myBid ? 'Update' : 'Submit'} Bid Proposal</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmitBid} className="space-y-4">
            <div>
              <Label>Scope of Work *</Label>
              <Textarea
                value={bidData.scope_of_work}
                onChange={(e) => setBidData({ ...bidData, scope_of_work: e.target.value })}
                placeholder="Describe what work will be performed..."
                rows={4}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Materials Cost *</Label>
                <Input
                  type="number"
                  value={bidData.materials_cost}
                  onChange={(e) => setBidData({ ...bidData, materials_cost: e.target.value })}
                  placeholder="0.00"
                  step="0.01"
                  required
                />
              </div>
              <div>
                <Label>Labor Cost *</Label>
                <Input
                  type="number"
                  value={bidData.labor_cost}
                  onChange={(e) => setBidData({ ...bidData, labor_cost: e.target.value })}
                  placeholder="0.00"
                  step="0.01"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Total Bid Amount *</Label>
                <Input
                  type="number"
                  value={bidData.estimated_cost || (
                    parseFloat(bidData.materials_cost || 0) + parseFloat(bidData.labor_cost || 0)
                  ).toFixed(2)}
                  onChange={(e) => setBidData({ ...bidData, estimated_cost: e.target.value })}
                  placeholder="0.00"
                  step="0.01"
                  required
                />
              </div>
              <div>
                <Label>Estimated Hours *</Label>
                <Input
                  type="number"
                  value={bidData.estimated_hours}
                  onChange={(e) => setBidData({ ...bidData, estimated_hours: e.target.value })}
                  placeholder="0"
                  required
                />
              </div>
            </div>

            <div>
              <Label>Timeline (Days) *</Label>
              <Input
                type="number"
                value={bidData.timeline_days}
                onChange={(e) => setBidData({ ...bidData, timeline_days: e.target.value })}
                placeholder="7"
                required
              />
            </div>

            <div>
              <Label>Additional Notes</Label>
              <Textarea
                value={bidData.bid_notes}
                onChange={(e) => setBidData({ ...bidData, bid_notes: e.target.value })}
                placeholder="Any additional information..."
                rows={3}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowBidDialog(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitBidMutation.isPending}>
                {submitBidMutation.isPending ? 'Submitting...' : myBid ? 'Update Bid' : 'Submit Bid'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}