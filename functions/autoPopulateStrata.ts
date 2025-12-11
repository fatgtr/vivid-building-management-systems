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

    // Use LLM to search and extract the information from the web
    const result = await base44.integrations.Core.InvokeLLM({
      prompt: `I need you to find information about NSW Strata Plan ${strata_plan_number}.

Go to the NSW government strata search website and search for this strata plan number.

From the search results, extract EXACTLY these fields:
1. The full address (street address including building name if present)
2. The suburb/city name
3. The state (should be NSW)
4. The postal code (4-digit number)
5. The total number of lots (just the number)
6. The strata managing agent company name
7. The strata managing agent license number

IMPORTANT: 
- For the address, include the full street address but NOT the suburb/state/postcode in this field
- The city should be just the suburb name (e.g., "LEICHHARDT" not "LEICHHARDT NSW")
- Return actual data only, not placeholder text
- If you cannot find a specific field, use null for that field

Example format from the screenshot provided:
- Address: "THE ITALIAN FORUM 23 NORTON ST"
- City: "LEICHHARDT"  
- State: "NSW"
- Postal Code: "2040"
- Strata Lots: 71
- Managing Agent Name: "Premium Strata Pty Ltd"
- License: "1449656"`,
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

    return Response.json({
      success: true,
      data: result
    });
  } catch (error) {
    return Response.json({ success: false, error: error.message || 'Failed to fetch strata information' }, { status: 500 });
  }
});