import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  FileText, 
  Sparkles, 
  Calendar, 
  DollarSign, 
  PawPrint, 
  Car,
  AlertCircle,
  MessageSquare,
  Loader2,
  CheckCircle2,
  Truck
} from 'lucide-react';
import { format } from 'date-fns';

export default function LeaseAnalyzer({ document, userEmail }) {
  const [analyzing, setAnalyzing] = useState(false);
  const [question, setQuestion] = useState('');
  const [askingQuestion, setAskingQuestion] = useState(false);
  const [qaPairs, setQaPairs] = useState([]);

  const queryClient = useQueryClient();

  const { data: analysis } = useQuery({
    queryKey: ['leaseAnalysis', document.id],
    queryFn: async () => {
      const analyses = await base44.entities.LeaseAnalysis.filter({ 
        document_id: document.id,
        resident_email: userEmail 
      });
      return analyses[0];
    },
    enabled: !!document.id && !!userEmail,
  });

  const analyzeMutation = useMutation({
    mutationFn: async () => {
      const result = await base44.functions.invoke('analyzeLeaseDocument', {
        documentUrl: document.file_url,
        documentId: document.id
      });
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leaseAnalysis'] });
    },
  });

  const handleAnalyze = async () => {
    setAnalyzing(true);
    try {
      await analyzeMutation.mutateAsync();
    } finally {
      setAnalyzing(false);
    }
  };

  const handleAskQuestion = async () => {
    if (!question.trim()) return;

    setAskingQuestion(true);
    try {
      const result = await base44.functions.invoke('askLeaseQuestion', {
        question,
        documentUrl: document.file_url,
        leaseAnalysisId: analysis?.id
      });

      setQaPairs([...qaPairs, { 
        question, 
        answer: result.data.answer 
      }]);
      setQuestion('');
    } finally {
      setAskingQuestion(false);
    }
  };

  return (
    <div className="space-y-4">
      {!analysis ? (
        <Card>
          <CardContent className="p-6">
            <div className="text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-blue-50 flex items-center justify-center mx-auto">
                <Sparkles className="h-8 w-8 text-blue-600" />
              </div>
              <div>
                <h3 className="font-semibold text-lg mb-2">AI Lease Analysis</h3>
                <p className="text-sm text-slate-600 mb-4">
                  Let our AI analyze your lease agreement to extract key information and answer your questions.
                </p>
              </div>
              <Button 
                onClick={handleAnalyze} 
                disabled={analyzing}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {analyzing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    Analyze Lease
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Summary */}
          {analysis.full_analysis && (
            <Alert className="bg-blue-50 border-blue-200">
              <Sparkles className="h-4 w-4 text-blue-600" />
              <AlertDescription>
                <p className="text-sm text-blue-900 font-medium mb-1">Lease Summary</p>
                <p className="text-sm text-blue-800">
                  {JSON.parse(analysis.full_analysis).summary}
                </p>
              </AlertDescription>
            </Alert>
          )}

          {/* Key Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {analysis.lease_start_date && (
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center flex-shrink-0">
                      <Calendar className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                      <p className="text-sm text-slate-500">Lease Start Date</p>
                      <p className="font-semibold text-slate-900">
                        {format(new Date(analysis.lease_start_date), 'MMM d, yyyy')}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {analysis.lease_end_date && (
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-lg bg-orange-50 flex items-center justify-center flex-shrink-0">
                      <Calendar className="h-5 w-5 text-orange-600" />
                    </div>
                    <div>
                      <p className="text-sm text-slate-500">Lease End Date</p>
                      <p className="font-semibold text-slate-900">
                        {format(new Date(analysis.lease_end_date), 'MMM d, yyyy')}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {analysis.monthly_rent && (
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                      <DollarSign className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm text-slate-500">Monthly Rent</p>
                      <p className="font-semibold text-slate-900">
                        ${analysis.monthly_rent.toLocaleString()}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {analysis.security_deposit && (
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-lg bg-purple-50 flex items-center justify-center flex-shrink-0">
                      <DollarSign className="h-5 w-5 text-purple-600" />
                    </div>
                    <div>
                      <p className="text-sm text-slate-500">Security Deposit</p>
                      <p className="font-semibold text-slate-900">
                        ${analysis.security_deposit.toLocaleString()}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Pet Policy */}
          {analysis.pet_policy && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <PawPrint className="h-5 w-5 text-slate-600" />
                  Pet Policy
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-slate-700">{analysis.pet_policy}</p>
              </CardContent>
            </Card>
          )}

          {/* Parking */}
          {(analysis.parking_included || analysis.parking_details) && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Car className="h-5 w-5 text-slate-600" />
                  Parking
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  {analysis.parking_included && (
                    <Badge className="bg-green-100 text-green-800">Included</Badge>
                  )}
                  {analysis.parking_details && (
                    <p className="text-sm text-slate-700">{analysis.parking_details}</p>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Special Clauses */}
          {analysis.special_clauses && analysis.special_clauses.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <AlertCircle className="h-5 w-5 text-slate-600" />
                  Special Clauses
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {analysis.special_clauses.map((clause, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm text-slate-700">
                      <span className="text-blue-600 mt-1">•</span>
                      <span>{clause}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {/* Lift Bookings */}
          {(analysis.move_in_lift_booking_id || analysis.move_out_lift_booking_id) && (
            <Alert className="bg-green-50 border-green-200">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertDescription>
                <div className="space-y-2">
                  <p className="text-sm text-green-900 font-medium">
                    <Truck className="h-4 w-4 inline mr-1" />
                    Lift Bookings Auto-Created
                  </p>
                  <p className="text-sm text-green-800">
                    {analysis.move_in_lift_booking_id && 'Move-in lift reservation has been automatically scheduled. '}
                    {analysis.move_out_lift_booking_id && 'Move-out lift reservation has been automatically scheduled for your lease end date.'}
                  </p>
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Q&A Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <MessageSquare className="h-5 w-5 text-slate-600" />
                Ask Questions About Your Lease
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {qaPairs.map((pair, idx) => (
                <div key={idx} className="space-y-2">
                  <div className="bg-blue-50 rounded-lg p-3">
                    <p className="text-sm font-medium text-blue-900">Q: {pair.question}</p>
                  </div>
                  <div className="bg-slate-50 rounded-lg p-3">
                    <p className="text-sm text-slate-700">A: {pair.answer}</p>
                  </div>
                </div>
              ))}

              <div className="flex gap-2">
                <Input
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  placeholder="Ask about your lease..."
                  onKeyPress={(e) => e.key === 'Enter' && handleAskQuestion()}
                  disabled={askingQuestion}
                />
                <Button 
                  onClick={handleAskQuestion}
                  disabled={!question.trim() || askingQuestion}
                >
                  {askingQuestion ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    'Ask'
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}