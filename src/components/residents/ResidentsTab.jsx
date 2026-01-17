import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useBuildingContext } from '@/components/BuildingContext';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import StatusBadge from '@/components/common/StatusBadge';
import EmptyState from '@/components/common/EmptyState';
import { 
  Search, 
  Users, 
  Plus,
  Eye,
  Mail,
  Phone,
  MoreVertical,
  Pencil,
  Trash2,
  UserPlus,
  MapPin,
  Home
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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

export default function ResidentsTab() {
  const { selectedBuildingId } = useBuildingContext();
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteResident, setDeleteResident] = useState(null);
  const [selectedStrataPlan, setSelectedStrataPlan] = useState('all');
  const queryClient = useQueryClient();

  const { data: residents = [], isLoading } = useQuery({
    queryKey: ['residents'],
    queryFn: () => base44.entities.Resident.list(),
  });

  const { data: buildings = [] } = useQuery({
    queryKey: ['buildings'],
    queryFn: () => base44.entities.Building.list(),
  });

  const { data: units = [] } = useQuery({
    queryKey: ['units'],
    queryFn: () => base44.entities.Unit.list(),
  });

  const { data: locations = [] } = useQuery({
    queryKey: ['locations'],
    queryFn: () => base44.entities.Location.list(),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Resident.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['residents'] });
      setDeleteResident(null);
    },
  });

  const getBuildingName = (buildingId) => buildings.find(b => b.id === buildingId)?.name || 'Unknown';
  const getUnitNumber = (unitId) => units.find(u => u.id === unitId)?.unit_number || 'N/A';
  const getLocationName = (unitId) => {
    const unit = units.find(u => u.id === unitId);
    if (!unit) return null;
    const location = locations.find(l => l.id === unit.location_id);
    return location?.name;
  };

  // Get current building
  const currentBuilding = buildings.find(b => b.id === selectedBuildingId);
  const isBMC = currentBuilding?.is_bmc;
  const strataPlans = isBMC ? (currentBuilding?.bmc_strata_plans || []) : [];

  // Get units for the selected strata plan
  const getUnitsForStrataPlan = (strataPlanNumber) => {
    return units.filter(u => 
      u.building_id === selectedBuildingId && 
      u.strata_plan_number === strataPlanNumber
    );
  };

  const filteredResidents = residents.filter(r => {
    const matchesSearch = 
      r.first_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.last_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.email?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesBuilding = !selectedBuildingId || r.building_id === selectedBuildingId;
    const matchesStrataPlan = selectedStrataPlan === 'all' || r.strata_plan_number === selectedStrataPlan;
    return matchesSearch && matchesBuilding && matchesStrataPlan;
  });

  // Get units for selected strata plan
  const selectedUnits = selectedStrataPlan === 'all' 
    ? units.filter(u => u.building_id === selectedBuildingId)
    : getUnitsForStrataPlan(selectedStrataPlan);

  if (isLoading) {
    return <Skeleton className="h-96 rounded-xl" />;
  }

  const renderResidentsGrid = () => (
    <>
      {/* Header Actions */}
      <div className="flex flex-wrap gap-4 items-center justify-between">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search residents..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Link to={createPageUrl('Residents')}>
          <Button className="bg-purple-600 hover:bg-purple-700">
            <Plus className="h-4 w-4 mr-2" />
            Add Resident
          </Button>
        </Link>
      </div>

      {/* Lots/Units Grid - Show all lots as cards, with resident info if occupied */}
      {selectedUnits.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No lots found"
          description="Lots will appear here once added from the setup"
          action={() => window.location.href = createPageUrl('Residents')}
          actionLabel="Add Resident"
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {selectedUnits.map((unit) => {
            // Find resident(s) for this unit
            const unitResidents = residents.filter(r => r.unit_id === unit.id);
            const hasResident = unitResidents.length > 0;
            
            return (
              <Card key={unit.id} className={`p-5 transition-all border-2 ${hasResident ? 'hover:shadow-lg hover:border-purple-300' : 'bg-slate-50 border-slate-200 hover:border-slate-300'}`}>
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3 flex-1">
                    <div className={`h-12 w-12 rounded-full flex items-center justify-center text-white font-semibold text-lg ${hasResident ? 'bg-gradient-to-br from-purple-500 to-pink-600' : 'bg-slate-300'}`}>
                      {hasResident ? (
                        <>
                          {unitResidents[0]?.first_name?.[0]}{unitResidents[0]?.last_name?.[0]}
                        </>
                      ) : (
                        <Home className="h-6 w-6" />
                      )}
                    </div>
                    <div className="flex-1">
                      {hasResident ? (
                        <>
                          <h3 className="font-semibold text-slate-900">
                            {unitResidents[0]?.first_name} {unitResidents[0]?.last_name}
                          </h3>
                          <p className="text-xs text-slate-500">
                            Lot {unit.lot_number || unit.unit_number}
                          </p>
                        </>
                      ) : (
                        <>
                          <h3 className="font-semibold text-slate-700">
                            Lot {unit.lot_number || unit.unit_number}
                          </h3>
                          <p className="text-xs text-slate-500">
                            Vacant
                          </p>
                        </>
                      )}
                    </div>
                  </div>
                  {hasResident && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild>
                          <Link to={createPageUrl('ResidentProfile') + `?id=${unitResidents[0].id}`}>
                            <Eye className="mr-2 h-4 w-4" /> View Profile
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setDeleteResident(unitResidents[0])} className="text-red-600">
                          <Trash2 className="mr-2 h-4 w-4" /> Remove
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>

                {hasResident && (
                  <div className="space-y-2 mb-4">
                    <div className="flex items-center gap-2 text-sm flex-wrap">
                      <Badge className="capitalize">{unitResidents[0]?.resident_type}</Badge>
                      <StatusBadge status={unitResidents[0]?.status} />
                    </div>
                    
                    {unitResidents[0]?.email && (
                      <div className="flex items-center gap-2 text-sm text-slate-600">
                        <Mail className="h-4 w-4 text-slate-400" />
                        <span className="truncate">{unitResidents[0]?.email}</span>
                      </div>
                    )}
                    
                    {unitResidents[0]?.phone && (
                      <div className="flex items-center gap-2 text-sm text-slate-600">
                        <Phone className="h-4 w-4 text-slate-400" />
                        <span>{unitResidents[0]?.phone}</span>
                      </div>
                    )}
                  </div>
                )}

                <Link to={createPageUrl('Residents')}>
                  <Button variant="outline" className="w-full" size="sm">
                    {hasResident ? (
                      <>
                        <Eye className="h-4 w-4 mr-2" />
                        View Profile
                      </>
                    ) : (
                      <>
                        <UserPlus className="h-4 w-4 mr-2" />
                        Add Resident
                      </>
                    )}
                  </Button>
                </Link>
              </Card>
            );
          })}
        </div>
      )}
    </>
  );

  return (
    <div className="space-y-6">
      {isBMC && strataPlans.length > 0 ? (
        <Tabs value={selectedStrataPlan} onValueChange={setSelectedStrataPlan} className="space-y-6">
          <TabsList className="bg-slate-100 flex-wrap h-auto">
            <TabsTrigger value="all">All</TabsTrigger>
            {strataPlans.map((plan) => (
              <TabsTrigger key={plan.plan_number} value={plan.plan_number}>
                {plan.plan_number}
              </TabsTrigger>
            ))}
          </TabsList>
          
          <TabsContent value="all" className="space-y-6">
            {renderResidentsGrid()}
          </TabsContent>
          
          {strataPlans.map((plan) => (
            <TabsContent key={plan.plan_number} value={plan.plan_number} className="space-y-6">
              {renderResidentsGrid()}
            </TabsContent>
          ))}
        </Tabs>
      ) : (
        renderResidentsGrid()
      )}

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteResident} onOpenChange={() => setDeleteResident(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Resident</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {deleteResident?.first_name} {deleteResident?.last_name}?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteMutation.mutate(deleteResident.id)} className="bg-red-600 hover:bg-red-700">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}