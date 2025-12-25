import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Star, MapPin, DollarSign, CheckCircle, Sparkles, TrendingUp, Users } from 'lucide-react';
import { toast } from 'sonner';

export default function ContractorAssignmentDialog({ workOrder, open, onOpenChange, onAssigned }) {
  const [suggestions, setSuggestions] = useState(null);
  const [loading, setLoading] = useState(false);
  const [assigning, setAssigning] = useState(null);
  const queryClient = useQueryClient();

  const getSuggestionsMutation = useMutation({
    mutationFn: async () => {
      setLoading(true);
      const response = await base44.functions.invoke('assignContractorToWorkOrder', {
        workOrderId: workOrder.id,
        autoAssign: false
      });
      return response.data;
    },
    onSuccess: (data) => {
      setLoading(false);
      setSuggestions(data);
    },
    onError: (error) => {
      setLoading(false);
      toast.error(`Failed to get suggestions: ${error.message}`);
    }
  });

  const assignMutation = useMutation({
    mutationFn: async (contractorId) => {
      setAssigning(contractorId);
      await base44.entities.WorkOrder.update(workOrder.id, {
        assigned_contractor_id: contractorId,
        status: workOrder.status === 'open' ? 'in_progress' : workOrder.status
      });
      
      // Send notification
      try {
        await base44.functions.invoke('notifyWorkOrderAssignment', {
          workOrderId: workOrder.id,
          contractorId
        });
      } catch (error) {
        console.error('Failed to send notification:', error);
      }
    },
    onSuccess: () => {
      setAssigning(null);
      queryClient.invalidateQueries({ queryKey: ['work-orders'] });
      toast.success('Contractor assigned and notified!');
      onAssigned?.();
      onOpenChange(false);
    },
    onError: (error) => {
      setAssigning(null);
      toast.error(`Failed to assign: ${error.message}`);
    }
  });

  React.useEffect(() => {
    if (open && !suggestions) {
      getSuggestionsMutation.mutate();
    }
  }, [open]);

  const getMatchColor = (score) => {
    if (score >= 80) return 'text-green-600 bg-green-50 border-green-200';
    if (score >= 60) return 'text-blue-600 bg-blue-50 border-blue-200';
    return 'text-orange-600 bg-orange-50 border-orange-200';
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-blue-600" />
            AI Contractor Assignment
          </DialogTitle>
          <p className="text-sm text-slate-500 mt-1">
            {workOrder.title}
          </p>
        </DialogHeader>

        {loading && (
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600 mb-4" />
            <p className="text-slate-600">Analyzing contractors and matching...</p>
          </div>
        )}

        {!loading && suggestions && (
          <div className="space-y-6">
            {suggestions.recommendation && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-900">
                  <strong>Recommendation:</strong> {suggestions.recommendation}
                </p>
              </div>
            )}

            <div className="space-y-4">
              <h3 className="font-semibold text-slate-900 flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Top Matches ({suggestions.suggestions?.length || 0})
              </h3>
              
              {suggestions.suggestions?.map((suggestion, idx) => (
                <Card key={suggestion.contractor_id} className={`border-2 ${idx === 0 ? 'border-blue-300 bg-blue-50/30' : 'border-slate-200'}`}>
                  <div className="p-5">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          {idx === 0 && (
                            <Badge className="bg-blue-600">
                              <Star className="h-3 w-3 mr-1 fill-white" />
                              Best Match
                            </Badge>
                          )}
                          <h4 className="font-semibold text-lg text-slate-900">
                            {suggestion.contractor_name}
                          </h4>
                        </div>
                        
                        <div className="flex items-center gap-4 text-sm text-slate-600 mb-3">
                          <div className={`flex items-center gap-1 px-2 py-1 rounded-md border ${getMatchColor(suggestion.match_score)}`}>
                            <TrendingUp className="h-3 w-3" />
                            <span className="font-semibold">{suggestion.match_score}% Match</span>
                          </div>
                          
                          {suggestion.specialty_match && (
                            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Specialty Match
                            </Badge>
                          )}
                          
                          {suggestion.availability_score && (
                            <div className="flex items-center gap-1">
                              <Users className="h-3 w-3 text-slate-400" />
                              <span>Availability: {suggestion.availability_score}%</span>
                            </div>
                          )}
                        </div>

                        <p className="text-sm text-slate-600 mb-3">
                          {suggestion.reasoning}
                        </p>

                        {suggestion.estimated_cost && (
                          <div className="flex items-center gap-1 text-sm text-slate-600">
                            <DollarSign className="h-4 w-4 text-slate-400" />
                            <span>Estimated: {suggestion.estimated_cost}</span>
                          </div>
                        )}
                      </div>

                      <Button
                        onClick={() => assignMutation.mutate(suggestion.contractor_id)}
                        disabled={assigning === suggestion.contractor_id}
                        className={idx === 0 ? "bg-blue-600 hover:bg-blue-700" : ""}
                      >
                        {assigning === suggestion.contractor_id ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Assigning...
                          </>
                        ) : (
                          'Assign'
                        )}
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}

              {(!suggestions.suggestions || suggestions.suggestions.length === 0) && (
                <div className="text-center py-8 text-slate-500">
                  No suitable contractors found. Try adding contractors with matching specialties.
                </div>
              )}
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}