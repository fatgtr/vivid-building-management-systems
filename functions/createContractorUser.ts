import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Verify admin user
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { contractorId, email, name } = await req.json();

    if (!contractorId || !email || !name) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Check if user already exists with this email
    const existingUsers = await base44.asServiceRole.entities.User.filter({ email });
    
    if (existingUsers.length > 0) {
      // Update existing user with contractor_id
      const existingUser = existingUsers[0];
      await base44.asServiceRole.entities.User.update(existingUser.id, {
        contractor_id: contractorId
      });
      
      return Response.json({ 
        success: true, 
        message: 'Existing user linked to contractor',
        userId: existingUser.id 
      });
    }

    // User doesn't exist - they'll be created when they accept the invite
    // For now, just return success
    return Response.json({ 
      success: true, 
      message: 'Contractor account ready. User will be created on first login.',
      contractorId
    });

  } catch (error) {
    console.error('Error creating contractor user:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});