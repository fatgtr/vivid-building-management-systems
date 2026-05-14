import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { document_id } = await req.json();

    if (!document_id) {
      return Response.json({ error: 'document_id is required' }, { status: 400 });
    }

    // Get the document
    const documents = await base44.entities.Document.filter({ id: document_id });
    const document = documents[0];

    if (!document) {
      return Response.json({ error: 'Document not found' }, { status: 404 });
    }

    // Check if OCR content exists
    if (!document.ocr_content) {
      return Response.json({ 
        error: 'Document has not been processed with OCR yet. Please process the document first.' 
      }, { status: 400 });
    }

    // Use AI to extract policies from the document
    const prompt = `Analyze the following building document and extract all policies and procedures.

Document Type: ${document.category}
Document Title: ${document.title}

Document Content:
${document.ocr_content}

Extract and structure policies in the following categories:
1. Move-in/Move-out procedures
2. Pet policies
3. WHS/Safety policies
4. Noise and disturbance policies
5. Parking policies
6. Common area usage
7. Renovation/alteration policies
8. Waste management
9. Smoking policies
10. Short-term rental policies
11. Guest policies
12. Amenity usage policies

For each policy found, provide:
- policy_type: one of [move_in_move_out, pet_policy, whs_safety, noise_disturbance, parking, common_area_usage, renovation_alterations, waste_management, smoking, short_term_rental, guest_policy, amenity_usage, general]
- title: clear descriptive title
- content: full policy text with procedures and requirements
- key_points: array of 3-5 key requirements or highlights
- applies_to: who this applies to [all_residents, owners_only, tenants_only, contractors, visitors]
- effective_date: if mentioned in the document (format: YYYY-MM-DD)

Only include policies that are explicitly mentioned or clearly implied in the document. Do not invent policies.`;

    const result = await base44.integrations.Core.InvokeLLM({
      prompt: prompt,
      response_json_schema: {
        type: "object",
        properties: {
          policies: {
            type: "array",
            items: {
              type: "object",
              properties: {
                policy_type: { type: "string" },
                title: { type: "string" },
                content: { type: "string" },
                key_points: {
                  type: "array",
                  items: { type: "string" }
                },
                applies_to: { type: "string" },
                effective_date: { type: "string" }
              },
              required: ["policy_type", "title", "content", "key_points"]
            }
          }
        }
      }
    });

    const policies = result.policies || [];
    const createdPolicies = [];

    // Create policy records
    for (const policy of policies) {
      const policyData = {
        building_id: document.building_id,
        source_document_id: document_id,
        policy_type: policy.policy_type,
        title: policy.title,
        content: policy.content,
        key_points: policy.key_points,
        applies_to: policy.applies_to || 'all_residents',
        effective_date: policy.effective_date || null,
        ai_generated: true,
        review_required: true,
        status: 'draft'
      };

      const created = await base44.asServiceRole.entities.Policy.create(policyData);
      createdPolicies.push(created);
    }

    return Response.json({
      success: true,
      message: `Successfully generated ${createdPolicies.length} policies from document`,
      policies: createdPolicies
    });

  } catch (error) {
    console.error('Error generating policies:', error);
    return Response.json({ 
      error: error.message || 'Failed to generate policies' 
    }, { status: 500 });
  }
});