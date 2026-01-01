import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Sparkles,
  FileText,
  DollarSign,
  Clock,
  Wrench,
  CheckCircle,
  Edit,
  Save,
  Loader2,
  Download
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

export default function BidProposalGenerator({ workOrder, contractorId, onClose, onSubmit }) {
  const [proposal, setProposal] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editedProposal, setEditedProposal] = useState(null);

  const generateMutation = useMutation({
    mutationFn: () => base44.functions.invoke('generateBidProposal', {
      work_order_id: workOrder.id,
      contractor_id: contractorId
    }),
    onSuccess: (response) => {
      setProposal(response.data.proposal);
      setEditedProposal(JSON.parse(JSON.stringify(response.data.proposal)));
      toast.success('Proposal generated successfully!');
    },
    onError: (error) => {
      toast.error('Failed to generate proposal: ' + error.message);
    }
  });

  const handleGenerate = () => {
    generateMutation.mutate();
  };

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleSaveEdit = () => {
    setProposal(JSON.parse(JSON.stringify(editedProposal)));
    setIsEditing(false);
    toast.success('Changes saved');
  };

  const handleSubmit = () => {
    if (onSubmit) {
      onSubmit(isEditing ? editedProposal : proposal);
    }
  };

  const handleDownload = () => {
    const proposalText = formatProposalAsText(isEditing ? editedProposal : proposal);
    const blob = new Blob([proposalText], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Proposal-${workOrder.title.replace(/[^a-z0-9]/gi, '_')}-${format(new Date(), 'yyyy-MM-dd')}.txt`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    a.remove();
    toast.success('Proposal downloaded');
  };

  const formatProposalAsText = (prop) => {
    return `
BID PROPOSAL
============

Work Order: ${workOrder.title}
Date: ${format(new Date(), 'MMMM dd, yyyy')}

EXECUTIVE SUMMARY
-----------------
${prop.executive_summary}

SCOPE OF WORK
-------------
${prop.scope_of_work.map((item, i) => `${i + 1}. ${item}`).join('\n')}

MATERIALS REQUIRED
------------------
${prop.materials_required.map(m => `- ${m.item} (${m.quantity}): $${m.estimated_cost.toFixed(2)}`).join('\n')}

LABOR BREAKDOWN
---------------
Hours: ${prop.labor_breakdown.hours}
Rate per Hour: $${prop.labor_breakdown.rate_per_hour.toFixed(2)}
Total Labor Cost: $${prop.labor_breakdown.total_labor_cost.toFixed(2)}

TIMELINE
--------
Estimated Duration: ${prop.timeline.estimated_duration}
Proposed Start Date: ${prop.timeline.start_date}
Expected Completion: ${prop.timeline.completion_date}

COST BREAKDOWN
--------------
Materials: $${prop.cost_breakdown.materials_cost.toFixed(2)}
Labor: $${prop.cost_breakdown.labor_cost.toFixed(2)}
Equipment: $${prop.cost_breakdown.equipment_cost.toFixed(2)}
Contingency (10%): $${prop.cost_breakdown.contingency.toFixed(2)}
Subtotal: $${prop.cost_breakdown.subtotal.toFixed(2)}
GST (10%): $${prop.cost_breakdown.gst.toFixed(2)}
TOTAL: $${prop.cost_breakdown.total.toFixed(2)}

TERMS AND CONDITIONS
--------------------
${prop.terms_and_conditions.map((term, i) => `${i + 1}. ${term}`).join('\n')}

ADDITIONAL NOTES
----------------
${prop.notes}
    `.trim();
  };

  const currentProposal = isEditing ? editedProposal : proposal;

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-blue-600" />
            AI Bid Proposal Generator
          </DialogTitle>
          <DialogDescription>
            Generate a professional bid proposal for: {workOrder.title}
          </DialogDescription>
        </DialogHeader>

        {!proposal ? (
          <Card className="border-2 border-dashed">
            <CardContent className="pt-6 text-center">
              <Sparkles className="h-12 w-12 text-blue-600 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Generate AI-Powered Proposal</h3>
              <p className="text-sm text-slate-600 mb-4">
                Our AI will analyze the work order details, historical data, and market rates
                to create a comprehensive bid proposal including scope, timeline, and pricing.
              </p>
              <Button
                onClick={handleGenerate}
                disabled={generateMutation.isPending}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {generateMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Generating Proposal...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    Generate Proposal
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {/* Actions Bar */}
            <div className="flex items-center justify-between">
              <div className="flex gap-2">
                {!isEditing ? (
                  <Button variant="outline" size="sm" onClick={handleEdit}>
                    <Edit className="h-4 w-4 mr-2" />
                    Edit Proposal
                  </Button>
                ) : (
                  <Button variant="outline" size="sm" onClick={handleSaveEdit}>
                    <Save className="h-4 w-4 mr-2" />
                    Save Changes
                  </Button>
                )}
                <Button variant="outline" size="sm" onClick={handleDownload}>
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </Button>
              </div>
              <Badge variant="outline" className="text-blue-600">
                <Sparkles className="h-3 w-3 mr-1" />
                AI Generated
              </Badge>
            </div>

            {/* Executive Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Executive Summary
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isEditing ? (
                  <Textarea
                    value={editedProposal.executive_summary}
                    onChange={(e) => setEditedProposal({
                      ...editedProposal,
                      executive_summary: e.target.value
                    })}
                    rows={3}
                  />
                ) : (
                  <p className="text-sm text-slate-700">{currentProposal.executive_summary}</p>
                )}
              </CardContent>
            </Card>

            {/* Scope of Work */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Wrench className="h-4 w-4" />
                  Scope of Work
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isEditing ? (
                  <div className="space-y-2">
                    {editedProposal.scope_of_work.map((item, index) => (
                      <div key={index} className="flex gap-2">
                        <span className="text-sm font-medium text-slate-500">{index + 1}.</span>
                        <Input
                          value={item}
                          onChange={(e) => {
                            const newScope = [...editedProposal.scope_of_work];
                            newScope[index] = e.target.value;
                            setEditedProposal({
                              ...editedProposal,
                              scope_of_work: newScope
                            });
                          }}
                        />
                      </div>
                    ))}
                  </div>
                ) : (
                  <ul className="space-y-2">
                    {currentProposal.scope_of_work.map((item, index) => (
                      <li key={index} className="flex gap-2 text-sm">
                        <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0 mt-0.5" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>

            {/* Cost Breakdown */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  Cost Breakdown
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-600">Materials:</span>
                    {isEditing ? (
                      <Input
                        type="number"
                        className="w-24 h-7 text-right"
                        value={editedProposal.cost_breakdown.materials_cost}
                        onChange={(e) => {
                          const materials = parseFloat(e.target.value) || 0;
                          const labor = editedProposal.cost_breakdown.labor_cost;
                          const equipment = editedProposal.cost_breakdown.equipment_cost;
                          const subtotal = materials + labor + equipment;
                          const contingency = subtotal * 0.1;
                          const gst = (subtotal + contingency) * 0.1;
                          const total = subtotal + contingency + gst;
                          
                          setEditedProposal({
                            ...editedProposal,
                            cost_breakdown: {
                              ...editedProposal.cost_breakdown,
                              materials_cost: materials,
                              subtotal,
                              contingency,
                              gst,
                              total
                            }
                          });
                        }}
                      />
                    ) : (
                      <span className="font-medium">${currentProposal.cost_breakdown.materials_cost.toFixed(2)}</span>
                    )}
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Labor:</span>
                    {isEditing ? (
                      <Input
                        type="number"
                        className="w-24 h-7 text-right"
                        value={editedProposal.cost_breakdown.labor_cost}
                        onChange={(e) => {
                          const labor = parseFloat(e.target.value) || 0;
                          const materials = editedProposal.cost_breakdown.materials_cost;
                          const equipment = editedProposal.cost_breakdown.equipment_cost;
                          const subtotal = materials + labor + equipment;
                          const contingency = subtotal * 0.1;
                          const gst = (subtotal + contingency) * 0.1;
                          const total = subtotal + contingency + gst;
                          
                          setEditedProposal({
                            ...editedProposal,
                            cost_breakdown: {
                              ...editedProposal.cost_breakdown,
                              labor_cost: labor,
                              subtotal,
                              contingency,
                              gst,
                              total
                            }
                          });
                        }}
                      />
                    ) : (
                      <span className="font-medium">${currentProposal.cost_breakdown.labor_cost.toFixed(2)}</span>
                    )}
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Equipment:</span>
                    <span className="font-medium">${currentProposal.cost_breakdown.equipment_cost.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Contingency (10%):</span>
                    <span className="font-medium">${currentProposal.cost_breakdown.contingency.toFixed(2)}</span>
                  </div>
                </div>
                <Separator />
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-600">Subtotal:</span>
                    <span className="font-medium">${currentProposal.cost_breakdown.subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">GST (10%):</span>
                    <span className="font-medium">${currentProposal.cost_breakdown.gst.toFixed(2)}</span>
                  </div>
                </div>
                <Separator />
                <div className="flex justify-between text-lg font-bold">
                  <span>Total:</span>
                  <span className="text-blue-600">${currentProposal.cost_breakdown.total.toFixed(2)}</span>
                </div>
              </CardContent>
            </Card>

            {/* Timeline */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Timeline
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <Label className="text-xs text-slate-500">Duration</Label>
                    {isEditing ? (
                      <Input
                        value={editedProposal.timeline.estimated_duration}
                        onChange={(e) => setEditedProposal({
                          ...editedProposal,
                          timeline: { ...editedProposal.timeline, estimated_duration: e.target.value }
                        })}
                        className="mt-1"
                      />
                    ) : (
                      <p className="font-medium">{currentProposal.timeline.estimated_duration}</p>
                    )}
                  </div>
                  <div>
                    <Label className="text-xs text-slate-500">Start Date</Label>
                    {isEditing ? (
                      <Input
                        value={editedProposal.timeline.start_date}
                        onChange={(e) => setEditedProposal({
                          ...editedProposal,
                          timeline: { ...editedProposal.timeline, start_date: e.target.value }
                        })}
                        className="mt-1"
                      />
                    ) : (
                      <p className="font-medium">{currentProposal.timeline.start_date}</p>
                    )}
                  </div>
                  <div>
                    <Label className="text-xs text-slate-500">Completion</Label>
                    {isEditing ? (
                      <Input
                        value={editedProposal.timeline.completion_date}
                        onChange={(e) => setEditedProposal({
                          ...editedProposal,
                          timeline: { ...editedProposal.timeline, completion_date: e.target.value }
                        })}
                        className="mt-1"
                      />
                    ) : (
                      <p className="font-medium">{currentProposal.timeline.completion_date}</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Terms and Conditions */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Terms and Conditions</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm">
                  {currentProposal.terms_and_conditions.map((term, index) => (
                    <li key={index} className="flex gap-2">
                      <span className="font-medium text-slate-500">{index + 1}.</span>
                      <span>{term}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            {/* Notes */}
            {currentProposal.notes && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Additional Notes</CardTitle>
                </CardHeader>
                <CardContent>
                  {isEditing ? (
                    <Textarea
                      value={editedProposal.notes}
                      onChange={(e) => setEditedProposal({
                        ...editedProposal,
                        notes: e.target.value
                      })}
                      rows={3}
                    />
                  ) : (
                    <p className="text-sm text-slate-700">{currentProposal.notes}</p>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          {proposal && (
            <Button onClick={handleSubmit} className="bg-green-600 hover:bg-green-700">
              <CheckCircle className="h-4 w-4 mr-2" />
              Submit Proposal
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}