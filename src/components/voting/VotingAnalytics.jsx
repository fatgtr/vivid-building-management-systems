import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TrendingUp, Users, Vote, CheckCircle } from 'lucide-react';

const COLORS = ['#3b82f6', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444'];

export default function VotingAnalytics({ buildingId }) {
  const { data: polls = [] } = useQuery({
    queryKey: ['polls', buildingId],
    queryFn: async () => {
      const all = await base44.entities.Poll.list('-created_date');
      return buildingId ? all.filter(p => p.building_id === buildingId) : all;
    }
  });

  const { data: votes = [] } = useQuery({
    queryKey: ['pollVotes'],
    queryFn: () => base44.entities.PollVote.list()
  });

  const { data: residents = [] } = useQuery({
    queryKey: ['residents', buildingId],
    queryFn: async () => {
      if (!buildingId) return [];
      const all = await base44.entities.Resident.list();
      return all.filter(r => r.building_id === buildingId);
    },
    enabled: !!buildingId
  });

  // Calculate stats
  const activePolls = polls.filter(p => p.status === 'active').length;
  const totalVotes = votes.length;
  const uniqueVoters = new Set(votes.map(v => v.voter_email)).size;
  const participationRate = residents.length > 0 
    ? ((uniqueVoters / residents.length) * 100).toFixed(1)
    : 0;

  // Poll type distribution
  const pollTypeData = Object.entries(
    polls.reduce((acc, poll) => {
      const type = poll.poll_type || 'simple';
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {})
  ).map(([name, value]) => ({ 
    name: name.replace(/_/g, ' '), 
    value 
  }));

  // Voting trends over time
  const votingTrends = polls.slice(0, 10).map(poll => {
    const pollVotes = votes.filter(v => v.poll_id === poll.id);
    return {
      poll: poll.title.slice(0, 20) + '...',
      votes: pollVotes.length,
      participation: residents.length > 0 
        ? ((pollVotes.length / residents.length) * 100).toFixed(0)
        : 0
    };
  });

  // Most engaged voters
  const voterEngagement = Object.entries(
    votes.reduce((acc, vote) => {
      acc[vote.voter_email] = (acc[vote.voter_email] || 0) + 1;
      return acc;
    }, {})
  ).sort((a, b) => b[1] - a[1]).slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Active Polls</p>
                <p className="text-3xl font-bold text-slate-900">{activePolls}</p>
              </div>
              <Vote className="h-10 w-10 text-blue-600 opacity-20" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Total Votes</p>
                <p className="text-3xl font-bold text-slate-900">{totalVotes}</p>
              </div>
              <CheckCircle className="h-10 w-10 text-green-600 opacity-20" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Unique Voters</p>
                <p className="text-3xl font-bold text-slate-900">{uniqueVoters}</p>
              </div>
              <Users className="h-10 w-10 text-purple-600 opacity-20" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Participation</p>
                <p className="text-3xl font-bold text-slate-900">{participationRate}%</p>
              </div>
              <TrendingUp className="h-10 w-10 text-orange-600 opacity-20" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Poll Types Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={pollTypeData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name}: ${value}`}
                  outerRadius={80}
                  dataKey="value"
                >
                  {pollTypeData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Voting Participation Trends</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={votingTrends}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="poll" angle={-45} textAnchor="end" height={100} fontSize={10} />
                <YAxis />
                <Tooltip />
                <Bar dataKey="votes" fill="#3b82f6" name="Total Votes" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Top Voters */}
      <Card>
        <CardHeader>
          <CardTitle>Most Engaged Residents</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {voterEngagement.map(([email, count], idx) => (
              <div key={email}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-600 font-bold text-sm">
                      #{idx + 1}
                    </div>
                    <span className="text-sm font-medium text-slate-700">{email}</span>
                  </div>
                  <Badge>{count} votes</Badge>
                </div>
                <Progress value={(count / polls.length) * 100} className="h-2" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}