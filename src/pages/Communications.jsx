import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useBuildingContext } from '@/components/BuildingContext';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import ChatInterface from '@/components/communications/ChatInterface';
import ChatList from '@/components/communications/ChatList';
import BroadcastComposer from '@/components/communications/BroadcastComposer';
import PollCard from '@/components/communications/PollCard';
import { MessageSquare, Radio, BarChart3, Plus } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from 'sonner';

export default function Communications() {
  const { selectedBuildingId } = useBuildingContext();
  const [user, setUser] = useState(null);
  const [selectedChat, setSelectedChat] = useState(null);
  const [newPollOpen, setNewPollOpen] = useState(false);
  const [pollTitle, setPollTitle] = useState('');
  const [pollDescription, setPollDescription] = useState('');
  const [pollType, setPollType] = useState('single_choice');
  const [pollOptions, setPollOptions] = useState(['', '']);

  React.useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const { data: chats = [] } = useQuery({
    queryKey: ['chats', selectedBuildingId, user?.email],
    queryFn: () => selectedBuildingId
      ? base44.entities.Chat.filter({ building_id: selectedBuildingId })
      : base44.entities.Chat.list(),
    enabled: !!user && !!selectedBuildingId,
  });

  const { data: polls = [] } = useQuery({
    queryKey: ['polls', selectedBuildingId],
    queryFn: () => selectedBuildingId
      ? base44.entities.Poll.filter({ building_id: selectedBuildingId })
      : base44.entities.Poll.list(),
    enabled: !!selectedBuildingId,
  });

  const { data: myVotes = [] } = useQuery({
    queryKey: ['pollVotes', user?.email],
    queryFn: () => base44.entities.PollVote.filter({ voter_email: user?.email }),
    enabled: !!user?.email,
  });

  const userChats = chats.filter(chat => chat.participants.includes(user?.email));

  const handleCreatePoll = async () => {
    if (!pollTitle.trim() || pollOptions.filter(o => o.trim()).length < 2) {
      toast.error('Poll needs a title and at least 2 options');
      return;
    }

    const options = pollOptions
      .filter(o => o.trim())
      .map((text, idx) => ({
        id: `opt_${Date.now()}_${idx}`,
        text: text.trim(),
        votes: 0
      }));

    await base44.entities.Poll.create({
      building_id: selectedBuildingId,
      created_by_email: user.email,
      created_by_name: user.full_name,
      title: pollTitle,
      description: pollDescription,
      poll_type: pollType,
      options,
      status: 'active',
      total_votes: 0,
      voters: []
    });

    toast.success('Poll created successfully');
    setNewPollOpen(false);
    setPollTitle('');
    setPollDescription('');
    setPollOptions(['', '']);
  };

  if (!user) {
    return <div className="p-8 text-center">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Communications</h1>
          <p className="text-gray-600 mt-1">Chat, broadcast messages, and community polls</p>
        </div>
      </div>

      <Tabs defaultValue="chat" className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-3">
          <TabsTrigger value="chat">
            <MessageSquare className="h-4 w-4 mr-2" />
            Chat
          </TabsTrigger>
          <TabsTrigger value="broadcast">
            <Radio className="h-4 w-4 mr-2" />
            Broadcast
          </TabsTrigger>
          <TabsTrigger value="polls">
            <BarChart3 className="h-4 w-4 mr-2" />
            Polls
          </TabsTrigger>
        </TabsList>

        <TabsContent value="chat" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div>
              <h3 className="text-lg font-semibold mb-4">Your Chats</h3>
              <ChatList
                chats={userChats}
                userEmail={user.email}
                onSelectChat={setSelectedChat}
                selectedChatId={selectedChat?.id}
              />
            </div>
            <div className="lg:col-span-2">
              <ChatInterface
                chat={selectedChat}
                userEmail={user.email}
                onClose={() => setSelectedChat(null)}
              />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="broadcast" className="mt-6">
          <div className="max-w-2xl mx-auto">
            <BroadcastComposer buildingId={selectedBuildingId} />
          </div>
        </TabsContent>

        <TabsContent value="polls" className="mt-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold">Community Polls</h3>
            <Dialog open={newPollOpen} onOpenChange={setNewPollOpen}>
              <DialogTrigger asChild>
                <Button className="bg-blue-600">
                  <Plus className="h-4 w-4 mr-2" />
                  Create Poll
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Create New Poll</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>Poll Title</Label>
                    <Input
                      value={pollTitle}
                      onChange={(e) => setPollTitle(e.target.value)}
                      placeholder="What would you like to ask?"
                    />
                  </div>
                  <div>
                    <Label>Description (optional)</Label>
                    <Textarea
                      value={pollDescription}
                      onChange={(e) => setPollDescription(e.target.value)}
                      placeholder="Additional context..."
                      rows={3}
                    />
                  </div>
                  <div>
                    <Label>Poll Type</Label>
                    <Select value={pollType} onValueChange={setPollType}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="single_choice">Single Choice</SelectItem>
                        <SelectItem value="multiple_choice">Multiple Choice</SelectItem>
                        <SelectItem value="proposal">Proposal (Yes/No)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Options</Label>
                    {pollOptions.map((opt, idx) => (
                      <Input
                        key={idx}
                        value={opt}
                        onChange={(e) => {
                          const newOpts = [...pollOptions];
                          newOpts[idx] = e.target.value;
                          setPollOptions(newOpts);
                        }}
                        placeholder={`Option ${idx + 1}`}
                        className="mt-2"
                      />
                    ))}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPollOptions([...pollOptions, ''])}
                      className="mt-2"
                    >
                      Add Option
                    </Button>
                  </div>
                  <Button onClick={handleCreatePoll} className="w-full">
                    Create Poll
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {polls.length === 0 ? (
              <Card className="col-span-2">
                <CardContent className="p-12 text-center">
                  <BarChart3 className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                  <p className="text-gray-500">No polls yet. Create one to get started!</p>
                </CardContent>
              </Card>
            ) : (
              polls.map((poll) => (
                <PollCard
                  key={poll.id}
                  poll={poll}
                  userEmail={user.email}
                  hasVoted={myVotes.some(v => v.poll_id === poll.id)}
                />
              ))
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}