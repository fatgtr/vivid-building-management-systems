import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Verify authenticated user
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { contractorId, email, companyName, contactName } = await req.json();

    if (!contractorId || !email || !companyName || !contactName) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Invite the contractor to register as a user
    await base44.users.inviteUser(email, 'user');

    return Response.json({ 
      success: true, 
      message: 'Portal invite sent successfully to ' + email 
    });

  } catch (error) {
    console.error('Error sending contractor invite:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});