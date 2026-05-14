import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { residentEmail, documentType, buildingId } = await req.json();

    if (!residentEmail || !documentType || !buildingId) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Find the relevant bylaw document for the building
    const documents = await base44.asServiceRole.entities.Document.filter({
      building_id: buildingId,
      category: 'policy',
      status: 'active'
    });

    // Look for bylaws document (case-insensitive)
    const bylawDocument = documents.find(doc => 
      doc.title?.toLowerCase().includes('bylaw') || 
      doc.title?.toLowerCase().includes('by-law')
    );

    if (!bylawDocument) {
      console.log('No bylaw document found for building:', buildingId);
      return Response.json({ 
        success: false, 
        message: 'No bylaw document found for this building' 
      }, { status: 404 });
    }

    // Send email to the resident with the document
    const emailSubject = `Building Bylaws for Your ${documentType} Booking`;
    const emailBody = `
      <h2>Building Bylaws</h2>
      <p>Dear Resident,</p>
      <p>Thank you for booking the ${documentType}.</p>
      <p>As per building policy, please find a copy of the building bylaws for your reference:</p>
      <p><strong><a href="${bylawDocument.file_url}" style="color: #2563eb; text-decoration: none;">Download Building Bylaws</a></strong></p>
      <p>Please review these bylaws carefully before your move.</p>
      <br>
      <p>Sincerely,<br>Building Management</p>
    `;

    await base44.asServiceRole.integrations.Core.SendEmail({
      to: residentEmail,
      subject: emailSubject,
      body: emailBody,
    });

    // Update LeaseAnalysis to mark document as sent
    const leaseAnalyses = await base44.asServiceRole.entities.LeaseAnalysis.filter({
      resident_email: residentEmail
    });

    if (leaseAnalyses.length > 0) {
      const leaseAnalysis = leaseAnalyses[0];
      const updateData = {};
      
      if (documentType.includes('move-in') || documentType.includes('Move-in')) {
        updateData.move_in_document_sent = true;
      } else if (documentType.includes('move-out') || documentType.includes('Move-out')) {
        updateData.move_out_document_sent = true;
      }
      
      await base44.asServiceRole.entities.LeaseAnalysis.update(leaseAnalysis.id, updateData);
    }

    return Response.json({ 
      success: true, 
      message: 'Bylaw document sent successfully',
      document: bylawDocument.title
    });

  } catch (error) {
    console.error('Error sending bylaw document:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});