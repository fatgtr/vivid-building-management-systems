import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { CreditCard, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function StripeCheckoutButton({ bookingId, amount, label = "Pay Now" }) {
  const [isProcessing, setIsProcessing] = useState(false);

  const handleCheckout = async () => {
    // Check if running in iframe (preview mode)
    if (window.self !== window.top) {
      toast.error('Payment checkout is only available in the published app. Please open the app in a new tab.');
      return;
    }

    setIsProcessing(true);
    
    try {
      const response = await base44.functions.invoke('createBookingCheckout', { bookingId });
      
      if (response.data.url) {
        // Redirect to Stripe Checkout
        window.location.href = response.data.url;
      } else {
        toast.error('Failed to create checkout session');
      }
    } catch (error) {
      console.error('Checkout error:', error);
      toast.error('Failed to initiate payment. Please try again.');
      setIsProcessing(false);
    }
  };

  return (
    <Button 
      onClick={handleCheckout}
      disabled={isProcessing}
      className="bg-blue-600 hover:bg-blue-700"
    >
      {isProcessing ? (
        <>
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          Processing...
        </>
      ) : (
        <>
          <CreditCard className="h-4 w-4 mr-2" />
          {label} ${amount}
        </>
      )}
    </Button>
  );
}