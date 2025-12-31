import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle, Loader2, XCircle } from 'lucide-react';

export default function VerifyContractor() {
  const [status, setStatus] = useState('verifying');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');

    if (!token) {
      setStatus('error');
      setMessage('Invalid verification link');
      return;
    }

    base44.functions.invoke('verifyContractorApplication', { token })
      .then(() => {
        setStatus('success');
        setMessage('Your email has been verified! Building managers will review your application shortly.');
      })
      .catch((error) => {
        setStatus('error');
        setMessage(error.message || 'Verification failed. Please try again or contact support.');
      });
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center p-6">
      <Card className="max-w-md w-full">
        <CardContent className="pt-6 text-center">
          {status === 'verifying' && (
            <>
              <Loader2 className="h-12 w-12 text-blue-600 animate-spin mx-auto mb-4" />
              <h2 className="text-xl font-bold text-slate-900 mb-2">Verifying your email...</h2>
              <p className="text-slate-600">Please wait</p>
            </>
          )}

          {status === 'success' && (
            <>
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
              <h2 className="text-2xl font-bold text-slate-900 mb-2">Email Verified!</h2>
              <p className="text-slate-600">{message}</p>
            </>
          )}

          {status === 'error' && (
            <>
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <XCircle className="h-8 w-8 text-red-600" />
              </div>
              <h2 className="text-2xl font-bold text-slate-900 mb-2">Verification Failed</h2>
              <p className="text-slate-600">{message}</p>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}