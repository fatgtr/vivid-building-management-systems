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
      prompt: `Search for NSW strata plan ${strata_plan_number} on the NSW government strata search website (https://www.nsw.gov.au/housing-and-construction/strata/strata-search).
      
Extract the following information:
- Full street address (just the street address, not including city/state)
- City/Suburb
- State (should be NSW)
- Postal code
- Number of lots in the strata scheme
- Strata managing agent company name
- Strata managing agent license number

Return the information in the exact JSON format specified. If any field cannot be found, return null for that field.`,
      add_context_from_internet: true,
      response_json_schema: {
        type: "object",
        properties: {
          address: { type: "string" },
          city: { type: "string" },
          state: { type: "string" },
          postal_code: { type: "string" },
          strata_lots: { type: "number" },
          strata_managing_agent_name: { type: "string" },
          strata_managing_agent_license: { type: "string" }
        }
      }
    });

    return Response.json({ success: true, data: result });
  } catch (error) {
    return Response.json({ success: false, error: error.message || 'Failed to fetch strata information' }, { status: 500 });
  }
});