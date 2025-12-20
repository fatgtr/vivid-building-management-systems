import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useBuildingContext } from '@/components/BuildingContext';
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import PageHeader from '@/components/common/PageHeader';
import MoveChecklistDisplay from '@/components/move/MoveChecklistDisplay';
import { Badge } from "@/components/ui/badge";
import { ClipboardCheck, Calendar, User, Building2, Home } from 'lucide-react';
import { format } from 'date-fns';

export default function MoveChecklists() {
  const { selectedBuildingId } = useBuildingContext();
  const [user, setUser] = useState(null);
  const [filterStatus, setFilterStatus] = useState('all');
  const [selectedChecklist, setSelectedChecklist] = useState(null);

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const { data: checklists = [], isLoading } = useQuery({
    queryKey: ['moveChecklists', selectedBuildingId],
    queryFn: () => selectedBuildingId
      ? base44.entities.MoveChecklist.filter({ building_id: selectedBuildingId })
      : base44.entities.MoveChecklist.list('-created_date'),
  });

  const { data: buildings = [] } = useQuery({
    queryKey: ['buildings'],
    queryFn: () => base44.entities.Building.list(),
  });

  const { data: units = [] } = useQuery({
    queryKey: ['units'],
    queryFn: () => base44.entities.Unit.list(),
  });

  const getBuildingName = (buildingId) => buildings.find(b => b.id === buildingId)?.name || 'Unknown';
  const getUnitNumber = (unitId) => units.find(u => u.id === unitId)?.unit_number || '';

  const filteredChecklists = checklists.filter(c => {
    if (filterStatus === 'all') return true;
    return c.status === filterStatus;
  });

  const moveInChecklists = filteredChecklists.filter(c => c.move_type === 'move_in');
  const moveOutChecklists = filteredChecklists.filter(c => c.move_type === 'move_out');

  // Determine user role
  const userRole = user?.role === 'admin' ? 'building_manager' : 'building_manager'; // Default for now

  const ChecklistCard = ({ checklist }) => {
    const completedTasks = checklist.tasks?.filter(t => t.is_completed).length || 0;
    const totalTasks = checklist.tasks?.length || 0;
    const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    return (
      <Card 
        className="cursor-pointer hover:shadow-lg transition-all border-2 hover:border-blue-300"
        onClick={() => setSelectedChecklist(checklist)}
      >
        <CardContent className="p-5">
          <div className="flex items-start justify-between mb-3">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <h3 className="font-semibold text-lg text-slate-900">{checklist.resident_name}</h3>
                <Badge className={
                  checklist.status === 'completed' ? 'bg-green-600' :
                  checklist.status === 'in_progress' ? 'bg-blue-600' :
                  'bg-slate-600'
                }>
                  {checklist.status}
                </Badge>
              </div>
              
              <div className="space-y-1 text-sm text-slate-600">
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  {getBuildingName(checklist.building_id)}
                </div>
                <div className="flex items-center gap-2">
                  <Home className="h-4 w-4" />
                  Unit {getUnitNumber(checklist.unit_id)}
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  {format(new Date(checklist.checklist_date), 'MMM d, yyyy')}
                </div>
              </div>
            </div>

            <div className="text-right">
              <div className="text-2xl font-bold text-blue-600">{progress}%</div>
              <div className="text-xs text-slate-500">{completedTasks}/{totalTasks} tasks</div>
            </div>
          </div>

          <div className="mt-3 pt-3 border-t border-slate-200">
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span>Created {format(new Date(checklist.created_date), 'MMM d')}</span>
              <span className="capitalize">{checklist.move_type?.replace('_', '-')}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  if (selectedChecklist) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setSelectedChecklist(null)}
            className="text-blue-600 hover:text-blue-700 font-medium"
          >
            ← Back to All Checklists
          </button>
        </div>
        
        <MoveChecklistDisplay checklist={selectedChecklist} userRole={userRole} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Move Checklists" 
        subtitle="Track move-in and move-out processes"
      >
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
          </SelectContent>
        </Select>
      </PageHeader>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-blue-100 rounded-lg">
                <ClipboardCheck className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Total Checklists</p>
                <p className="text-2xl font-bold text-slate-900">{checklists.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-green-100 rounded-lg">
                <User className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Move-Ins</p>
                <p className="text-2xl font-bold text-slate-900">{moveInChecklists.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-orange-100 rounded-lg">
                <User className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Move-Outs</p>
                <p className="text-2xl font-bold text-slate-900">{moveOutChecklists.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-purple-100 rounded-lg">
                <ClipboardCheck className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Completed</p>
                <p className="text-2xl font-bold text-slate-900">
                  {checklists.filter(c => c.status === 'completed').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="all" className="w-full">
        <TabsList>
          <TabsTrigger value="all">All Checklists</TabsTrigger>
          <TabsTrigger value="move_in">Move-Ins</TabsTrigger>
          <TabsTrigger value="move_out">Move-Outs</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-6">
          {filteredChecklists.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <ClipboardCheck className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-slate-900 mb-2">No Checklists Found</h3>
                <p className="text-slate-500">Move checklists will appear here when residents are added with move dates.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredChecklists.map((checklist) => (
                <ChecklistCard key={checklist.id} checklist={checklist} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="move_in" className="mt-6">
          {moveInChecklists.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <ClipboardCheck className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-slate-900 mb-2">No Move-In Checklists</h3>
                <p className="text-slate-500">Move-in checklists will appear here.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {moveInChecklists.map((checklist) => (
                <ChecklistCard key={checklist.id} checklist={checklist} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="move_out" className="mt-6">
          {moveOutChecklists.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <ClipboardCheck className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-slate-900 mb-2">No Move-Out Checklists</h3>
                <p className="text-slate-500">Move-out checklists will appear here.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {moveOutChecklists.map((checklist) => (
                <ChecklistCard key={checklist.id} checklist={checklist} />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}