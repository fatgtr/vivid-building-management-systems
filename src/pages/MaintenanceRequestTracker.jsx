import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  CheckCircle2, Clock, Wrench, AlertCircle, Search,
  Calendar, Building2, Home, ArrowLeft, Loader2, ClipboardList
} from 'lucide-react';
import VividLogo from '@/components/marketing/VividLogo';
import { format } from 'date-fns';

const STATUS_CONFIG = {
  open: { label: 'Received', icon: ClipboardList, color: 'bg-blue-100 text-blue-700', step: 1 },
  in_progress: { label: 'In Progress', icon: Wrench, color: 'bg-amber-100 text-amber-700', step: 2 },
  on_hold: { label: 'On Hold', icon: Clock, color: 'bg-slate-100 text-slate-700', step: 2 },
  tenant_reported_awaiting_agent: { label: 'Pending Review', icon: Clock, color: 'bg-purple-100 text-purple-700', step: 1 },
  completed: { label: 'Completed', icon: CheckCircle2, color: 'bg-green-100 text-green-700', step: 3 },
  cancelled: { label: 'Cancelled', icon: AlertCircle, color: 'bg-red-100 text-red-700', step: 0 },
};

const PRIORITY_CONFIG = {
  low: { label: 'Low', color: 'bg-slate-100 text-slate-600' },
  medium: { label: 'Medium', color: 'bg-amber-100 text-amber-700' },
  high: { label: 'High', color: 'bg-orange-100 text-orange-700' },
  urgent: { label: 'Urgent', color: 'bg-red-100 text-red-700' },
};

