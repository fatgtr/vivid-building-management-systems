import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useBuildingContext } from '@/components/BuildingContext';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { 
  FileText, 
  Search, 
  CheckCircle, 
  AlertCircle,
  ChevronRight,
  Eye,
  Edit,
  History,
  GitCompare,
  RotateCcw
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from 'sonner';
import PageHeader from '@/components/common/PageHeader';
import PolicyVersionHistory from '@/components/policies/PolicyVersionHistory';
import PolicyVersionComparison from '@/components/policies/PolicyVersionComparison';

export default function PolicyManagement() {
  const { selectedBuildingId } = useBuildingContext();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPolicy, setSelectedPolicy] = useState(null);
  const [editingPolicy, setEditingPolicy] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [showVersionHistory, setShowVersionHistory] = useState(false);
  const [compareVersions, setCompareVersions] = useState(null);
  const [revertTarget, setRevertTarget] = useState(null);
  const queryClient = useQueryClient();

  const { data: allPolicies = [], isLoading } = useQuery({
    queryKey: ['policies', selectedBuildingId],
    queryFn: () => selectedBuildingId
      ? base44.entities.Policy.filter({ building_id: selectedBuildingId })
      : base44.entities.Policy.list()
  });

  // Filter to show only current versions
  const policies = allPolicies.filter(p => p.is_current_version !== false);

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

  const updateMutation = useMutation({
    mutationFn: async ({ policyId, updates, versionNotes }) => {
      const currentPolicy = allPolicies.find(p => p.id === policyId);
      
      // Mark current version as superseded
      await base44.entities.Policy.update(policyId, {
        is_current_version: false,
        superseded_date: new Date().toISOString()
      });

      // Create new version
      const newVersion = await base44.entities.Policy.create({
        ...currentPolicy,
        ...updates,
        parent_policy_id: currentPolicy.parent_policy_id || policyId,
        version: (currentPolicy.version || 1) + 1,
        version_notes: versionNotes,
        is_current_version: true,
        superseded_by: null,
        superseded_date: null,
        created_date: undefined,
        updated_date: undefined,
        id: undefined
      });

      // Update old version with superseded_by
      await base44.entities.Policy.update(policyId, {
        superseded_by: newVersion.id
      });

      return newVersion;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['policies']);
      toast.success('Policy updated with new version');
      setEditingPolicy(null);
      setEditForm({});
    }
  });

  const revertMutation = useMutation({
    mutationFn: async (targetVersion) => {
      const parentId = targetVersion.parent_policy_id || targetVersion.id;
      const currentVersions = allPolicies.filter(p => 
        (p.id === parentId || p.parent_policy_id === parentId) && p.is_current_version
      );

      // Mark current version as superseded
      for (const current of currentVersions) {
        await base44.entities.Policy.update(current.id, {
          is_current_version: false,
          superseded_date: new Date().toISOString()
        });
      }

      // Create new version based on target
      const newVersion = await base44.entities.Policy.create({
        ...targetVersion,
        parent_policy_id: parentId,
        version: Math.max(...allPolicies.filter(p => 
          p.id === parentId || p.parent_policy_id === parentId
        ).map(p => p.version || 1)) + 1,
        version_notes: `Reverted to version ${targetVersion.version}`,
        is_current_version: true,
        superseded_by: null,
        superseded_date: null,
        created_date: undefined,
        updated_date: undefined,
        id: undefined
      });

      // Update previous current with superseded_by
      for (const current of currentVersions) {
        await base44.entities.Policy.update(current.id, {
          superseded_by: newVersion.id
        });
      }

      return newVersion;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['policies']);
      toast.success('Policy reverted to previous version');
      setRevertTarget(null);
      setShowVersionHistory(false);
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

  const handleEdit = (policy) => {
    setEditingPolicy(policy);
    setEditForm({
      title: policy.title,
      content: policy.content,
      key_points: policy.key_points?.join('\n') || '',
      version_notes: ''
    });
  };

  const handleSaveEdit = () => {
    if (!editForm.version_notes?.trim()) {
      toast.error('Please provide version notes describing the changes');
      return;
    }

    updateMutation.mutate({
      policyId: editingPolicy.id,
      updates: {
        title: editForm.title,
        content: editForm.content,
        key_points: editForm.key_points.split('\n').filter(p => p.trim())
      },
      versionNotes: editForm.version_notes
    });
  };

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Policy Management" 
        subtitle={`${policies.length} active policies across all categories`}
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
                        {policy.version > 1 && (
                          <Badge variant="secondary">v{policy.version}</Badge>
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
                        {policy.version > 1 && (
                          <Badge variant="secondary">v{policy.version}</Badge>
                        )}
                      </div>
                      <h4 className="font-semibold text-slate-900">{policy.title}</h4>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedPolicy(policy);
                          setShowVersionHistory(true);
                        }}
                      >
                        <History className="h-4 w-4 mr-2" />
                        History
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(policy)}
                      >
                        <Edit className="h-4 w-4 mr-2" />
                        Edit
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedPolicy(policy)}
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        View
                      </Button>
                    </div>
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

      {/* Policy Review/View Dialog */}
      <Dialog open={!!selectedPolicy && !showVersionHistory} onOpenChange={() => setSelectedPolicy(null)}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedPolicy?.title}
              {selectedPolicy?.version > 1 && (
                <Badge variant="secondary">Version {selectedPolicy.version}</Badge>
              )}
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

      {/* Version History Dialog */}
      <Dialog open={showVersionHistory} onOpenChange={() => {
        setShowVersionHistory(false);
        setCompareVersions(null);
      }}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Version History - {selectedPolicy?.title}
            </DialogTitle>
          </DialogHeader>

          {compareVersions ? (
            <div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCompareVersions(null)}
                className="mb-4"
              >
                ← Back to History
              </Button>
              <PolicyVersionComparison 
                version1={compareVersions.v1} 
                version2={compareVersions.v2} 
              />
            </div>
          ) : (
            selectedPolicy && (
              <PolicyVersionHistory
                policy={selectedPolicy}
                onCompare={(v1, v2) => setCompareVersions({ v1, v2 })}
                onRevert={(version) => setRevertTarget(version)}
              />
            )
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Policy Dialog */}
      <Dialog open={!!editingPolicy} onOpenChange={() => setEditingPolicy(null)}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Policy - {editingPolicy?.title}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Title</label>
              <Input
                value={editForm.title || ''}
                onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Content</label>
              <Textarea
                value={editForm.content || ''}
                onChange={(e) => setEditForm({ ...editForm, content: e.target.value })}
                rows={10}
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Key Points (one per line)</label>
              <Textarea
                value={editForm.key_points || ''}
                onChange={(e) => setEditForm({ ...editForm, key_points: e.target.value })}
                rows={5}
                placeholder="Enter key points, one per line"
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Version Notes *</label>
              <Textarea
                value={editForm.version_notes || ''}
                onChange={(e) => setEditForm({ ...editForm, version_notes: e.target.value })}
                rows={3}
                placeholder="Describe what changed in this version..."
              />
              <p className="text-xs text-slate-500 mt-1">Required: Explain what changes you made</p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingPolicy(null)}>
              Cancel
            </Button>
            <Button onClick={handleSaveEdit} disabled={updateMutation.isPending}>
              Save as New Version
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Revert Confirmation Dialog */}
      <AlertDialog open={!!revertTarget} onOpenChange={() => setRevertTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revert to Previous Version?</AlertDialogTitle>
            <AlertDialogDescription>
              This will create a new version based on version {revertTarget?.version}. The current active version will be preserved in history.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => revertMutation.mutate(revertTarget)}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Revert to This Version
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}