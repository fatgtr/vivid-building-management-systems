import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { template_id, building_id } = await req.json();

    if (!template_id || !building_id) {
      return Response.json({ error: 'template_id and building_id are required' }, { status: 400 });
    }

    // Get the template
    const templates = await base44.entities.PolicyTemplate.filter({ id: template_id });
    const template = templates[0];

    if (!template) {
      return Response.json({ error: 'Template not found' }, { status: 404 });
    }

    // Get building details
    const buildings = await base44.entities.Building.filter({ id: building_id });
    const building = buildings[0];

    if (!building) {
      return Response.json({ error: 'Building not found' }, { status: 404 });
    }

    // Get relevant documents for this building
    const documents = await base44.entities.Document.filter({ building_id });
    const relevantDocs = documents.filter(doc => 
      (doc.category === 'bylaws' || 
       doc.category === 'strata_management_statement' ||
       doc.category === 'policy') && 
      doc.ocr_content
    );

    // Prepare context from documents
    let documentContext = '';
    if (relevantDocs.length > 0) {
      documentContext = relevantDocs.map(doc => 
        `Document: ${doc.title}\n${doc.ocr_content?.substring(0, 5000)}`
      ).join('\n\n');
    }

    // Replace basic placeholders
    let populatedContent = template.template_content
      .replace(/{building_name}/g, building.name || 'the building')
      .replace(/{strata_plan}/g, building.strata_plan_number || 'this strata plan')
      .replace(/{building_address}/g, building.address || '');

    // Use AI to customize based on building documents
    const prompt = `You are helping customize a policy template for a specific building.

Template: ${template.name}
Policy Type: ${template.policy_type}
Building: ${building.name}
${building.strata_plan_number ? `Strata Plan: ${building.strata_plan_number}` : ''}

Template Content:
${populatedContent}

${documentContext ? `
Building-Specific Documents:
${documentContext}

Customization Instructions:
${template.customization_hints?.join('\n') || 'Review the documents and customize the policy to match building-specific rules, requirements, and procedures.'}
` : 'No building documents available. Keep the template content as-is with minor improvements.'}

Please:
1. Customize the policy content based on the building documents (if available)
2. Replace any remaining placeholders with appropriate content
3. Ensure the policy is specific to this building's rules and requirements
4. Maintain professional and clear language
5. Keep the same structure but add building-specific details

Return the customized policy with enhanced key points.`;

    const result = await base44.integrations.Core.InvokeLLM({
      prompt: prompt,
      response_json_schema: {
        type: "object",
        properties: {
          title: { type: "string" },
          content: { type: "string" },
          key_points: {
            type: "array",
            items: { type: "string" }
          }
        }
      }
    });

    return Response.json({
      success: true,
      policy: {
        building_id: building_id,
        policy_type: template.policy_type,
        title: result.title || template.name,
        content: result.content || populatedContent,
        key_points: result.key_points || template.template_key_points || [],
        applies_to: template.applies_to || 'all_residents',
        status: 'draft',
        review_required: true,
        ai_generated: true
      }
    });

  } catch (error) {
    console.error('Error populating template:', error);
    return Response.json({ 
      error: error.message || 'Failed to populate template' 
    }, { status: 500 });
  }
});