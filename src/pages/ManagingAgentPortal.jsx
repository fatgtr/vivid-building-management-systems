import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import PageHeader from '@/components/common/PageHeader';
import StatusBadge from '@/components/common/StatusBadge';
import { Users, Upload, FileText, Building2, Home, Calendar, Mail, Loader2, CheckCircle2, AlertCircle, Bell } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

export default function ManagingAgentPortal() {
  const [user, setUser] = useState(null);
  const [uploadingLease, setUploadingLease] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [processingStatus, setProcessingStatus] = useState('');

  const queryClient = useQueryClient();

  React.useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  // Fetch residents where the current user's email matches the managing agent email
  const { data: managedResidents = [], isLoading } = useQuery({
    queryKey: ['managedResidents', user?.email],
    queryFn: async () => {
      if (!user?.email) return [];
      const residents = await base44.entities.Resident.list();
      return residents.filter(r => r.managing_agent_email === user.email);
    },
    enabled: !!user?.email,
  });

  const { data: buildings = [] } = useQuery({
    queryKey: ['buildings'],
    queryFn: () => base44.entities.Building.list(),
  });

  const { data: units = [] } = useQuery({
    queryKey: ['units'],
    queryFn: () => base44.entities.Unit.list(),
  });

  const { data: leaseAnalyses = [] } = useQuery({
    queryKey: ['leaseAnalyses'],
    queryFn: () => base44.entities.LeaseAnalysis.list(),
  });

  const { data: announcements = [] } = useQuery({
    queryKey: ['announcements'],
    queryFn: async () => {
      const buildingIds = [...new Set(managedResidents.map(r => r.building_id))];
      if (buildingIds.length === 0) return [];
      const all = await base44.entities.Announcement.list();
      return all.filter(a => 
        buildingIds.includes(a.building_id) && 
        a.status === 'published'
      );
    },
    enabled: managedResidents.length > 0,
  });

  const { data: workOrders = [] } = useQuery({
    queryKey: ['workOrders'],
    queryFn: async () => {
      const residentEmails = managedResidents.map(r => r.email);
      if (residentEmails.length === 0) return [];
      const all = await base44.entities.WorkOrder.list();
      return all.filter(wo => residentEmails.includes(wo.reported_by));
    },
    enabled: managedResidents.length > 0,
  });

  const getBuildingName = (buildingId) => buildings.find(b => b.id === buildingId)?.name || 'Unknown';
  const getUnitNumber = (unitId) => units.find(u => u.id === unitId)?.unit_number || '';

  const handleFileSelect = (e, resident) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
      setUploadingLease(resident);
    }
  };

  const handleLeaseUpload = async () => {
    if (!selectedFile || !uploadingLease) return;

    setProcessing(true);
    setProcessingStatus('Uploading document...');

    try {
      // Upload the file
      const { file_url } = await base44.integrations.Core.UploadFile({ file: selectedFile });
      
      setProcessingStatus('Analyzing lease with AI...');
      
      // Process the lease through the automated workflow
      const { data: result } = await base44.functions.invoke('processManagingAgentLease', {
        residentId: uploadingLease.id,
        residentEmail: uploadingLease.email,
        buildingId: uploadingLease.building_id,
        unitId: uploadingLease.unit_id,
        fileUrl: file_url,
      });

      if (result.success) {
        toast.success('Lease processed successfully!', {
          description: 'Tenant updated, amenities booked, and documents sent.'
        });
        queryClient.invalidateQueries({ queryKey: ['managedResidents'] });
        queryClient.invalidateQueries({ queryKey: ['leaseAnalyses'] });
        setUploadingLease(null);
        setSelectedFile(null);
      } else {
        toast.error('Processing failed', {
          description: result.error || 'An error occurred during processing'
        });
      }
    } catch (error) {
      console.error('Lease upload error:', error);
      toast.error('Upload failed', {
        description: error.message || 'Failed to process lease'
      });
    } finally {
      setProcessing(false);
      setProcessingStatus('');
    }
  };

  const getLeaseAnalysis = (residentEmail) => {
    return leaseAnalyses.find(l => l.resident_email === residentEmail);
  };

  if (isLoading) {
    return (
      <div className="space-y-8">
        <PageHeader title="Managing Agent Portal" subtitle="Manage your tenants" />
        <Skeleton className="h-96 rounded-xl" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Card className="max-w-md">
          <CardContent className="p-8 text-center">
            <AlertCircle className="h-12 w-12 text-slate-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Authentication Required</h3>
            <p className="text-slate-600">Please log in to access the Managing Agent Portal.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl p-8 text-white">
        <h1 className="text-3xl font-bold mb-2">Managing Agent Portal</h1>
        <p className="text-blue-100">
          Managing {managedResidents.length} tenant{managedResidents.length !== 1 ? 's' : ''} across {new Set(managedResidents.map(r => r.building_id)).size} building{new Set(managedResidents.map(r => r.building_id)).size !== 1 ? 's' : ''}
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-blue-100 rounded-lg">
                <Users className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Total Tenants</p>
                <p className="text-2xl font-bold text-slate-900">{managedResidents.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-green-100 rounded-lg">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Active Leases</p>
                <p className="text-2xl font-bold text-slate-900">
                  {managedResidents.filter(r => r.status === 'active').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-purple-100 rounded-lg">
                <FileText className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Leases Analyzed</p>
                <p className="text-2xl font-bold text-slate-900">{leaseAnalyses.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-orange-100 rounded-lg">
                <Building2 className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Buildings</p>
                <p className="text-2xl font-bold text-slate-900">
                  {new Set(managedResidents.map(r => r.building_id)).size}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Tabs */}
      <Tabs defaultValue="tenants" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="tenants">
            <Users className="h-4 w-4 mr-2" />
            My Tenants
          </TabsTrigger>
          <TabsTrigger value="requests">
            <FileText className="h-4 w-4 mr-2" />
            Maintenance Requests
          </TabsTrigger>
          <TabsTrigger value="announcements">
            <Bell className="h-4 w-4 mr-2" />
            Announcements
          </TabsTrigger>
          <TabsTrigger value="calendar">
            <Calendar className="h-4 w-4 mr-2" />
            Calendar
          </TabsTrigger>
        </TabsList>

        {/* Tenants Tab */}
        <TabsContent value="tenants">
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle>Your Tenants</CardTitle>
            </CardHeader>
            <CardContent>
          {managedResidents.length === 0 ? (
            <div className="text-center py-12">
              <Users className="h-12 w-12 text-slate-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-slate-900 mb-2">No Tenants Found</h3>
              <p className="text-slate-500">
                Residents with your email as managing agent will appear here.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50">
                  <TableHead>Tenant</TableHead>
                  <TableHead>Building & Unit</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Lease Info</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {managedResidents.map((resident) => {
                  const leaseAnalysis = getLeaseAnalysis(resident.email);
                  return (
                    <TableRow key={resident.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium text-slate-900">
                            {resident.first_name} {resident.last_name}
                          </p>
                          <p className="text-xs text-slate-500 capitalize">{resident.resident_type}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 text-sm">
                          <Building2 className="h-4 w-4 text-slate-400" />
                          <span>{getBuildingName(resident.building_id)}</span>
                          <Home className="h-4 w-4 text-slate-400 ml-2" />
                          <span>Unit {getUnitNumber(resident.unit_id)}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <p className="text-slate-900">{resident.email}</p>
                          <p className="text-slate-500">{resident.phone}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        {leaseAnalysis ? (
                          <div className="text-sm">
                            <p className="text-slate-900">
                              {leaseAnalysis.lease_start_date && 
                                new Date(leaseAnalysis.lease_start_date).toLocaleDateString()}
                              {' - '}
                              {leaseAnalysis.lease_end_date && 
                                new Date(leaseAnalysis.lease_end_date).toLocaleDateString()}
                            </p>
                            {leaseAnalysis.monthly_rent && (
                              <p className="text-slate-500">${leaseAnalysis.monthly_rent}/mo</p>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400">No lease data</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={resident.status} />
                      </TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => document.getElementById(`lease-upload-${resident.id}`).click()}
                          className="gap-2"
                        >
                          <Upload className="h-4 w-4" />
                          Upload Lease
                        </Button>
                        <input
                          id={`lease-upload-${resident.id}`}
                          type="file"
                          accept=".pdf,.jpg,.jpeg,.png"
                          className="hidden"
                          onChange={(e) => handleFileSelect(e, resident)}
                        />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Maintenance Requests Tab */}
        <TabsContent value="requests">
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle>Tenant Maintenance Requests</CardTitle>
            </CardHeader>
            <CardContent>
              {workOrders.length === 0 ? (
                <div className="text-center py-12">
                  <FileText className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-slate-900 mb-2">No Maintenance Requests</h3>
                  <p className="text-slate-500">Tenant maintenance requests will appear here.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {workOrders.map((order) => {
                    const tenant = managedResidents.find(r => r.email === order.reported_by);
                    return (
                      <Card key={order.id} className="border shadow-sm">
                        <CardContent className="p-5">
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <StatusBadge status={order.status} />
                                <Badge variant="outline" className="capitalize">{order.priority}</Badge>
                                {tenant && (
                                  <Badge variant="secondary">
                                    {tenant.first_name} {tenant.last_name}
                                  </Badge>
                                )}
                              </div>
                              <h3 className="font-semibold text-lg text-slate-900 mb-1">{order.title}</h3>
                              <p className="text-sm text-slate-600 line-clamp-2">{order.description}</p>
                            </div>
                          </div>
                          <div className="flex items-center justify-between text-sm text-slate-500">
                            <div className="flex items-center gap-4">
                              <span className="capitalize">{order.category?.replace(/_/g, ' ')}</span>
                              {order.due_date && (
                                <span className="flex items-center gap-1">
                                  <Calendar className="h-3 w-3" />
                                  {format(new Date(order.due_date), 'MMM d')}
                                </span>
                              )}
                            </div>
                            <span>{format(new Date(order.created_date), 'MMM d, yyyy')}</span>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Announcements Tab */}
        <TabsContent value="announcements">
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle>Building Announcements</CardTitle>
            </CardHeader>
            <CardContent>
              {announcements.length === 0 ? (
                <div className="text-center py-12">
                  <Bell className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-slate-900 mb-2">No Announcements</h3>
                  <p className="text-slate-500">Building announcements will appear here.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {announcements.map((announcement) => (
                    <Card key={announcement.id} className="border-l-4 border-l-blue-500">
                      <CardContent className="p-6">
                        <div className="flex items-start gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <Badge variant="outline" className="capitalize">{announcement.type}</Badge>
                              {announcement.priority === 'urgent' && (
                                <Badge className="bg-red-600">Urgent</Badge>
                              )}
                            </div>
                            <h3 className="font-semibold text-lg mb-2">{announcement.title}</h3>
                            <div className="prose prose-sm max-w-none text-slate-700" 
                                 dangerouslySetInnerHTML={{ __html: announcement.content }} />
                          </div>
                          <div className="text-xs text-slate-500">
                            {announcement.publish_date && format(new Date(announcement.publish_date), 'MMM d, yyyy')}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Calendar Tab */}
        <TabsContent value="calendar">
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle>Lease & Move-In/Out Calendar</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {managedResidents.map((resident) => {
                  const leaseAnalysis = leaseAnalyses.find(l => l.resident_email === resident.email);
                  if (!leaseAnalysis) return null;
                  
                  return (
                    <Card key={resident.id} className="border">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <h4 className="font-semibold text-slate-900 mb-1">
                              {resident.first_name} {resident.last_name}
                            </h4>
                            <p className="text-sm text-slate-600">
                              {getBuildingName(resident.building_id)} - Unit {getUnitNumber(resident.unit_id)}
                            </p>
                            <div className="mt-2 flex items-center gap-4 text-sm text-slate-600">
                              {leaseAnalysis.lease_start_date && (
                                <div className="flex items-center gap-1">
                                  <Calendar className="h-3 w-3" />
                                  <span>Move-in: {format(new Date(leaseAnalysis.lease_start_date), 'MMM d, yyyy')}</span>
                                </div>
                              )}
                              {leaseAnalysis.lease_end_date && (
                                <div className="flex items-center gap-1">
                                  <Calendar className="h-3 w-3" />
                                  <span>Move-out: {format(new Date(leaseAnalysis.lease_end_date), 'MMM d, yyyy')}</span>
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="text-right">
                            {leaseAnalysis.monthly_rent && (
                              <p className="text-lg font-semibold text-slate-900">${leaseAnalysis.monthly_rent}/mo</p>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
                {managedResidents.filter(r => leaseAnalyses.find(l => l.resident_email === r.email)).length === 0 && (
                  <div className="text-center py-12">
                    <Calendar className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-slate-900 mb-2">No Lease Data</h3>
                    <p className="text-slate-500">Upload lease agreements to see calendar information.</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Lease Upload Dialog */}
      <Dialog open={!!uploadingLease} onOpenChange={() => {
        if (!processing) {
          setUploadingLease(null);
          setSelectedFile(null);
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upload Tenancy Agreement</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <p className="text-sm text-slate-600 mb-2">
                Tenant: <span className="font-medium">
                  {uploadingLease?.first_name} {uploadingLease?.last_name}
                </span>
              </p>
              <p className="text-sm text-slate-600">
                Unit: <span className="font-medium">
                  {getUnitNumber(uploadingLease?.unit_id)} - {getBuildingName(uploadingLease?.building_id)}
                </span>
              </p>
            </div>

            {selectedFile && (
              <div className="bg-slate-50 p-4 rounded-lg">
                <p className="text-sm font-medium text-slate-900 mb-1">Selected File:</p>
                <p className="text-sm text-slate-600">{selectedFile.name}</p>
              </div>
            )}

            {processing && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center gap-3">
                  <Loader2 className="h-5 w-5 text-blue-600 animate-spin" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-blue-900">Processing...</p>
                    <p className="text-xs text-blue-600 mt-1">{processingStatus}</p>
                  </div>
                </div>
              </div>
            )}

            <div className="bg-slate-50 p-4 rounded-lg space-y-2">
              <h4 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                What happens automatically:
              </h4>
              <ul className="text-xs text-slate-600 space-y-1 ml-6">
                <li>• AI extracts lease details (dates, rent, bond, etc.)</li>
                <li>• Updates tenant profile with extracted information</li>
                <li>• Books move-in/move-out lift amenities automatically</li>
                <li>• Sends welcome email with building bylaws</li>
                <li>• Sends bond information and instructions</li>
                <li>• Sends move-in/move-out procedures</li>
              </ul>
            </div>
          </div>

          <DialogFooter>
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => {
                setUploadingLease(null);
                setSelectedFile(null);
              }}
              disabled={processing}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleLeaseUpload}
              disabled={!selectedFile || processing}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {processing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Upload & Process
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}