import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import PageHeader from '@/components/common/PageHeader';
import ContractorWorkOrderCard from '@/components/contractor/ContractorWorkOrderCard';
import ContractorDocuments from '@/components/contractor/ContractorDocuments';
import { Wrench, FileText, Clock, CheckCircle } from 'lucide-react';

export default function ContractorPortal() {
  const [user, setUser] = useState(null);
  const [contractor, setContractor] = useState(null);

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const { data: contractors = [] } = useQuery({
    queryKey: ['contractors'],
    queryFn: () => base44.entities.Contractor.list(),
  });

  const { data: workOrders = [] } = useQuery({
    queryKey: ['contractor-work-orders'],
    queryFn: () => base44.entities.WorkOrder.list('-created_date'),
  });

  useEffect(() => {
    if (user?.email && contractors.length > 0) {
      const found = contractors.find(c => c.email === user.email);
      setContractor(found);
    }
  }, [user, contractors]);

  const myWorkOrders = workOrders.filter(wo => wo.assigned_contractor_id === contractor?.id);
  const openOrders = myWorkOrders.filter(wo => ['open', 'in_progress'].includes(wo.status));
  const completedOrders = myWorkOrders.filter(wo => wo.status === 'completed');

  if (!contractor) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="p-8 text-center max-w-md">
          <CardContent>
            <Wrench className="h-12 w-12 text-slate-400 mx-auto mb-4" />
            <p className="text-slate-600 mb-2">Contractor account not found</p>
            <p className="text-sm text-slate-500">Please contact the building manager to set up your contractor profile.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader 
        title={`Welcome, ${contractor.company_name}`}
        subtitle="Manage your assigned work orders and documents"
      />

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-yellow-100">
                <Clock className="h-6 w-6 text-yellow-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{openOrders.length}</p>
                <p className="text-sm text-slate-500">Active Work Orders</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-green-100">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{completedOrders.length}</p>
                <p className="text-sm text-slate-500">Completed This Month</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-blue-100">
                <FileText className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{contractor.documents?.length || 0}</p>
                <p className="text-sm text-slate-500">Documents on File</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="active" className="space-y-6">
        <TabsList>
          <TabsTrigger value="active">Active Orders ({openOrders.length})</TabsTrigger>
          <TabsTrigger value="completed">Completed ({completedOrders.length})</TabsTrigger>
          <TabsTrigger value="documents">My Documents</TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="space-y-4">
          {openOrders.length === 0 ? (
            <Card className="p-8 text-center">
              <CardContent>
                <Wrench className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                <p className="text-slate-600">No active work orders</p>
              </CardContent>
            </Card>
          ) : (
            openOrders.map(wo => <ContractorWorkOrderCard key={wo.id} workOrder={wo} />)
          )}
        </TabsContent>

        <TabsContent value="completed" className="space-y-4">
          {completedOrders.length === 0 ? (
            <Card className="p-8 text-center">
              <CardContent>
                <CheckCircle className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                <p className="text-slate-600">No completed work orders</p>
              </CardContent>
            </Card>
          ) : (
            completedOrders.map(wo => <ContractorWorkOrderCard key={wo.id} workOrder={wo} />)
          )}
        </TabsContent>

        <TabsContent value="documents">
          <ContractorDocuments contractor={contractor} />
        </TabsContent>
      </Tabs>
    </div>
  );
}