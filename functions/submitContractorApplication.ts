import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

function generateToken() {
  return Array.from(crypto.getRandomValues(new Uint8Array(32)))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const applicationData = await req.json();

    // Check if email already exists
    const existingContractors = await base44.asServiceRole.entities.Contractor.filter({ 
      email: applicationData.email 
    });
    
    if (existingContractors.length > 0) {
      return Response.json({ 
        error: 'A contractor with this email already exists' 
      }, { status: 400 });
    }

    // Check for pending applications
    const pendingApps = await base44.asServiceRole.entities.ContractorApplication.filter({ 
      email: applicationData.email,
      status: 'pending_verification'
    });

    if (pendingApps.length > 0) {
      return Response.json({ 
        error: 'An application with this email is already pending' 
      }, { status: 400 });
    }

    // Generate verification token
    const verificationToken = generateToken();

    // Create application
    const application = await base44.asServiceRole.entities.ContractorApplication.create({
      ...applicationData,
      status: 'pending_verification',
      verification_token: verificationToken
    });

    // Send verification email
    const verificationUrl = `${new URL(req.url).origin}/verify-contractor?token=${verificationToken}`;
    
    try {
      await base44.asServiceRole.integrations.Core.SendEmail({
        to: applicationData.email,
        subject: 'Verify Your Contractor Application',
        body: `
<h2>Welcome to Vivid BMS Contractor Network</h2>

<p>Hi ${applicationData.contact_name},</p>

<p>Thank you for applying to join our contractor network. Please verify your email address to continue with your application.</p>

<p><a href="${verificationUrl}" style="display: inline-block; padding: 12px 24px; background-color: #2563eb; color: white; text-decoration: none; border-radius: 6px;">Verify Email Address</a></p>

<p>Or copy and paste this link into your browser:</p>
<p>${verificationUrl}</p>

<p><strong>Application Details:</strong></p>
<ul>
  <li>Company: ${applicationData.company_name}</li>
  <li>Email: ${applicationData.email}</li>
  <li>Phone: ${applicationData.phone}</li>
</ul>

<p>Once verified, building managers will review your application.</p>

<p><em>This link will expire in 48 hours.</em></p>
        `
      });
    } catch (emailError) {
      console.error('Failed to send verification email:', emailError);
      // Continue anyway - application is created
    }

    return Response.json({ 
      success: true, 
      application_id: application.id 
    });

  } catch (error) {
    console.error('Error submitting contractor application:', error);
    return Response.json({ 
      error: error.message 
    }, { status: 500 });
  }
});