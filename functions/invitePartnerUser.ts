import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Verify admin user
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { email, full_name, partner_id, partner_role, assigned_buildings } = await req.json();

    if (!email || !full_name || !partner_id || !partner_role) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Check if user already exists
    const existingUsers = await base44.asServiceRole.entities.User.list();
    const existingUser = existingUsers.find(u => u.email === email);

    if (existingUser) {
      // Update existing user with partner info
      await base44.asServiceRole.entities.User.update(existingUser.id, {
        partner_id,
        partner_role,
        assigned_buildings: assigned_buildings || [],
      });

      // Send notification email
      await base44.integrations.Core.SendEmail({
        to: email,
        subject: 'You have been added to a partner organization',
        body: `Hi ${full_name},\n\nYou have been added to a partner organization on Vivid BMS with the role: ${partner_role}.\n\nPlease log in to access your dashboard.\n\nBest regards,\nVivid BMS Team`,
      });

      return Response.json({ 
        success: true, 
        message: 'User updated with partner access',
        user_id: existingUser.id 
      });
    } else {
      // For new users, we need to send an invitation
      // Since Base44 doesn't have a built-in user invitation system,
      // we'll send an email with instructions to sign up
      
      await base44.integrations.Core.SendEmail({
        to: email,
        subject: 'Invitation to join Vivid BMS',
        body: `Hi ${full_name},\n\nYou have been invited to join Vivid BMS as a ${partner_role}.\n\nPlease sign up using this email address to activate your account.\n\nOnce you sign up, you will have access to your assigned buildings and features.\n\nBest regards,\nVivid BMS Team`,
      });

      return Response.json({ 
        success: true, 
        message: 'Invitation email sent. User will be added when they sign up.',
        pending_email: email 
      });
    }

  } catch (error) {
    console.error('Error inviting user:', error);
    return Response.json({ 
      error: error.message || 'Failed to invite user' 
    }, { status: 500 });
  }
});