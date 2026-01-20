import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useBuildingContext } from '@/components/BuildingContext';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { 
  FileText, 
  Search, 
  CheckCircle, 
  AlertCircle,
  ChevronRight,
  Eye
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from 'sonner';
import PageHeader from '@/components/common/PageHeader';

export default function PolicyManagement() {
  const { selectedBuildingId } = useBuildingContext();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPolicy, setSelectedPolicy] = useState(null);
  const queryClient = useQueryClient();

  const { data: policies = [], isLoading } = useQuery({
    queryKey: ['policies', selectedBuildingId],
    queryFn: () => selectedBuildingId
      ? base44.entities.Policy.filter({ building_id: selectedBuildingId })
      : base44.entities.Policy.list()
  });

  const approveMutation = useMutation({
    mutationFn: async (policyId) => {
      return await base44.entities.Policy.update(policyId, {
        status: 'active',
        review_required: false
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['policies']);
      toast.success('Policy approved and activated');
      setSelectedPolicy(null);
    }
  });

  const policyTypeLabels = {
    move_in_move_out: 'Move In/Out',
    pet_policy: 'Pet Policy',
    whs_safety: 'WHS & Safety',
    noise_disturbance: 'Noise & Disturbance',
    parking: 'Parking',
    common_area_usage: 'Common Areas',
    renovation_alterations: 'Renovations',
    waste_management: 'Waste Management',
    smoking: 'Smoking',
    short_term_rental: 'Short-term Rentals',
    guest_policy: 'Guests',
    amenity_usage: 'Amenity Usage',
    general: 'General'
  };

  const filteredPolicies = policies.filter(p =>
    p.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.content?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const draftPolicies = filteredPolicies.filter(p => p.status === 'draft');
  const activePolicies = filteredPolicies.filter(p => p.status === 'active');

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Policy Management" 
        subtitle={`${policies.length} policies across all categories`}
      />

      <Card>
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search policies..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="review" className="space-y-6">
        <TabsList>
          <TabsTrigger value="review">
            Pending Review ({draftPolicies.length})
          </TabsTrigger>
          <TabsTrigger value="active">
            Active Policies ({activePolicies.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="review" className="space-y-4">
          {draftPolicies.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-3" />
                <p className="text-slate-600">No policies pending review</p>
              </CardContent>
            </Card>
          ) : (
            draftPolicies.map((policy) => (
              <Card key={policy.id} className="border-2 border-orange-200">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="outline" className="bg-orange-50 text-orange-600 border-orange-300">
                          {policyTypeLabels[policy.policy_type]}
                        </Badge>
                        {policy.ai_generated && (
                          <Badge variant="outline" className="bg-blue-50 text-blue-600 border-blue-300">
                            AI Generated
                          </Badge>
                        )}
                      </div>
                      <h4 className="font-semibold text-slate-900">{policy.title}</h4>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedPolicy(policy)}
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      Review
                    </Button>
                  </div>

                  <div className="space-y-2">
                    {policy.key_points?.length > 0 && (
                      <div>
                        <p className="text-xs font-medium text-slate-500 mb-1">Key Points:</p>
                        <ul className="space-y-1">
                          {policy.key_points.slice(0, 3).map((point, idx) => (
                            <li key={idx} className="text-sm text-slate-600 flex items-start gap-2">
                              <ChevronRight className="h-4 w-4 text-slate-400 mt-0.5 flex-shrink-0" />
                              <span>{point}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="active" className="space-y-4">
          {activePolicies.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <FileText className="h-12 w-12 text-slate-400 mx-auto mb-3" />
                <p className="text-slate-600">No active policies yet</p>
              </CardContent>
            </Card>
          ) : (
            activePolicies.map((policy) => (
              <Card key={policy.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge className="bg-green-100 text-green-700">
                          {policyTypeLabels[policy.policy_type]}
                        </Badge>
                        <Badge variant="outline" className="text-green-600 border-green-300">
                          Active
                        </Badge>
                      </div>
                      <h4 className="font-semibold text-slate-900">{policy.title}</h4>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedPolicy(policy)}
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      View
                    </Button>
                  </div>

                  {policy.key_points?.length > 0 && (
                    <ul className="space-y-1 mt-2">
                      {policy.key_points.slice(0, 3).map((point, idx) => (
                        <li key={idx} className="text-sm text-slate-600 flex items-start gap-2">
                          <ChevronRight className="h-4 w-4 text-slate-400 mt-0.5 flex-shrink-0" />
                          <span>{point}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>

      {/* Policy Review Dialog */}
      <Dialog open={!!selectedPolicy} onOpenChange={() => setSelectedPolicy(null)}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedPolicy?.title}
            </DialogTitle>
          </DialogHeader>

          {selectedPolicy && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge>{policyTypeLabels[selectedPolicy.policy_type]}</Badge>
                <Badge variant="outline">Applies to: {selectedPolicy.applies_to?.replace('_', ' ')}</Badge>
                {selectedPolicy.effective_date && (
                  <Badge variant="outline">Effective: {selectedPolicy.effective_date}</Badge>
                )}
              </div>

              {selectedPolicy.key_points?.length > 0 && (
                <div>
                  <h4 className="font-semibold mb-2">Key Points:</h4>
                  <ul className="space-y-2">
                    {selectedPolicy.key_points.map((point, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <ChevronRight className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                        <span className="text-slate-700">{point}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div>
                <h4 className="font-semibold mb-2">Full Policy Content:</h4>
                <div className="bg-slate-50 rounded-lg p-4 text-sm text-slate-700 whitespace-pre-wrap">
                  {selectedPolicy.content}
                </div>
              </div>

              {selectedPolicy.status === 'draft' && selectedPolicy.review_required && (
                <div className="flex gap-3 pt-4 border-t">
                  <Button
                    onClick={() => approveMutation.mutate(selectedPolicy.id)}
                    disabled={approveMutation.isPending}
                    className="flex-1"
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Approve & Activate
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setSelectedPolicy(null)}
                    className="flex-1"
                  >
                    Close
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}