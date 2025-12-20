import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { message_id } = await req.json();
    
    if (!message_id) {
      return Response.json({ error: 'Message ID required' }, { status: 400 });
    }

    // Get the message
    const messages = await base44.asServiceRole.entities.Message.filter({ id: message_id });
    const message = messages[0];
    
    if (!message) {
      return Response.json({ error: 'Message not found' }, { status: 404 });
    }

    // Use AI to categorize and analyze the message
    const analysisPrompt = `Analyze this resident message and provide structured categorization:

Subject: ${message.subject}
Content: ${message.content}

Provide:
1. Category (maintenance, noise_complaint, parking, pets, amenity_booking, bylaw_question, general_inquiry, emergency, other)
2. Priority (low, medium, high, urgent)
3. Tags (array of relevant keywords)
4. Brief summary (1-2 sentences)
5. Suggested assignment (building_manager, maintenance_staff, security, strata_manager)
6. Action required (yes/no and what action)`;

    const analysisResult = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: analysisPrompt,
      response_json_schema: {
        type: "object",
        properties: {
          category: { type: "string" },
          priority: { type: "string" },
          tags: { type: "array", items: { type: "string" } },
          ai_summary: { type: "string" },
          suggested_assignment: { type: "string" },
          action_required: { type: "boolean" },
          action_description: { type: "string" }
        }
      }
    });

    // Get relevant response templates
    const templates = await base44.asServiceRole.entities.MessageTemplate.filter({
      category: analysisResult.category,
      status: 'active'
    });

    let suggestedResponse = null;
    if (templates.length > 0) {
      // Use the first active template and personalize it
      const template = templates[0];
      const building = await base44.asServiceRole.entities.Building.filter({ id: message.building_id });
      
      suggestedResponse = template.content
        .replace(/{resident_name}/g, message.sender_name)
        .replace(/{building_name}/g, building[0]?.name || 'the building')
        .replace(/{subject}/g, message.subject);
    } else {
      // Generate a custom response suggestion
      const responsePrompt = `Generate a professional, empathetic response to this resident message:

Subject: ${message.subject}
Content: ${message.content}

The response should:
- Acknowledge their concern
- Be professional and courteous
- Indicate next steps
- Be 2-3 paragraphs`;

      suggestedResponse = await base44.asServiceRole.integrations.Core.InvokeLLM({
        prompt: responsePrompt
      });
    }

    // Update the message with AI analysis
    await base44.asServiceRole.entities.Message.update(message_id, {
      category: analysisResult.category,
      priority: analysisResult.priority,
      tags: analysisResult.tags,
      ai_summary: analysisResult.ai_summary,
      assigned_role: analysisResult.suggested_assignment,
      suggested_response: suggestedResponse,
      status: 'read'
    });

    return Response.json({
      success: true,
      analysis: analysisResult,
      suggested_response: suggestedResponse
    });

  } catch (error) {
    console.error('Error processing message:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});