export default function MaintenanceRequestTracker() {
  const [workOrder, setWorkOrder] = useState(null);
  const [building, setBuilding] = useState(null);
  const [loading, setLoading] = useState(false);
  const [searchId, setSearchId] = useState('');
  const [error, setError] = useState('');
  const [searched, setSearched] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const id = params.get('id');
    if (id) {
      fetchWorkOrder(id);
    }
  }, []);

  const fetchWorkOrder = async (id) => {
    setLoading(true);
    setError('');
    setSearched(true);
    try {
      const wo = await base44.entities.WorkOrder.filter({ id });
      if (wo && wo.length > 0) {
        setWorkOrder(wo[0]);
        const buildings = await base44.entities.Building.filter({ id: wo[0].building_id });
        if (buildings.length > 0) setBuilding(buildings[0]);
      } else {
        setWorkOrder(null);
        setError('No maintenance request found with that reference number.');
      }
    } catch {
      setError('Unable to find that request. Please check the reference number.');
      setWorkOrder(null);
    }
    setLoading(false);
  };

  const handleSearch = (e) => {
    e.preventDefault();
    if (!searchId.trim()) return;
    fetchWorkOrder(searchId.trim());
  };

  const statusInfo = workOrder ? (STATUS_CONFIG[workOrder.status] || STATUS_CONFIG.open) : null;
  const priorityInfo = workOrder ? (PRIORITY_CONFIG[workOrder.priority] || PRIORITY_CONFIG.medium) : null;

  const steps = [
    { label: 'Request Received', desc: 'Your request has been logged in our system' },
    { label: 'Being Actioned', desc: 'Our team is working on your request' },
    { label: 'Resolved', desc: 'The issue has been resolved' },
  ];

  const currentStep = statusInfo?.step ?? 1;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex flex-col">
      <header className="bg-white border-b border-slate-200 shadow-sm sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 h-16 flex items-center justify-between">
          <VividLogo />
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <Search className="h-4 w-4" />
            <span className="hidden sm:inline">Request Tracker</span>
          </div>
        </div>
      </header>

      <div className="flex-1 max-w-2xl mx-auto w-full px-4 py-8">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#00529F]/10 rounded-full mb-4">
            <Search className="h-4 w-4 text-[#00529F]" />
            <span className="text-[#00529F] font-semibold text-sm">Track Your Request</span>
          </div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Maintenance Request Status</h1>
          <p className="text-slate-600">Enter your reference number to check the status of your request.</p>
        </div>

        {/* Search */}
        <Card className="border border-slate-200 shadow-sm mb-6">
          <CardContent className="pt-6">
            <form onSubmit={handleSearch} className="flex gap-3">
              <div className="flex-1">
                <Label className="sr-only">Reference Number</Label>
                <Input
                  placeholder="Enter reference number (e.g. A1B2C3D4)"
                  value={searchId}
                  onChange={e => setSearchId(e.target.value.trim())}
                  className="font-mono"
                />
              </div>
              <Button type="submit" disabled={loading} className="bg-[#00529F] hover:bg-[#003d75] text-white">
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              </Button>
            </form>
            {error && (
              <div className="flex items-center gap-2 mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0" />
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Result */}
        {workOrder && (
          <div className="space-y-4">
            {/* Status Overview */}
            <Card className="border-2 border-[#00529F]/20 shadow-sm">
              <CardContent className="p-6">
                <div className="flex items-start justify-between gap-4 mb-6">
                  <div>
                    <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Reference</p>
                    <p className="font-mono font-bold text-[#00529F] text-lg">{workOrder.id.slice(-8).toUpperCase()}</p>
                  </div>
                  <Badge className={`${statusInfo.color} text-sm px-3 py-1 font-semibold`}>
                    {statusInfo.label}
                  </Badge>
                </div>

                {/* Progress Steps */}
                {workOrder.status !== 'cancelled' && (
                  <div className="mb-6">
                    <div className="flex items-center gap-0">
                      {steps.map((step, idx) => {
                        const stepNum = idx + 1;
                        const isCompleted = currentStep > stepNum;
                        const isCurrent = currentStep === stepNum;
                        const isUpcoming = currentStep < stepNum;
                        return (
                          <React.Fragment key={idx}>
                            <div className="flex flex-col items-center flex-shrink-0">
                              <div className={`w-9 h-9 rounded-full flex items-center justify-center border-2 transition-all ${
                                isCompleted ? 'bg-green-500 border-green-500' :
                                isCurrent ? 'bg-[#00529F] border-[#00529F]' :
                                'bg-white border-slate-300'
                              }`}>
                                {isCompleted ? (
                                  <CheckCircle2 className="h-5 w-5 text-white" />
                                ) : isCurrent ? (
                                  <div className="w-3 h-3 bg-white rounded-full" />
                                ) : (
                                  <div className="w-3 h-3 bg-slate-300 rounded-full" />
                                )}
                              </div>
                              <p className={`text-xs mt-1.5 font-medium text-center max-w-[80px] ${
                                isCurrent ? 'text-[#00529F]' : isCompleted ? 'text-green-600' : 'text-slate-400'
                              }`}>{step.label}</p>
                            </div>
                            {idx < steps.length - 1 && (
                              <div className={`flex-1 h-0.5 mb-5 mx-1 ${
                                currentStep > idx + 1 ? 'bg-green-400' : 'bg-slate-200'
                              }`} />
                            )}
                          </React.Fragment>
                        );
                      })}
                    </div>
                    <p className="text-center text-sm text-slate-500 mt-2">{steps[Math.min(currentStep - 1, 2)]?.desc}</p>
                  </div>
                )}

                {workOrder.status === 'cancelled' && (
                  <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg mb-4">
                    <AlertCircle className="h-4 w-4 text-red-500" />
                    <p className="text-sm text-red-700">This request has been cancelled. Please contact building management if you need assistance.</p>
                  </div>
                )}

                {/* Details */}
                <div className="space-y-3 pt-4 border-t border-slate-100">
                  <h3 className="font-semibold text-slate-900">{workOrder.title}</h3>
                  <p className="text-sm text-slate-600">{workOrder.description}</p>

                  <div className="grid grid-cols-2 gap-3 mt-3">
                    {building && (
                      <div className="flex items-center gap-2 text-sm text-slate-600">
                        <Building2 className="h-4 w-4 text-slate-400 flex-shrink-0" />
                        <span>{building.name}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <Calendar className="h-4 w-4 text-slate-400 flex-shrink-0" />
                      <span>Submitted {format(new Date(workOrder.created_date), 'dd MMM yyyy')}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <AlertCircle className="h-4 w-4 text-slate-400 flex-shrink-0" />
                      <Badge className={`${priorityInfo.color} text-xs`}>{priorityInfo.label} Priority</Badge>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Photos */}
            {workOrder.photos?.length > 0 && (
              <Card className="border border-slate-200 shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Attached Photos</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {workOrder.photos.map((url, idx) => (
                      <img key={idx} src={url} alt="" className="w-24 h-24 object-cover rounded-lg border border-slate-200" />
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Resolution Notes */}
            {workOrder.resolution_notes && (
              <Card className="border border-green-200 bg-green-50 shadow-sm">
                <CardContent className="p-4">
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-green-800 text-sm mb-1">Resolution Notes</p>
                      <p className="text-green-700 text-sm">{workOrder.resolution_notes}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => window.location.href = '/MaintenanceRequest'}
              >
                <ArrowLeft className="mr-2 h-4 w-4" /> Submit New Request
              </Button>
              <Button
                className="flex-1 bg-[#00529F] hover:bg-[#003d75] text-white"
                onClick={() => fetchWorkOrder(workOrder.id)}
                disabled={loading}
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Refresh Status'}
              </Button>
            </div>
          </div>
        )}

        {/* No result yet */}
        {!workOrder && !loading && !searched && (
          <Card className="border border-dashed border-slate-300 shadow-none">
            <CardContent className="py-12 text-center">
              <ClipboardList className="h-12 w-12 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-500">Enter your reference number above to check your request status.</p>
              <Button
                variant="link"
                className="mt-3 text-[#00529F]"
                onClick={() => window.location.href = '/MaintenanceRequest'}
              >
                Haven't submitted a request yet? Do it here →
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      <footer className="py-6 text-center text-sm text-slate-400 border-t border-slate-200 bg-white">
        <span>Powered by </span>
        <span className="font-semibold text-[#00529F]">Vivid BMS</span>
        <span> · Secure resident maintenance portal</span>
      </footer>
    </div>
  );
}