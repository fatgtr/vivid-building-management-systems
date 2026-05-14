import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { contractor_id, building_id } = await req.json();

    if (!contractor_id) {
      return Response.json({ error: 'Contractor ID is required' }, { status: 400 });
    }

    // Fetch contractor details
    const contractor = await base44.asServiceRole.entities.Contractor.filter({ id: contractor_id });
    if (!contractor || contractor.length === 0) {
      return Response.json({ error: 'Contractor not found' }, { status: 404 });
    }

    const contractorData = contractor[0];

    // Get buildings - either specific building or all buildings
    let buildings = [];
    if (building_id) {
      const building = await base44.asServiceRole.entities.Building.filter({ id: building_id });
      buildings = building;
    } else {
      buildings = await base44.asServiceRole.entities.Building.list();
    }

    if (!buildings || buildings.length === 0) {
      return Response.json({ error: 'No buildings found' }, { status: 404 });
    }

    const emailsSent = [];
    const errors = [];

    // Send email to each building's strata managing agent
    for (const building of buildings) {
      if (!building.strata_managing_agent_email) {
        errors.push({
          building: building.name,
          error: 'No strata managing agent email configured'
        });
        continue;
      }

      try {
        const emailSubject = `Contractor Compliance Information - ${contractorData.company_name}`;
        
        let emailBody = `Dear ${building.strata_managing_agent_name || 'Strata Manager'},\n\n`;
        emailBody += `Please find below the compliance information for contractor ${contractorData.company_name}.\n`;
        emailBody += `This information is being submitted for your records and compliance requirements.\n\n`;
        emailBody += `${'='.repeat(60)}\n`;
        emailBody += `CONTRACTOR INFORMATION\n`;
        emailBody += `${'='.repeat(60)}\n\n`;
        
        emailBody += `Company Name: ${contractorData.company_name}\n`;
        emailBody += `Contact Person: ${contractorData.contact_name}\n`;
        emailBody += `Email: ${contractorData.email}\n`;
        if (contractorData.phone) emailBody += `Phone: ${contractorData.phone}\n`;
        if (contractorData.address) emailBody += `Address: ${contractorData.address}\n`;
        emailBody += `\n`;

        emailBody += `${'='.repeat(60)}\n`;
        emailBody += `BUSINESS REGISTRATION\n`;
        emailBody += `${'='.repeat(60)}\n\n`;
        
        if (contractorData.abn) emailBody += `ABN: ${contractorData.abn}\n`;
        if (contractorData.acn) emailBody += `ACN: ${contractorData.acn}\n`;
        if (contractorData.specialty?.length > 0) {
          emailBody += `Specialties: ${contractorData.specialty.map(s => s.replace(/_/g, ' ')).join(', ')}\n`;
        }
        emailBody += `\n`;

        emailBody += `${'='.repeat(60)}\n`;
        emailBody += `COMPLIANCE & INSURANCE DETAILS\n`;
        emailBody += `${'='.repeat(60)}\n\n`;

        if (contractorData.license_number) {
          emailBody += `License Number: ${contractorData.license_number}\n`;
          if (contractorData.license_expiry_date) {
            emailBody += `License Expiry: ${contractorData.license_expiry_date}\n`;
          }
          emailBody += `\n`;
        }

        if (contractorData.insurance_details) {
          emailBody += `Insurance Details: ${contractorData.insurance_details}\n`;
          if (contractorData.insurance_expiry) {
            emailBody += `Insurance Expiry: ${contractorData.insurance_expiry}\n`;
          }
          emailBody += `\n`;
        }

        if (contractorData.work_cover_details) {
          emailBody += `Work Cover Details: ${contractorData.work_cover_details}\n`;
          if (contractorData.work_cover_expiry_date) {
            emailBody += `Work Cover Expiry: ${contractorData.work_cover_expiry_date}\n`;
          }
          emailBody += `\n`;
        }

        if (contractorData.public_liability_details) {
          emailBody += `Public Liability Details: ${contractorData.public_liability_details}\n`;
          if (contractorData.public_liability_expiry_date) {
            emailBody += `Public Liability Expiry: ${contractorData.public_liability_expiry_date}\n`;
          }
          emailBody += `\n`;
        }

        if (contractorData.documents?.length > 0) {
          emailBody += `${'='.repeat(60)}\n`;
          emailBody += `ATTACHED DOCUMENTS\n`;
          emailBody += `${'='.repeat(60)}\n\n`;
          emailBody += `${contractorData.documents.length} compliance document(s) on file:\n`;
          contractorData.documents.forEach((doc, index) => {
            emailBody += `${index + 1}. ${doc.name || 'Document'}\n`;
            emailBody += `   URL: ${doc.url}\n`;
          });
          emailBody += `\n`;
        }

        emailBody += `${'='.repeat(60)}\n\n`;
        emailBody += `This information is current as of ${new Date().toLocaleDateString()}.\n\n`;
        emailBody += `For any queries regarding this contractor, please contact:\n`;
        emailBody += `${user.full_name}\n`;
        emailBody += `${user.email}\n\n`;
        emailBody += `Building: ${building.name}\n`;
        if (building.strata_plan_number) {
          emailBody += `Strata Plan: ${building.strata_plan_number}\n`;
        }
        emailBody += `\n`;
        emailBody += `This is an automated message from the Property Management System.\n`;

        await base44.asServiceRole.integrations.Core.SendEmail({
          to: building.strata_managing_agent_email,
          subject: emailSubject,
          body: emailBody
        });

        emailsSent.push({
          building: building.name,
          email: building.strata_managing_agent_email
        });

      } catch (error) {
        errors.push({
          building: building.name,
          error: error.message
        });
      }
    }

    return Response.json({
      success: true,
      message: 'Contractor information sent to strata manager(s)',
      emailsSent,
      errors: errors.length > 0 ? errors : undefined
    });

  } catch (error) {
    console.error('Send contractor to strata error:', error);
    return Response.json({ 
      success: false,
      error: error.message 
    }, { status: 500 });
  }
});