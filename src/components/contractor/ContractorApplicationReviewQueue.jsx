import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { FileText, CheckCircle, XCircle, Loader2, Eye, Mail, Phone, MapPin } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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

export default function ContractorApplicationReviewQueue() {
  const [viewingApp, setViewingApp] = useState(null);
  const [rejectingApp, setRejectingApp] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const queryClient = useQueryClient();

  const { data: applications = [], isLoading } = useQuery({
    queryKey: ['contractorApplications'],
    queryFn: () => base44.entities.ContractorApplication.filter({ status: 'pending_review' }, '-created_date'),
  });

  const approveMutation = useMutation({
    mutationFn: (appId) => base44.functions.invoke('approveContractorApplication', { application_id: appId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contractorApplications'] });
      queryClient.invalidateQueries({ queryKey: ['contractors'] });
      toast.success('Contractor approved and account created');
      setViewingApp(null);
    },
    onError: (error) => {
      toast.error('Failed to approve: ' + error.message);
    }
  });

  const rejectMutation = useMutation({
    mutationFn: ({ appId, reason }) => base44.functions.invoke('rejectContractorApplication', { 
      application_id: appId, 
      reason 
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contractorApplications'] });
      toast.success('Application rejected');
      setRejectingApp(null);
      setRejectReason('');
    },
    onError: (error) => {
      toast.error('Failed to reject: ' + error.message);
    }
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (applications.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <CheckCircle className="h-12 w-12 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-500">No applications pending review</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="space-y-4">
        {applications.map((app) => (
          <Card key={app.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <h3 className="text-lg font-semibold text-slate-900">{app.company_name}</h3>
                    <Badge variant="outline" className="text-orange-600 border-orange-200">
                      Pending Review
                    </Badge>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3 text-sm text-slate-600">
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-slate-400" />
                      {app.email}
                    </div>
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-slate-400" />
                      {app.phone}
                    </div>
                    {app.specialty && app.specialty.length > 0 && (
                      <div className="col-span-2 flex items-center gap-2 flex-wrap">
                        {app.specialty.map((s, idx) => (
                          <Badge key={idx} variant="secondary" className="text-xs">{s}</Badge>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2 mt-3 text-xs text-slate-500">
                    <FileText className="h-3 w-3" />
                    {app.uploaded_documents?.length || 0} documents uploaded
                    <span className="mx-1">•</span>
                    Applied {format(new Date(app.created_date), 'PPp')}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setViewingApp(app)}
                  >
                    <Eye className="h-4 w-4 mr-1" />
                    Review
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => approveMutation.mutate(app.id)}
                    disabled={approveMutation.isPending}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <CheckCircle className="h-4 w-4 mr-1" />
                    Approve
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setRejectingApp(app)}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <XCircle className="h-4 w-4 mr-1" />
                    Reject
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* View Application Dialog */}
      <Dialog open={!!viewingApp} onOpenChange={() => setViewingApp(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{viewingApp?.company_name}</DialogTitle>
            <DialogDescription>Review application details</DialogDescription>
          </DialogHeader>

          {viewingApp && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs text-slate-500">Company Name</Label>
                  <p className="font-medium">{viewingApp.company_name}</p>
                </div>
                <div>
                  <Label className="text-xs text-slate-500">Contact Name</Label>
                  <p className="font-medium">{viewingApp.contact_name}</p>
                </div>
                <div>
                  <Label className="text-xs text-slate-500">Email</Label>
                  <p className="font-medium">{viewingApp.email}</p>
                </div>
                <div>
                  <Label className="text-xs text-slate-500">Phone</Label>
                  <p className="font-medium">{viewingApp.phone}</p>
                </div>
                {viewingApp.abn && (
                  <div>
                    <Label className="text-xs text-slate-500">ABN</Label>
                    <p className="font-medium">{viewingApp.abn}</p>
                  </div>
                )}
                {viewingApp.license_number && (
                  <div>
                    <Label className="text-xs text-slate-500">License Number</Label>
                    <p className="font-medium">{viewingApp.license_number}</p>
                  </div>
                )}
                {viewingApp.experience_years && (
                  <div>
                    <Label className="text-xs text-slate-500">Years of Experience</Label>
                    <p className="font-medium">{viewingApp.experience_years}</p>
                  </div>
                )}
                {viewingApp.hourly_rate && (
                  <div>
                    <Label className="text-xs text-slate-500">Hourly Rate</Label>
                    <p className="font-medium">${viewingApp.hourly_rate}</p>
                  </div>
                )}
              </div>

              {viewingApp.address && (
                <div>
                  <Label className="text-xs text-slate-500">Address</Label>
                  <p className="text-sm">{viewingApp.address}</p>
                </div>
              )}

              {viewingApp.specialty && viewingApp.specialty.length > 0 && (
                <div>
                  <Label className="text-xs text-slate-500 mb-2 block">Specialties</Label>
                  <div className="flex flex-wrap gap-2">
                    {viewingApp.specialty.map((s, idx) => (
                      <Badge key={idx} variant="secondary">{s}</Badge>
                    ))}
                  </div>
                </div>
              )}

              {viewingApp.services_description && (
                <div>
                  <Label className="text-xs text-slate-500">Services Description</Label>
                  <p className="text-sm mt-1">{viewingApp.services_description}</p>
                </div>
              )}

              {viewingApp.uploaded_documents && viewingApp.uploaded_documents.length > 0 && (
                <div>
                  <Label className="text-xs text-slate-500 mb-2 block">Uploaded Documents</Label>
                  <div className="space-y-2">
                    {viewingApp.uploaded_documents.map((doc, idx) => (
                      <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-slate-500" />
                          <div>
                            <p className="text-sm font-medium">{doc.title}</p>
                            <div className="flex items-center gap-2 text-xs text-slate-500">
                              <Badge variant="outline" className="text-xs">
                                {doc.category.replace(/_/g, ' ')}
                              </Badge>
                              {doc.expiry_date && (
                                <span>Expires: {format(new Date(doc.expiry_date), 'PP')}</span>
                              )}
                            </div>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => window.open(doc.file_url, '_blank')}
                        >
                          View
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setViewingApp(null)}>
              Close
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setRejectingApp(viewingApp);
                setViewingApp(null);
              }}
              className="text-red-600 hover:text-red-700"
            >
              <XCircle className="h-4 w-4 mr-1" />
              Reject
            </Button>
            <Button
              onClick={() => {
                approveMutation.mutate(viewingApp.id);
              }}
              disabled={approveMutation.isPending}
              className="bg-green-600 hover:bg-green-700"
            >
              {approveMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              ) : (
                <CheckCircle className="h-4 w-4 mr-1" />
              )}
              Approve
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <AlertDialog open={!!rejectingApp} onOpenChange={() => setRejectingApp(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reject Application</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to reject this contractor application?
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="space-y-2">
            <Label>Reason for Rejection (optional)</Label>
            <Textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Provide a reason that will be sent to the applicant..."
              rows={4}
            />
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setRejectingApp(null);
              setRejectReason('');
            }}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => rejectMutation.mutate({ 
                appId: rejectingApp.id, 
                reason: rejectReason 
              })}
              className="bg-red-600 hover:bg-red-700"
              disabled={rejectMutation.isPending}
            >
              {rejectMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              ) : (
                'Reject Application'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}