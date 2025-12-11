import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { strata_plan_number } = await req.json();

    if (!strata_plan_number) {
      return Response.json({ success: false, error: 'Strata plan number is required' });
    }

    const result = await base44.integrations.Core.InvokeLLM({
      prompt: `Search the internet for information about NSW Strata Plan Number ${strata_plan_number}. This is a strata scheme in New South Wales, Australia.

Find and extract the following information about this strata plan:
1. The full street address of the property
2. The suburb/city name
3. The state (NSW)
4. The postal code
5. The total number of lots in the strata scheme
6. The name of the strata managing agent company
7. The strata managing agent's license number

Search for official records, government databases, or property information sites that contain details about this strata plan. Return the information in the exact JSON format specified. If any specific field cannot be found with confidence, use null for that field.`,
      add_context_from_internet: true,
      response_json_schema: {
        type: "object",
        properties: {
          address: { type: ["string", "null"] },
          city: { type: ["string", "null"] },
          state: { type: ["string", "null"] },
          postal_code: { type: ["string", "null"] },
          strata_lots: { type: ["number", "null"] },
          strata_managing_agent_name: { type: ["string", "null"] },
          strata_managing_agent_license: { type: ["string", "null"] }
        }
      }
    });

    return Response.json({ success: true, data: result });
  } catch (error) {
    return Response.json({ success: false, error: error.message || 'Failed to fetch strata information' }, { status: 500 });
  }
});