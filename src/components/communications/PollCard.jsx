import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { CheckCircle, Clock, Users } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

export default function PollCard({ poll, userEmail, hasVoted }) {
  const [selectedOptions, setSelectedOptions] = useState([]);
  const queryClient = useQueryClient();

  const voteMutation = useMutation({
    mutationFn: async (voteData) => {
      await base44.entities.PollVote.create(voteData);
      
      // Update poll statistics
      const updatedOptions = poll.options.map(opt => {
        if (selectedOptions.includes(opt.id)) {
          return { ...opt, votes: (opt.votes || 0) + 1 };
        }
        return opt;
      });

      await base44.entities.Poll.update(poll.id, {
        ...poll,
        options: updatedOptions,
        total_votes: (poll.total_votes || 0) + 1,
        voters: [...(poll.voters || []), userEmail]
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['polls'] });
      queryClient.invalidateQueries({ queryKey: ['pollVotes'] });
      toast.success('Vote submitted successfully');
      setSelectedOptions([]);
    },
  });

  const handleVote = async () => {
    if (selectedOptions.length === 0) {
      toast.error('Please select an option');
      return;
    }

    await voteMutation.mutateAsync({
      poll_id: poll.id,
      voter_email: userEmail,
      voter_name: (await base44.auth.me()).full_name,
      selected_options: selectedOptions
    });
  };

  const isExpired = poll.end_date && new Date(poll.end_date) < new Date();
  const canVote = !hasVoted && !isExpired && poll.status === 'active';

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="mb-2">{poll.title}</CardTitle>
            {poll.description && (
              <p className="text-sm text-gray-600">{poll.description}</p>
            )}
          </div>
          <Badge variant={isExpired ? 'outline' : 'default'} className={isExpired ? 'bg-gray-100' : 'bg-green-100 text-green-800'}>
            {isExpired ? 'Closed' : 'Active'}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {canVote ? (
          <>
            {poll.poll_type === 'single_choice' ? (
              <RadioGroup value={selectedOptions[0]} onValueChange={(val) => setSelectedOptions([val])}>
                {poll.options.map((option) => (
                  <div key={option.id} className="flex items-center space-x-2 p-3 bg-gray-50 rounded-lg">
                    <RadioGroupItem value={option.id} id={option.id} />
                    <Label htmlFor={option.id} className="flex-1 cursor-pointer">
                      {option.text}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            ) : (
              <div className="space-y-2">
                {poll.options.map((option) => (
                  <div key={option.id} className="flex items-center space-x-2 p-3 bg-gray-50 rounded-lg">
                    <Checkbox
                      id={option.id}
                      checked={selectedOptions.includes(option.id)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedOptions([...selectedOptions, option.id]);
                        } else {
                          setSelectedOptions(selectedOptions.filter(id => id !== option.id));
                        }
                      }}
                    />
                    <Label htmlFor={option.id} className="flex-1 cursor-pointer">
                      {option.text}
                    </Label>
                  </div>
                ))}
              </div>
            )}

            <Button 
              onClick={handleVote} 
              disabled={voteMutation.isPending || selectedOptions.length === 0}
              className="w-full bg-blue-600"
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              Submit Vote
            </Button>
          </>
        ) : (
          <div className="space-y-3">
            {poll.options.map((option) => {
              const percentage = poll.total_votes > 0 
                ? ((option.votes || 0) / poll.total_votes * 100).toFixed(1)
                : 0;
              
              return (
                <div key={option.id} className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">{option.text}</span>
                    <span className="text-gray-600">{option.votes || 0} votes ({percentage}%)</span>
                  </div>
                  <Progress value={parseFloat(percentage)} className="h-2" />
                </div>
              );
            })}
          </div>
        )}

        <div className="pt-4 border-t flex items-center justify-between text-sm text-gray-600">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1">
              <Users className="h-4 w-4" />
              <span>{poll.total_votes || 0} votes</span>
            </div>
            {poll.end_date && (
              <div className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                <span>Ends {format(new Date(poll.end_date), 'MMM d, yyyy')}</span>
              </div>
            )}
          </div>
          {hasVoted && (
            <Badge className="bg-green-100 text-green-800">You voted</Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
}