import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { jsPDF } from 'npm:jspdf@2.5.2';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { 
      template_id, 
      building_id, 
      resident_id, 
      unit_id,
      work_order_id,
      inspection_id,
      contractor_id,
      asset_id,
      lease_agreement_id,
      compliance_record_id,
      custom_variables = {} 
    } = await req.json();

    if (!template_id) {
      return Response.json({ error: 'template_id is required' }, { status: 400 });
    }

    // Fetch template
    const template = await base44.asServiceRole.entities.DocumentTemplate.get(template_id);
    if (!template) {
      return Response.json({ error: 'Template not found' }, { status: 404 });
    }

    // Fetch all required data based on template data sources
    const data = {};

    if (template.data_sources.includes('building') && building_id) {
      data.building = await base44.asServiceRole.entities.Building.get(building_id);
    }

    if (template.data_sources.includes('resident') && resident_id) {
      data.resident = await base44.asServiceRole.entities.Resident.get(resident_id);
    }

    if (template.data_sources.includes('unit') && unit_id) {
      data.unit = await base44.asServiceRole.entities.Unit.get(unit_id);
    }

    if (template.data_sources.includes('work_order') && work_order_id) {
      data.work_order = await base44.asServiceRole.entities.WorkOrder.get(work_order_id);
    }

    if (template.data_sources.includes('inspection') && inspection_id) {
      data.inspection = await base44.asServiceRole.entities.Inspection.get(inspection_id);
    }

    if (template.data_sources.includes('contractor') && contractor_id) {
      data.contractor = await base44.asServiceRole.entities.Contractor.get(contractor_id);
    }

    if (template.data_sources.includes('asset') && asset_id) {
      data.asset = await base44.asServiceRole.entities.Asset.get(asset_id);
    }

    if (template.data_sources.includes('lease_agreement') && lease_agreement_id) {
      data.lease_agreement = await base44.asServiceRole.entities.RentalAgreement.get(lease_agreement_id);
    }

    if (template.data_sources.includes('compliance_record') && compliance_record_id) {
      data.compliance_record = await base44.asServiceRole.entities.ComplianceRecord.get(compliance_record_id);
    }

    // Add custom variables
    data.custom = custom_variables;

    // Add current date
    data.current_date = new Date().toLocaleDateString('en-AU', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
    data.current_year = new Date().getFullYear();

    // Use AI to intelligently fill the template
    const prompt = `You are a property management document generator. Fill in this template with the provided data.

Template Type: ${template.template_type}
Template Content:
${template.content}

Available Data:
${JSON.stringify(data, null, 2)}

Instructions:
1. Replace all placeholders in the format {{variable.field}} with actual data
2. If a placeholder references missing data, use appropriate fallback text like "[Not Provided]" or remove the line
3. Format dates in Australian format (DD/MM/YYYY)
4. Ensure proper formatting, spacing, and professional language
5. For lease agreements and legal notices, ensure all required clauses are present
6. Return ONLY the filled document content, no explanations

Generate the complete filled document:`;

    const aiResponse = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: prompt,
      add_context_from_internet: false
    });

    const filledContent = aiResponse;

    // Generate PDF if requested
    if (template.output_format === 'pdf') {
      const doc = new jsPDF();
      
      // Split content into lines and add to PDF
      const pageWidth = doc.internal.pageSize.getWidth();
      const margin = 20;
      const maxWidth = pageWidth - (margin * 2);
      
      const lines = doc.splitTextToSize(filledContent, maxWidth);
      
      let y = margin;
      const lineHeight = 7;
      const pageHeight = doc.internal.pageSize.getHeight();
      
      for (let i = 0; i < lines.length; i++) {
        if (y + lineHeight > pageHeight - margin) {
          doc.addPage();
          y = margin;
        }
        doc.text(lines[i], margin, y);
        y += lineHeight;
      }

      const pdfBytes = doc.output('arraybuffer');

      return new Response(pdfBytes, {
        status: 200,
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="${template.name.replace(/\s+/g, '_')}_${Date.now()}.pdf"`
        }
      });
    }

    // Return HTML/text content
    return Response.json({ 
      content: filledContent,
      template_name: template.name,
      template_type: template.template_type,
      format: template.output_format
    });

  } catch (error) {
    console.error('Error generating document:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});