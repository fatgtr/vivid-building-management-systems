import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { application_id } = await req.json();

    if (!application_id) {
      return Response.json({ error: 'application_id required' }, { status: 400 });
    }

    // Get application
    const application = await base44.asServiceRole.entities.ContractorApplication.get(application_id);

    if (application.status !== 'pending_review') {
      return Response.json({ 
        error: 'Application is not pending review' 
      }, { status: 400 });
    }

    // Create contractor record
    const contractor = await base44.asServiceRole.entities.Contractor.create({
      company_name: application.company_name,
      abn: application.abn,
      acn: application.acn,
      contact_name: application.contact_name,
      email: application.email,
      phone: application.phone,
      address: application.address,
      specialty: application.specialty,
      license_number: application.license_number,
      hourly_rate: application.hourly_rate,
      notes: application.notes,
      status: 'active',
      compliance_score: 0
    });

    // Create contractor documents from uploaded docs
    if (application.uploaded_documents && application.uploaded_documents.length > 0) {
      for (const doc of application.uploaded_documents) {
        try {
          // Determine status based on expiry
          let status = 'active';
          if (doc.expiry_date) {
            const expiryDate = new Date(doc.expiry_date);
            const today = new Date();
            if (expiryDate < today) {
              status = 'expired';
            }
          }

          await base44.asServiceRole.entities.ContractorDocument.create({
            contractor_id: contractor.id,
            title: doc.title,
            category: doc.category,
            file_url: doc.file_url,
            expiry_date: doc.expiry_date || null,
            status
          });
        } catch (docError) {
          console.error('Failed to create contractor document:', docError);
        }
      }
    }

    // Run initial compliance check
    try {
      await base44.asServiceRole.functions.invoke('checkContractorDocumentCompliance', {
        contractor_id: contractor.id
      });
    } catch (complianceError) {
      console.error('Compliance check failed:', complianceError);
    }

    // Update application
    await base44.asServiceRole.entities.ContractorApplication.update(application_id, {
      status: 'approved',
      contractor_id: contractor.id,
      reviewed_by: user.email,
      reviewed_at: new Date().toISOString()
    });

    // Send approval email to contractor
    try {
      await base44.asServiceRole.integrations.Core.SendEmail({
        to: application.email,
        subject: '🎉 Your Contractor Application Has Been Approved!',
        body: `
<h2>Congratulations!</h2>

<p>Hi ${application.contact_name},</p>

<p>Great news! Your contractor application for <strong>${application.company_name}</strong> has been approved.</p>

<p>You can now log in to the Vivid BMS Contractor Portal to:</p>
<ul>
  <li>View and manage assigned work orders</li>
  <li>Upload and update compliance documents</li>
  <li>Track your performance metrics</li>
  <li>Communicate with building managers</li>
</ul>

<p><strong>Next Steps:</strong></p>
<ol>
  <li>Log in using your email: ${application.email}</li>
  <li>Complete your profile and upload any remaining documents</li>
  <li>Start receiving work orders from building managers</li>
</ol>

<p>Welcome to the Vivid BMS Contractor Network!</p>

<p><em>If you have any questions, please contact support.</em></p>
        `
      });
    } catch (emailError) {
      console.error('Failed to send approval email:', emailError);
    }

    return Response.json({ 
      success: true, 
      contractor_id: contractor.id 
    });

  } catch (error) {
    console.error('Error approving contractor application:', error);
    return Response.json({ 
      error: error.message 
    }, { status: 500 });
  }
});