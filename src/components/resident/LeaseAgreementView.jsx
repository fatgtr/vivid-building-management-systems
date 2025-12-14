import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
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
import { 
  FileText, 
  Calendar, 
  DollarSign, 
  Home, 
  Download, 
  AlertCircle, 
  CheckCircle2,
  Clock,
  Send,
  ExternalLink,
  Shield,
  PawPrint,
  Trash2
} from 'lucide-react';
import { format, differenceInDays } from 'date-fns';
import { toast } from 'sonner';

export default function LeaseAgreementView({ residentEmail, buildingId }) {
  const [showRenewalDialog, setShowRenewalDialog] = useState(false);
  const [renewalMessage, setRenewalMessage] = useState('');
  const [deleteAgreementId, setDeleteAgreementId] = useState(null);

  const queryClient = useQueryClient();

  // Fetch all rental agreements for this resident
  const { data: rentalAgreements = [] } = useQuery({
    queryKey: ['rentalAgreements', residentEmail],
    queryFn: async () => {
      const residents = await base44.entities.Resident.filter({ email: residentEmail });
      if (!residents || residents.length === 0) return [];
      return base44.entities.RentalAgreement.filter({ resident_id: residents[0].id });
    },
    enabled: !!residentEmail,
  });

  // Fetch lease analysis
  const { data: leaseAnalyses = [], isLoading } = useQuery({
    queryKey: ['leaseAnalyses', residentEmail],
    queryFn: () => base44.entities.LeaseAnalysis.filter({ resident_email: residentEmail }),
    enabled: !!residentEmail,
  });

  const leaseAnalysis = leaseAnalyses.length > 0 ? leaseAnalyses[0] : null;

  // Fetch lease agreement documents
  const { data: leaseDocuments = [] } = useQuery({
    queryKey: ['leaseDocuments', buildingId],
    queryFn: async () => {
      if (!buildingId) return [];
      return base44.entities.Document.filter({ 
        building_id: buildingId,
        category: 'lease_agreement',
        status: 'active'
      });
    },
    enabled: !!buildingId,
  });

  // Fetch building documents (bylaws, policies)
  const { data: buildingDocs = [] } = useQuery({
    queryKey: ['buildingDocs', buildingId],
    queryFn: () => base44.entities.Document.filter({ 
      building_id: buildingId,
      status: 'active'
    }),
    enabled: !!buildingId,
  });

  const bylaws = buildingDocs.filter(doc => 
    doc.category === 'policy' && 
    (doc.title.toLowerCase().includes('bylaw') || doc.title.toLowerCase().includes('rule'))
  );

  const sendRenewalInquiryMutation = useMutation({
    mutationFn: async (message) => {
      const { data } = await base44.functions.invoke('sendLeaseRenewalInquiry', {
        residentEmail,
        leaseEndDate: leaseAnalysis?.lease_end_date,
        message,
      });
      return data;
    },
    onSuccess: () => {
      toast.success('Renewal inquiry sent to building management!');
      setShowRenewalDialog(false);
      setRenewalMessage('');
    },
    onError: () => {
      toast.error('Failed to send renewal inquiry');
    },
  });

  const deleteAgreementMutation = useMutation({
    mutationFn: async (agreementId) => {
      const agreement = await base44.entities.RentalAgreement.get(agreementId);
      
      // Delete associated lease analysis if exists
      const analyses = await base44.entities.LeaseAnalysis.filter({ 
        document_id: agreement.document_id 
      });
      for (const analysis of analyses) {
        await base44.entities.LeaseAnalysis.delete(analysis.id);
      }
      
      // Delete the document
      if (agreement.document_id) {
        const doc = await base44.entities.Document.get(agreement.document_id);
        await base44.entities.Document.delete(agreement.document_id);
        
        // Remove document URL from resident's documents array
        if (agreement.resident_id && doc?.file_url) {
          const resident = await base44.entities.Resident.get(agreement.resident_id);
          if (resident.documents) {
            await base44.entities.Resident.update(agreement.resident_id, {
              documents: resident.documents.filter(url => url !== doc.file_url)
            });
          }
        }
      }
      
      // Delete the rental agreement
      await base44.entities.RentalAgreement.delete(agreementId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rentalAgreements'] });
      queryClient.invalidateQueries({ queryKey: ['leaseAnalyses'] });
      queryClient.invalidateQueries({ queryKey: ['leaseDocuments'] });
      queryClient.invalidateQueries({ queryKey: ['residents'] });
      toast.success('Lease agreement deleted successfully');
      setDeleteAgreementId(null);
    },
    onError: (error) => {
      toast.error('Failed to delete: ' + error.message);
    },
  });

  const handleSendRenewalInquiry = () => {
    if (!renewalMessage.trim()) {
      toast.error('Please enter a message');
      return;
    }
    sendRenewalInquiryMutation.mutate(renewalMessage);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <Clock className="h-8 w-8 mx-auto text-slate-400 animate-spin mb-2" />
          <p className="text-sm text-slate-500">Loading lease information...</p>
        </div>
      </div>
    );
  }

  if (rentalAgreements.length === 0) {
    return (
      <Card className="border-0 shadow-sm">
        <CardContent className="p-12 text-center">
          <FileText className="h-12 w-12 mx-auto text-slate-300 mb-4" />
          <h3 className="text-lg font-semibold mb-2">No Lease Agreement Found</h3>
          <p className="text-slate-600">
            Your lease agreement hasn't been uploaded yet. Please contact building management.
          </p>
        </CardContent>
      </Card>
    );
  }

  // Get the most recent rental agreement
  const currentAgreement = rentalAgreements.sort((a, b) => 
    new Date(b.created_date) - new Date(a.created_date)
  )[0];

  const leaseEndDate = currentAgreement?.lease_end_date ? new Date(currentAgreement.lease_end_date) : null;
  const leaseStartDate = currentAgreement?.lease_start_date ? new Date(currentAgreement.lease_start_date) : null;
  const today = new Date();
  const daysUntilExpiry = leaseEndDate ? differenceInDays(leaseEndDate, today) : null;
  const isExpiringSoon = daysUntilExpiry !== null && daysUntilExpiry > 0 && daysUntilExpiry <= 90;
  const isExpired = daysUntilExpiry !== null && daysUntilExpiry < 0;

  return (
    <div className="space-y-6">
      {/* All Lease Agreements */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-blue-600" />
              Lease Agreements
            </div>
            <Badge variant="outline">{rentalAgreements.length} Agreement{rentalAgreements.length !== 1 ? 's' : ''}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {rentalAgreements.map((agreement) => {
            const agreementDoc = leaseDocuments.find(d => d.id === agreement.document_id);
            const isCurrentLease = agreement.id === currentAgreement?.id;
            
            return (
              <div key={agreement.id} className={`p-4 rounded-lg border-2 ${isCurrentLease ? 'border-blue-200 bg-blue-50' : 'border-slate-200 bg-slate-50'}`}>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h4 className="font-semibold text-slate-900">{agreementDoc?.title || 'Lease Agreement'}</h4>
                      {isCurrentLease && <Badge className="bg-blue-600">Current</Badge>}
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      {agreement.lease_start_date && (
                        <div>
                          <span className="text-slate-500">Start:</span>{' '}
                          <span className="font-medium">{format(new Date(agreement.lease_start_date), 'MMM d, yyyy')}</span>
                        </div>
                      )}
                      {agreement.lease_end_date && (
                        <div>
                          <span className="text-slate-500">End:</span>{' '}
                          <span className="font-medium">{format(new Date(agreement.lease_end_date), 'MMM d, yyyy')}</span>
                        </div>
                      )}
                      {agreement.rent_amount && (
                        <div>
                          <span className="text-slate-500">Rent:</span>{' '}
                          <span className="font-medium">${agreement.rent_amount.toLocaleString()}</span>
                        </div>
                      )}
                      {agreement.bond_amount && (
                        <div>
                          <span className="text-slate-500">Bond:</span>{' '}
                          <span className="font-medium">${agreement.bond_amount.toLocaleString()}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2 ml-4">
                    {agreementDoc?.file_url && (
                      <a href={agreementDoc.file_url} target="_blank" rel="noopener noreferrer">
                        <Button variant="ghost" size="sm">
                          <Download className="h-4 w-4" />
                        </Button>
                      </a>
                    )}
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => setDeleteAgreementId(agreement.id)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Lease Status Banner */}
      {isExpired && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4 flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h4 className="font-semibold text-red-900 mb-1">Lease Expired</h4>
              <p className="text-sm text-red-700">
                Your lease expired on {format(leaseEndDate, 'MMMM d, yyyy')}. Please contact building management to discuss renewal or moving arrangements.
              </p>
            </div>
            <Button onClick={() => setShowRenewalDialog(true)} className="bg-red-600 hover:bg-red-700">
              Contact Management
            </Button>
          </CardContent>
        </Card>
      )}

      {isExpiringSoon && (
        <Card className="border-orange-200 bg-orange-50">
          <CardContent className="p-4 flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-orange-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h4 className="font-semibold text-orange-900 mb-1">Lease Ending Soon</h4>
              <p className="text-sm text-orange-700">
                Your lease ends in {daysUntilExpiry} days on {format(leaseEndDate, 'MMMM d, yyyy')}. Consider starting renewal discussions.
              </p>
            </div>
            <Button onClick={() => setShowRenewalDialog(true)} variant="outline" className="border-orange-300">
              Discuss Renewal
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Lease Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-0 shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
                <Calendar className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-xs text-slate-500">Lease Period</p>
                <p className="font-semibold text-slate-900">
                  {leaseStartDate && leaseEndDate 
                    ? `${differenceInDays(leaseEndDate, leaseStartDate)} days`
                    : 'N/A'}
                </p>
              </div>
            </div>
            <div className="text-xs text-slate-600 space-y-1">
              <div>Start: {leaseStartDate ? format(leaseStartDate, 'MMM d, yyyy') : 'N/A'}</div>
              <div>End: {leaseEndDate ? format(leaseEndDate, 'MMM d, yyyy') : 'N/A'}</div>
            </div>
          </CardContent>
        </Card>

        {currentAgreement?.rent_amount && (
          <Card className="border-0 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center">
                  <DollarSign className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-xs text-slate-500">Rent</p>
                  <p className="font-semibold text-slate-900 text-xl">
                    ${currentAgreement.rent_amount.toLocaleString()}
                  </p>
                  <p className="text-xs text-slate-500">{currentAgreement.rent_frequency || 'per month'}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {currentAgreement?.bond_amount && (
          <Card className="border-0 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-lg bg-purple-50 flex items-center justify-center">
                  <Shield className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-xs text-slate-500">Security Deposit</p>
                  <p className="font-semibold text-slate-900 text-xl">
                    ${currentAgreement.bond_amount.toLocaleString()}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Lease Details */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Lease Details
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {currentAgreement?.pet_policy && (
              <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg">
                <PawPrint className="h-5 w-5 text-slate-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-slate-900 mb-1">Pet Policy</p>
                  <p className="text-sm text-slate-600">{currentAgreement.pet_policy}</p>
                </div>
              </div>
            )}

            {currentAgreement?.parking_included !== null && (
              <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg">
                <Home className="h-5 w-5 text-slate-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-slate-900 mb-1">Parking</p>
                  <div className="flex items-center gap-2">
                    {currentAgreement.parking_included ? (
                      <Badge className="bg-green-100 text-green-700 border-green-200">
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        Included
                      </Badge>
                    ) : (
                      <Badge variant="outline">Not Included</Badge>
                    )}
                  </div>
                  {currentAgreement.parking_details && (
                    <p className="text-sm text-slate-600 mt-1">{currentAgreement.parking_details}</p>
                  )}
                </div>
              </div>
            )}
          </div>

          {currentAgreement?.special_conditions && currentAgreement.special_conditions.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-slate-900 mb-2">Special Conditions</h4>
              <ul className="space-y-2">
                {currentAgreement.special_conditions.map((clause, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-sm text-slate-600">
                    <span className="text-blue-600 mt-1">•</span>
                    <span>{clause}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Related Documents */}
      {bylaws.length > 0 && (
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Building Documents
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {bylaws.map((doc) => (
              <div key={doc.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <FileText className="h-5 w-5 text-slate-600" />
                  <div>
                    <p className="font-medium text-slate-900">{doc.title}</p>
                    <p className="text-xs text-slate-500 capitalize">{doc.category?.replace(/_/g, ' ')}</p>
                  </div>
                </div>
                {doc.file_url && (
                  <a href={doc.file_url} target="_blank" rel="noopener noreferrer">
                    <Button variant="ghost" size="sm">
                      <ExternalLink className="h-4 w-4 mr-2" />
                      View
                    </Button>
                  </a>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Lease Actions */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-semibold text-slate-900 mb-1">Need to Discuss Your Lease?</h4>
              <p className="text-sm text-slate-600">
                Contact building management about lease renewal, modifications, or questions.
              </p>
            </div>
            <Button onClick={() => setShowRenewalDialog(true)} className="bg-blue-600 hover:bg-blue-700">
              <Send className="h-4 w-4 mr-2" />
              Contact Management
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Renewal Dialog */}
      <Dialog open={showRenewalDialog} onOpenChange={setShowRenewalDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Contact Building Management</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-slate-600">
              Send a message to building management about your lease renewal or any lease-related questions.
            </p>
            <div>
              <label className="text-sm font-medium text-slate-900 mb-2 block">Your Message</label>
              <Textarea
                value={renewalMessage}
                onChange={(e) => setRenewalMessage(e.target.value)}
                placeholder="I would like to discuss renewing my lease..."
                rows={5}
              />
            </div>
            {leaseEndDate && (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-xs text-blue-800">
                  <strong>Current lease ends:</strong> {format(leaseEndDate, 'MMMM d, yyyy')}
                  {daysUntilExpiry !== null && daysUntilExpiry > 0 && (
                    <span> ({daysUntilExpiry} days remaining)</span>
                  )}
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRenewalDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleSendRenewalInquiry}
              disabled={sendRenewalInquiryMutation.isPending}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {sendRenewalInquiryMutation.isPending ? 'Sending...' : 'Send Message'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteAgreementId} onOpenChange={() => setDeleteAgreementId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Lease Agreement</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this lease agreement? This will also remove the associated document and analysis, and cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => deleteAgreementMutation.mutate(deleteAgreementId)}
              className="bg-red-600 hover:bg-red-700"
              disabled={deleteAgreementMutation.isPending}
            >
              {deleteAgreementMutation.isPending ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}