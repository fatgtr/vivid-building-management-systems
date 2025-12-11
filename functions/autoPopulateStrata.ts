import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';
import * as cheerio from 'npm:cheerio@1.0.0';

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

    // Make request to NSW strata search
    const searchUrl = 'https://www.onegov.nsw.gov.au/publicregister/#/publicregister/search/Strata';
    
    const response = await fetch(searchUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json, text/plain, */*',
        'Origin': 'https://www.onegov.nsw.gov.au',
        'Referer': 'https://www.onegov.nsw.gov.au/publicregister/'
      },
      body: JSON.stringify({
        searchCriteria: {
          strataPlanNumber: strata_plan_number
        }
      })
    });

    if (!response.ok) {
      throw new Error(`Search request failed: ${response.status}`);
    }

    const data = await response.json();
    
    // Extract the information from the response
    if (!data || !data.results || data.results.length === 0) {
      return Response.json({
        success: false,
        error: 'No results found for this strata plan number'
      });
    }

    const result = data.results[0];
    
    // Parse address components
    const fullAddress = result.address || '';
    const addressParts = fullAddress.split(',').map(part => part.trim());
    
    let address = '';
    let city = '';
    let state = 'NSW';
    let postal_code = '';
    
    if (addressParts.length >= 3) {
      address = addressParts[0];
      city = addressParts[1];
      const lastPart = addressParts[addressParts.length - 1];
      const postcodeMatch = lastPart.match(/\d{4}/);
      if (postcodeMatch) {
        postal_code = postcodeMatch[0];
      }
    }

    return Response.json({
      success: true,
      data: {
        address: address || null,
        city: city || null,
        state: state,
        postal_code: postal_code || null,
        strata_lots: result.numberOfLots || null,
        strata_managing_agent_name: result.agentName || null,
        strata_managing_agent_license: result.agentLicense || null
      }
    });
  } catch (error) {
    console.error('Auto-populate error:', error);
    return Response.json({ 
      success: false, 
      error: error.message || 'Failed to fetch strata information' 
    }, { status: 500 });
  }
});