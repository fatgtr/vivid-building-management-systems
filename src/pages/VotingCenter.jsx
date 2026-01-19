import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useBuildingContext } from '@/components/BuildingContext';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Vote, Plus, CheckCircle } from 'lucide-react';
import { format, isPast, isFuture } from 'date-fns';
import { toast } from 'sonner';
import PageHeader from '@/components/common/PageHeader';

export default function VotingCenter() {
  const { selectedBuildingId, user } = useBuildingContext();
  const [showDialog, setShowDialog] = useState(false);
  const [selectedPoll, setSelectedPoll] = useState(null);
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    building_id: selectedBuildingId || '',
    title: '',
    description: '',
    poll_type: 'simple',
    eligible_voters: 'all_residents',
    options: [{ text: '' }, { text: '' }],
    end_date: ''
  });

  const { data: polls = [] } = useQuery({
    queryKey: ['polls', selectedBuildingId],
    queryFn: async () => {
      const all = await base44.entities.Poll.list('-created_date');
      return selectedBuildingId ? all.filter(p => p.building_id === selectedBuildingId) : all;
    }
  });

  const { data: votes = [] } = useQuery({
    queryKey: ['pollVotes'],
    queryFn: () => base44.entities.PollVote.list()
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Poll.create({
      ...data,
      start_date: new Date().toISOString(),
      status: 'active'
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['polls'] });
      setShowDialog(false);
      toast.success('Poll created');
    }
  });

  const voteMutation = useMutation({
    mutationFn: (data) => base44.entities.PollVote.create({
      ...data,
      voted_at: new Date().toISOString()
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pollVotes'] });
      setSelectedPoll(null);
      toast.success('Vote recorded');
    }
  });

  const hasVoted = (pollId) => votes.some(v => v.poll_id === pollId && v.voter_email === user?.email);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Voting Center"
        subtitle="Community polls and AGM voting"
        action={() => setShowDialog(true)}
        actionLabel="Create Poll"
      />

      <div className="space-y-6">
        {polls.map((poll) => {
          const pollVotes = votes.filter(v => v.poll_id === poll.id);
          const userVoted = hasVoted(poll.id);
          const isActive = poll.status === 'active' && (poll.end_date ? isFuture(new Date(poll.end_date)) : true);

          return (
            <Card key={poll.id} className={isActive ? 'border-2 border-blue-200' : ''}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge className="capitalize">{poll.poll_type?.replace(/_/g, ' ')}</Badge>
                      {isActive && <Badge className="bg-green-600">Active</Badge>}
                      {!isActive && <Badge variant="outline">Closed</Badge>}
                    </div>
                    <CardTitle className="text-xl">{poll.title}</CardTitle>
                    {poll.description && <p className="text-sm text-slate-600 mt-2">{poll.description}</p>}
                    <p className="text-xs text-slate-500 mt-2">
                      {poll.end_date && `Closes ${format(new Date(poll.end_date), 'MMM d, yyyy')}`}
                    </p>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {poll.options?.map((option, idx) => {
                    const optionVotes = pollVotes.filter(v => v.selected_options?.includes(option.text)).length;
                    const percentage = pollVotes.length > 0 ? (optionVotes / pollVotes.length) * 100 : 0;

                    return (
                      <div key={idx} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">{option.text}</span>
                          {(poll.results_visible || !isActive || userVoted) && (
                            <span className="text-sm text-slate-600">{optionVotes} votes ({percentage.toFixed(0)}%)</span>
                          )}
                        </div>
                        {(poll.results_visible || !isActive || userVoted) && (
                          <Progress value={percentage} className="h-2" />
                        )}
                      </div>
                    );
                  })}
                </div>

                {isActive && !userVoted && (
                  <Button
                    className="w-full mt-4"
                    onClick={() => setSelectedPoll(poll)}
                  >
                    <Vote className="h-4 w-4 mr-2" />
                    Vote Now
                  </Button>
                )}

                {userVoted && (
                  <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2 text-green-700">
                    <CheckCircle className="h-4 w-4" />
                    <span className="text-sm font-medium">You voted</span>
                  </div>
                )}

                <p className="text-xs text-slate-500 mt-3">Total votes: {pollVotes.length}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create Poll</DialogTitle>
          </DialogHeader>
          <form onSubmit={(e) => {
            e.preventDefault();
            createMutation.mutate({
              ...formData,
              options: formData.options.filter(o => o.text.trim())
            });
          }} className="space-y-4">
            <div>
              <Label>Title *</Label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                required
              />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Poll Type</Label>
                <Select value={formData.poll_type} onValueChange={(v) => setFormData({ ...formData, poll_type: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="simple">Simple Poll</SelectItem>
                    <SelectItem value="agm_motion">AGM Motion</SelectItem>
                    <SelectItem value="committee_decision">Committee Decision</SelectItem>
                    <SelectItem value="building_improvement">Building Improvement</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Eligible Voters</Label>
                <Select value={formData.eligible_voters} onValueChange={(v) => setFormData({ ...formData, eligible_voters: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all_residents">All Residents</SelectItem>
                    <SelectItem value="owners_only">Owners Only</SelectItem>
                    <SelectItem value="committee_only">Committee Only</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Closes On</Label>
              <Input
                type="date"
                value={formData.end_date}
                onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Options *</Label>
              {formData.options.map((option, idx) => (
                <Input
                  key={idx}
                  value={option.text}
                  onChange={(e) => {
                    const newOptions = [...formData.options];
                    newOptions[idx].text = e.target.value;
                    setFormData({ ...formData, options: newOptions });
                  }}
                  placeholder={`Option ${idx + 1}`}
                />
              ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setFormData({ ...formData, options: [...formData.options, { text: '' }] })}
              >
                <Plus className="h-3 w-3 mr-1" /> Add Option
              </Button>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? 'Creating...' : 'Create Poll'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {selectedPoll && (
        <Dialog open={!!selectedPoll} onOpenChange={() => setSelectedPoll(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Cast Your Vote</DialogTitle>
            </DialogHeader>
            <form onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.target);
              const selected = formData.get('option');
              voteMutation.mutate({
                poll_id: selectedPoll.id,
                voter_id: user?.id || 'anonymous',
                voter_email: user?.email,
                selected_options: [selected]
              });
            }} className="space-y-4">
              <p className="text-sm text-slate-600">{selectedPoll.title}</p>
              <div className="space-y-2">
                {selectedPoll.options?.map((option, idx) => (
                  <label key={idx} className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-slate-50">
                    <input type="radio" name="option" value={option.text} required />
                    <span>{option.text}</span>
                  </label>
                ))}
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setSelectedPoll(null)}>Cancel</Button>
                <Button type="submit" disabled={voteMutation.isPending}>
                  {voteMutation.isPending ? 'Voting...' : 'Submit Vote'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}