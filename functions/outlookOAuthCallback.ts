import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const url = new URL(req.url);
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state');

    if (!code) {
      return Response.json({ error: 'No authorization code provided' }, { status: 400 });
    }

    const tokenResponse = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: Deno.env.get('MICROSOFT_CLIENT_ID'),
        client_secret: Deno.env.get('MICROSOFT_CLIENT_SECRET'),
        code,
        redirect_uri: `${url.origin}/api/functions/outlookOAuthCallback`,
        grant_type: 'authorization_code',
        scope: 'Calendars.ReadWrite offline_access'
      })
    });

    if (!tokenResponse.ok) {
      const error = await tokenResponse.text();
      console.error('Token exchange failed:', error);
      return Response.json({ error: 'Failed to exchange code for token' }, { status: 500 });
    }

    const tokens = await tokenResponse.json();
    
    // Store tokens for the user
    const user = await base44.auth.me();
    await base44.auth.updateMe({
      outlook_access_token: tokens.access_token,
      outlook_refresh_token: tokens.refresh_token,
      outlook_token_expiry: new Date(Date.now() + tokens.expires_in * 1000).toISOString()
    });

    // Redirect back to the app
    return Response.redirect(`${url.origin}/amenities?outlook_connected=true`, 302);
  } catch (error) {
    console.error('OAuth callback error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});