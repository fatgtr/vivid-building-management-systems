import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useSearchParams, Link } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import PageHeader from '@/components/common/PageHeader';
import StatusBadge from '@/components/common/StatusBadge';
import BuildingDocumentManager from '@/components/buildings/BuildingDocumentManager';
import ReportGenerator from '@/components/buildings/ReportGenerator';
import { 
  Building2, 
  MapPin, 
  Home, 
  Users, 
  Wrench,
  ArrowLeft,
  Mail,
  Phone,
  FileText,
  Calendar,
  Vote,
  ScrollText,
  Users,
  Package
} from 'lucide-react';

export default function BuildingProfile() {
  const [searchParams] = useSearchParams();
  const buildingId = searchParams.get('id');
  const queryClient = useQueryClient();

  const { data: building, isLoading: buildingLoading } = useQuery({
    queryKey: ['building', buildingId],
    queryFn: () => base44.entities.Building.list().then(buildings => 
      buildings.find(b => b.id === buildingId)
    ),
    enabled: !!buildingId,
  });

  const { data: units = [] } = useQuery({
    queryKey: ['units', buildingId],
    queryFn: () => base44.entities.Unit.filter({ building_id: buildingId }),
    enabled: !!buildingId,
  });

  const { data: residents = [] } = useQuery({
    queryKey: ['residents', buildingId],
    queryFn: () => base44.entities.Resident.filter({ building_id: buildingId }),
    enabled: !!buildingId,
  });

  const { data: workOrders = [] } = useQuery({
    queryKey: ['workOrders', buildingId],
    queryFn: () => base44.entities.WorkOrder.filter({ building_id: buildingId }),
    enabled: !!buildingId,
  });

  if (!buildingId) {
    return (
      <div className="text-center py-12">
        <p className="text-slate-500">No building selected</p>
        <Link to={createPageUrl('Buildings')}>
          <Button variant="outline" className="mt-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Buildings
          </Button>
        </Link>
      </div>
    );
  }

  if (buildingLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-12 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!building) {
    return (
      <div className="text-center py-12">
        <p className="text-slate-500">Building not found</p>
        <Link to={createPageUrl('Buildings')}>
          <Button variant="outline" className="mt-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Buildings
          </Button>
        </Link>
      </div>
    );
  }

  const activeResidents = residents.filter(r => r.status === 'active').length;
  const openWorkOrders = workOrders.filter(wo => wo.status === 'open' || wo.status === 'in_progress').length;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link to={createPageUrl('Buildings')}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl lg:text-3xl font-bold text-slate-900">{building.name}</h1>
            <StatusBadge status={building.status} />
          </div>
          {building.strata_plan_number && (
            <p className="text-sm text-blue-600 font-medium">Strata Plan: {building.strata_plan_number}</p>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Total Units</p>
                <p className="text-2xl font-bold text-slate-900">{units.length}</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
                <Home className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Active Residents</p>
                <p className="text-2xl font-bold text-slate-900">{activeResidents}</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-emerald-100 flex items-center justify-center">
                <Users className="h-6 w-6 text-emerald-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Open Work Orders</p>
                <p className="text-2xl font-bold text-slate-900">{openWorkOrders}</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-orange-100 flex items-center justify-center">
                <Wrench className="h-6 w-6 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Floors</p>
                <p className="text-2xl font-bold text-slate-900">{building.floors || 'N/A'}</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-purple-100 flex items-center justify-center">
                <Building2 className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="strata">Strata Info</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
          <TabsTrigger value="management">Management</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Building Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-slate-500">Address</p>
                  <div className="flex items-start gap-2 mt-1">
                    <MapPin className="h-4 w-4 text-slate-400 mt-0.5 flex-shrink-0" />
                    <p className="text-slate-900">
                      {building.address}
                      {building.city && `, ${building.city}`}
                      {building.state && `, ${building.state}`}
                      {building.postal_code && ` ${building.postal_code}`}
                    </p>
                  </div>
                </div>

                <div>
                  <p className="text-sm font-medium text-slate-500">Building Type</p>
                  <p className="text-slate-900 mt-1 capitalize">
                    {building.building_type?.replace(/_/g, ' ') || 'N/A'}
                  </p>
                </div>

                <div>
                  <p className="text-sm font-medium text-slate-500">Year Built</p>
                  <p className="text-slate-900 mt-1">{building.year_built || 'N/A'}</p>
                </div>

                <div>
                  <p className="text-sm font-medium text-slate-500">Total Lots</p>
                  <p className="text-slate-900 mt-1">{building.strata_lots || 'N/A'}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {building.manager_name && (
            <Card>
              <CardHeader>
                <CardTitle>Building Manager</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="text-sm font-medium text-slate-500">Name</p>
                  <p className="text-slate-900 mt-1">{building.manager_name}</p>
                </div>
                {building.manager_email && (
                  <div>
                    <p className="text-sm font-medium text-slate-500">Email</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Mail className="h-4 w-4 text-slate-400" />
                      <a href={`mailto:${building.manager_email}`} className="text-blue-600 hover:underline">
                        {building.manager_email}
                      </a>
                    </div>
                  </div>
                )}
                {building.manager_phone && (
                  <div>
                    <p className="text-sm font-medium text-slate-500">Phone</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Phone className="h-4 w-4 text-slate-400" />
                      <a href={`tel:${building.manager_phone}`} className="text-blue-600 hover:underline">
                        {building.manager_phone}
                      </a>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="documents">
          <BuildingDocumentManager buildingId={buildingId} buildingName={building.name} />
        </TabsContent>

        <TabsContent value="strata" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Strata Managing Agent</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {building.strata_managing_agent_name ? (
                <>
                  <div>
                    <p className="text-sm font-medium text-slate-500">Agent Name</p>
                    <p className="text-slate-900 mt-1">{building.strata_managing_agent_name}</p>
                  </div>
                  {building.strata_managing_agent_license && (
                    <div>
                      <p className="text-sm font-medium text-slate-500">License Number</p>
                      <p className="text-slate-900 mt-1">{building.strata_managing_agent_license}</p>
                    </div>
                  )}
                  {building.strata_managing_agent_email && (
                    <div>
                      <p className="text-sm font-medium text-slate-500">Email</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Mail className="h-4 w-4 text-slate-400" />
                        <a href={`mailto:${building.strata_managing_agent_email}`} className="text-blue-600 hover:underline">
                          {building.strata_managing_agent_email}
                        </a>
                      </div>
                    </div>
                  )}
                  {building.strata_managing_agent_phone && (
                    <div>
                      <p className="text-sm font-medium text-slate-500">Phone</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Phone className="h-4 w-4 text-slate-400" />
                        <a href={`tel:${building.strata_managing_agent_phone}`} className="text-blue-600 hover:underline">
                          {building.strata_managing_agent_phone}
                        </a>
                      </div>
                    </div>
                  )}
                  {building.strata_managing_agent_invoicing_email && (
                    <div>
                      <p className="text-sm font-medium text-slate-500">Invoicing Email</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Mail className="h-4 w-4 text-slate-400" />
                        <a href={`mailto:${building.strata_managing_agent_invoicing_email}`} className="text-blue-600 hover:underline">
                          {building.strata_managing_agent_invoicing_email}
                        </a>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <p className="text-slate-500">No strata managing agent information available</p>
              )}
            </CardContent>
          </Card>

          {building.building_compliance_email && (
            <Card>
              <CardHeader>
                <CardTitle>Compliance</CardTitle>
              </CardHeader>
              <CardContent>
                <div>
                  <p className="text-sm font-medium text-slate-500">Compliance Email</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Mail className="h-4 w-4 text-slate-400" />
                    <a href={`mailto:${building.building_compliance_email}`} className="text-blue-600 hover:underline">
                      {building.building_compliance_email}
                    </a>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="reports">
          <ReportGenerator buildingId={buildingId} buildingName={building.name} />
        </TabsContent>

        <TabsContent value="management" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="hover:shadow-lg transition-shadow cursor-pointer">
              <CardContent className="pt-6">
                <div className="flex flex-col items-center text-center space-y-3">
                  <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
                    <Vote className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900">Voting Panel</h3>
                    <p className="text-sm text-slate-500 mt-1">Manage and conduct strata votes</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Link to={createPageUrl('StrataKnowledgeBase')}>
              <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
                <CardContent className="pt-6">
                  <div className="flex flex-col items-center text-center space-y-3">
                    <div className="h-12 w-12 rounded-full bg-emerald-100 flex items-center justify-center">
                      <ScrollText className="h-6 w-6 text-emerald-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-900">By-laws</h3>
                      <p className="text-sm text-slate-500 mt-1">Access building by-laws and regulations</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>

            <Card className="hover:shadow-lg transition-shadow cursor-pointer">
              <CardContent className="pt-6">
                <div className="flex flex-col items-center text-center space-y-3">
                  <div className="h-12 w-12 rounded-full bg-purple-100 flex items-center justify-center">
                    <Users className="h-6 w-6 text-purple-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900">Strata Committee</h3>
                    <p className="text-sm text-slate-500 mt-1">View and manage committee members</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Link to={createPageUrl('AssetRegister') + `?building_id=${buildingId}`}>
              <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
                <CardContent className="pt-6">
                  <div className="flex flex-col items-center text-center space-y-3">
                    <div className="h-12 w-12 rounded-full bg-orange-100 flex items-center justify-center">
                      <Package className="h-6 w-6 text-orange-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-900">Inventory</h3>
                      <p className="text-sm text-slate-500 mt-1">Track building assets and inventory</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}