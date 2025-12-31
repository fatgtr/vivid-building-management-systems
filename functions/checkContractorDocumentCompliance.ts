import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { contractor_id } = await req.json();

    if (!contractor_id) {
      return Response.json({ error: 'contractor_id required' }, { status: 400 });
    }

    // Fetch contractor and their documents
    const contractor = await base44.asServiceRole.entities.Contractor.get(contractor_id);
    const documents = await base44.asServiceRole.entities.ContractorDocument.filter({ 
      contractor_id 
    });

    const today = new Date();
    const fifteenDaysFromNow = new Date(today);
    fifteenDaysFromNow.setDate(today.getDate() + 15);

    let updatedDocuments = [];
    let notificationsToSend = [];

    // Check each document
    for (const doc of documents) {
      if (!doc.expiry_date) continue;

      const expiryDate = new Date(doc.expiry_date);
      let newStatus = doc.status;
      let needsUpdate = false;

      // Check if expired
      if (expiryDate < today && doc.status !== 'expired') {
        newStatus = 'expired';
        needsUpdate = true;
        notificationsToSend.push({
          doc,
          reason: 'expired',
          daysUntilExpiry: Math.floor((expiryDate - today) / (1000 * 60 * 60 * 24))
        });
      }
      // Check if expiring within 15 days
      else if (expiryDate <= fifteenDaysFromNow && expiryDate >= today && doc.status === 'active') {
        newStatus = 'needs_review';
        needsUpdate = true;
        notificationsToSend.push({
          doc,
          reason: 'expiring_soon',
          daysUntilExpiry: Math.ceil((expiryDate - today) / (1000 * 60 * 60 * 24))
        });
      }

      if (needsUpdate) {
        await base44.asServiceRole.entities.ContractorDocument.update(doc.id, {
          status: newStatus
        });
        updatedDocuments.push({ ...doc, status: newStatus });
      }
    }

    // Calculate compliance score
    const totalDocs = documents.length;
    if (totalDocs === 0) {
      await base44.asServiceRole.entities.Contractor.update(contractor_id, {
        compliance_score: 0
      });
      return Response.json({ 
        compliance_score: 0, 
        updated_documents: 0,
        notifications_sent: 0
      });
    }

    // Reload documents to get updated statuses
    const updatedDocsList = await base44.asServiceRole.entities.ContractorDocument.filter({ 
      contractor_id 
    });

    const activeDocs = updatedDocsList.filter(d => d.status === 'active').length;
    const complianceScore = Math.round((activeDocs / totalDocs) * 100);

    // Update contractor compliance score
    await base44.asServiceRole.entities.Contractor.update(contractor_id, {
      compliance_score: complianceScore
    });

    // Send notifications
    if (notificationsToSend.length > 0) {
      // Get all buildings linked to this contractor
      const allBuildings = await base44.asServiceRole.entities.Building.list();
      const contractorBuildings = allBuildings.filter(b => 
        contractor.building_ids?.includes(b.id)
      );

      // Get admin users
      const allUsers = await base44.asServiceRole.entities.User.list();
      const admins = allUsers.filter(u => u.role === 'admin');

      // Prepare notification recipients
      const recipients = new Set();

      // Add building managers
      for (const building of contractorBuildings) {
        if (building.manager_email) {
          recipients.add(building.manager_email);
        }
        if (building.building_compliance_email) {
          recipients.add(building.building_compliance_email);
        }
      }

      // Add at least one admin
      if (admins.length > 0) {
        recipients.add(admins[0].email);
      }

      // Send email notifications
      for (const recipient of recipients) {
        const docList = notificationsToSend.map(n => {
          const daysText = n.reason === 'expired' 
            ? `Expired ${Math.abs(n.daysUntilExpiry)} days ago`
            : `Expires in ${n.daysUntilExpiry} days`;
          
          return `• ${n.doc.title} (${n.doc.category.replace(/_/g, ' ')}): ${daysText}`;
        }).join('\n');

        try {
          await base44.asServiceRole.integrations.Core.SendEmail({
            to: recipient,
            subject: `⚠️ Contractor Compliance Alert: ${contractor.company_name}`,
            body: `
<h2>Contractor Compliance Alert</h2>

<p><strong>Contractor:</strong> ${contractor.company_name}</p>
<p><strong>Contact:</strong> ${contractor.email || 'N/A'}</p>
<p><strong>Compliance Score:</strong> ${complianceScore}%</p>

<h3>Documents Requiring Attention:</h3>
<pre>${docList}</pre>

<p>Please review these documents and contact the contractor to ensure compliance.</p>

<p><em>This is an automated notification from the Vivid BMS system.</em></p>
            `
          });
        } catch (emailError) {
          console.error('Failed to send email to', recipient, emailError);
        }
      }

      // Create in-app notifications
      for (const recipient of recipients) {
        try {
          await base44.asServiceRole.entities.Notification.create({
            user_email: recipient,
            type: 'compliance',
            title: `Contractor Compliance Alert: ${contractor.company_name}`,
            message: `${notificationsToSend.length} document(s) require attention. Compliance score: ${complianceScore}%`,
            link: `/contractors`,
            read: false
          });
        } catch (notifError) {
          console.error('Failed to create notification for', recipient, notifError);
        }
      }
    }

    return Response.json({
      compliance_score: complianceScore,
      updated_documents: updatedDocuments.length,
      notifications_sent: notificationsToSend.length,
      documents_checked: totalDocs
    });

  } catch (error) {
    console.error('Error checking contractor compliance:', error);
    return Response.json({ 
      error: error.message 
    }, { status: 500 });
  }
});