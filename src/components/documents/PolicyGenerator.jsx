import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Sparkles, 
  FileText, 
  CheckCircle, 
  AlertCircle,
  Loader2,
  ChevronRight
} from 'lucide-react';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export default function PolicyGenerator({ document }) {
  const [generatedPolicies, setGeneratedPolicies] = useState([]);
  const queryClient = useQueryClient();

  const generateMutation = useMutation({
    mutationFn: async () => {
      const response = await base44.functions.invoke('generatePolicies', {
        document_id: document.id
      });
      return response.data;
    },
    onSuccess: (data) => {
      setGeneratedPolicies(data.policies || []);
      queryClient.invalidateQueries(['policies']);
      toast.success(data.message || 'Policies generated successfully');
    },
    onError: (error) => {
      toast.error(error.response?.data?.error || 'Failed to generate policies');
    }
  });

  const policyTypeLabels = {
    move_in_move_out: 'Move In/Out',
    pet_policy: 'Pet Policy',
    whs_safety: 'WHS & Safety',
    noise_disturbance: 'Noise & Disturbance',
    parking: 'Parking',
    common_area_usage: 'Common Areas',
    renovation_alterations: 'Renovations',
    waste_management: 'Waste Management',
    smoking: 'Smoking',
    short_term_rental: 'Short-term Rentals',
    guest_policy: 'Guests',
    amenity_usage: 'Amenity Usage',
    general: 'General'
  };

  const policyTypeColors = {
    move_in_move_out: 'bg-blue-100 text-blue-700',
    pet_policy: 'bg-purple-100 text-purple-700',
    whs_safety: 'bg-red-100 text-red-700',
    noise_disturbance: 'bg-orange-100 text-orange-700',
    parking: 'bg-green-100 text-green-700',
    common_area_usage: 'bg-cyan-100 text-cyan-700',
    renovation_alterations: 'bg-yellow-100 text-yellow-700',
    waste_management: 'bg-teal-100 text-teal-700',
    smoking: 'bg-slate-100 text-slate-700',
    short_term_rental: 'bg-pink-100 text-pink-700',
    guest_policy: 'bg-indigo-100 text-indigo-700',
    amenity_usage: 'bg-violet-100 text-violet-700',
    general: 'bg-gray-100 text-gray-700'
  };

  if (!document.ocr_content) {
    return (
      <Card className="border-orange-200 bg-orange-50">
        <CardContent className="p-6">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-orange-600 mt-0.5" />
            <div>
              <h4 className="font-semibold text-orange-900">OCR Processing Required</h4>
              <p className="text-sm text-orange-700 mt-1">
                This document needs to be processed with OCR before policies can be generated.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-blue-600" />
            AI Policy Generator
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-slate-600">
            Automatically extract policies and procedures from this document using AI. The system will analyze the content and create structured policies for move-in/out, pets, WHS, and more.
          </p>

          <Button 
            onClick={() => generateMutation.mutate()}
            disabled={generateMutation.isPending}
            className="w-full"
          >
            {generateMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Generating Policies...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-2" />
                Generate Policies from Document
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {generatedPolicies.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              Generated Policies ({generatedPolicies.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-800">
                  <strong>Note:</strong> All generated policies are in draft status and require review before activation.
                </p>
              </div>

              {generatedPolicies.map((policy) => (
                <Card key={policy.id} className="border-2">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge className={policyTypeColors[policy.policy_type]}>
                            {policyTypeLabels[policy.policy_type] || policy.policy_type}
                          </Badge>
                          <Badge variant="outline" className="text-orange-600 border-orange-300">
                            Review Required
                          </Badge>
                        </div>
                        <h4 className="font-semibold text-slate-900">{policy.title}</h4>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div>
                        <p className="text-xs font-medium text-slate-500 mb-1">Key Points:</p>
                        <ul className="space-y-1">
                          {policy.key_points?.map((point, idx) => (
                            <li key={idx} className="text-sm text-slate-600 flex items-start gap-2">
                              <ChevronRight className="h-4 w-4 text-slate-400 mt-0.5 flex-shrink-0" />
                              <span>{point}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div className="flex items-center gap-4 text-xs text-slate-500 pt-2 border-t">
                        <span>Applies to: <strong>{policy.applies_to?.replace('_', ' ')}</strong></span>
                        {policy.effective_date && (
                          <span>Effective: <strong>{policy.effective_date}</strong></span>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}

              <Link to={createPageUrl('PolicyManagement')}>
                <Button variant="outline" className="w-full">
                  <FileText className="h-4 w-4 mr-2" />
                  View All Policies
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}