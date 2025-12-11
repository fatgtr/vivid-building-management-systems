import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';
import { DOMParser } from "jsr:@b-fuze/deno-dom";

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
    const searchUrl = 'https://www.nsw.gov.au/housing-and-construction/strata/strata-search';
    const formData = new URLSearchParams();
    formData.append('strataPlanNumber', strata_plan_number);
    formData.append('searchType', 'strata');

    const response = await fetch(searchUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData,
    });

    if (!response.ok) {
      return Response.json({ success: false, error: 'Failed to fetch strata information from NSW website' }, { status: 500 });
    }

    const html = await response.text();
    const doc = new DOMParser().parseFromString(html, 'text/html');

    // Extract data from the HTML
    let address = null;
    let city = null;
    let state = null;
    let postal_code = null;
    let strata_lots = null;
    let strata_managing_agent_name = null;
    let strata_managing_agent_license = null;

    // Parse the address (format: "THE ITALIAN FORUM 23 NORTON ST, LEICHHARDT NSW 2040")
    const addressElement = doc.querySelector('.strata-result-address, .address, h2');
    if (addressElement) {
      const fullAddress = addressElement.textContent.trim();
      const addressParts = fullAddress.split(',');
      if (addressParts.length > 0) {
        address = addressParts[0].trim();
      }
      if (addressParts.length > 1) {
        const cityStateZip = addressParts[1].trim().split(' ');
        if (cityStateZip.length >= 3) {
          postal_code = cityStateZip[cityStateZip.length - 1];
          state = cityStateZip[cityStateZip.length - 2];
          city = cityStateZip.slice(0, -2).join(' ');
        }
      }
    }

    // Try to find managing agent section
    const allText = html;
    
    // Extract managing agent name (look for "Name:" followed by the name)
    const nameMatch = allText.match(/Name:\s*([^\n<]+)/i);
    if (nameMatch) {
      strata_managing_agent_name = nameMatch[1].trim();
    }

    // Extract license number (look for "Licence:" or "License:" followed by the number)
    const licenseMatch = allText.match(/Licen[cs]e:\s*([^\n<]+)/i);
    if (licenseMatch) {
      strata_managing_agent_license = licenseMatch[1].trim();
    }

    // Extract number of lots (look for number followed by "Lot" or "Lots")
    const lotsMatch = allText.match(/(\d+)\s*Lots?/i);
    if (lotsMatch) {
      strata_lots = parseInt(lotsMatch[1], 10);
    }

    return Response.json({
      success: true,
      data: {
        address,
        city,
        state,
        postal_code,
        strata_lots,
        strata_managing_agent_name,
        strata_managing_agent_license
      }
    });
  } catch (error) {
    return Response.json({ success: false, error: error.message || 'Failed to fetch strata information' }, { status: 500 });
  }
});