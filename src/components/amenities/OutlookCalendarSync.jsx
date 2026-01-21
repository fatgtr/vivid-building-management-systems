import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, Check, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

export default function OutlookCalendarSync() {
  const [user, setUser] = useState(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    base44.auth.me().then(userData => {
      setUser(userData);
      setIsConnected(!!userData?.outlook_access_token);
    }).catch(() => {});

    // Check for successful connection callback
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('outlook_connected') === 'true') {
      toast.success('Outlook Calendar connected successfully!');
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  const handleConnectOutlook = () => {
    const clientId = 'YOUR_CLIENT_ID'; // This will come from env
    const redirectUri = `${window.location.origin}/api/functions/outlookOAuthCallback`;
    const scope = 'Calendars.ReadWrite offline_access';
    
    const authUrl = `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?` +
      `client_id=${clientId}&` +
      `response_type=code&` +
      `redirect_uri=${encodeURIComponent(redirectUri)}&` +
      `scope=${encodeURIComponent(scope)}&` +
      `response_mode=query`;
    
    window.location.href = authUrl;
  };

  const handleDisconnect = async () => {
    try {
      await base44.auth.updateMe({
        outlook_access_token: null,
        outlook_refresh_token: null,
        outlook_token_expiry: null
      });
      setIsConnected(false);
      toast.success('Outlook Calendar disconnected');
    } catch (error) {
      toast.error('Failed to disconnect');
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5 text-blue-600" />
          Outlook Calendar Integration
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {isConnected ? (
          <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg border border-green-200">
            <div className="flex items-center gap-3">
              <Check className="h-5 w-5 text-green-600" />
              <div>
                <p className="font-medium text-green-900">Connected to Outlook Calendar</p>
                <p className="text-sm text-green-700">Bookings will sync automatically</p>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={handleDisconnect}>
              Disconnect
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-start gap-2 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-blue-900">
                <p className="font-medium mb-1">Connect your Outlook Calendar</p>
                <p>Sync amenity bookings and events to your Outlook calendar automatically.</p>
              </div>
            </div>
            <Button 
              onClick={handleConnectOutlook}
              className="w-full bg-blue-600 hover:bg-blue-700"
            >
              <Calendar className="h-4 w-4 mr-2" />
              Connect Outlook Calendar
            </Button>
          </div>
        )}

        <div className="text-xs text-slate-500 space-y-1">
          <p><strong>Features:</strong></p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li>Automatic sync of amenity bookings</li>
            <li>Real-time calendar updates</li>
            <li>Email reminders from Outlook</li>
            <li>Shared building calendar view</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}