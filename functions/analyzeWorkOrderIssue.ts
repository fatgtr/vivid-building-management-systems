import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { description, conversationHistory } = await req.json();

    if (!description) {
      return Response.json({ error: 'description is required' }, { status: 400 });
    }

    // Build conversation context
    let prompt = `You are a helpful building maintenance assistant helping a resident describe their maintenance issue.

Current issue description: "${description}"

${conversationHistory && conversationHistory.length > 0 ? `
Previous conversation:
${conversationHistory.map(msg => `${msg.role}: ${msg.content}`).join('\n')}
` : ''}

Please analyze this maintenance issue and provide:
1. The most appropriate category from: plumbing, electrical, hvac, appliance, structural, pest_control, cleaning, landscaping, security, other
2. Suggested priority level (low, medium, high, urgent) based on severity and urgency
3. A brief explanation for the priority suggestion
4. 2-3 clarifying questions to gather more details (only if needed - if description is already detailed, return empty array)
5. Initial troubleshooting steps the resident can try (2-4 steps, simple and safe - only for non-urgent issues)
6. Whether this is likely an emergency that needs immediate attention

Be conversational, helpful, and empathetic. Keep responses concise.`;

    const analysis = await base44.integrations.Core.InvokeLLM({
      prompt: prompt,
      response_json_schema: {
        type: "object",
        properties: {
          category: {
            type: "string",
            enum: ["plumbing", "electrical", "hvac", "appliance", "structural", "pest_control", "cleaning", "landscaping", "security", "other"]
          },
          priority: {
            type: "string",
            enum: ["low", "medium", "high", "urgent"]
          },
          priority_explanation: { type: "string" },
          clarifying_questions: {
            type: "array",
            items: { type: "string" }
          },
          troubleshooting_steps: {
            type: "array",
            items: { type: "string" }
          },
          is_emergency: { type: "boolean" },
          assistant_message: { type: "string" }
        },
        required: ["category", "priority", "priority_explanation", "clarifying_questions", "troubleshooting_steps", "is_emergency", "assistant_message"]
      }
    });

    return Response.json(analysis);

  } catch (error) {
    console.error('Error analyzing work order:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});