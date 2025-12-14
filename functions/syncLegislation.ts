import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Authenticate user (admin only for this operation)
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized - Admin access required' }, { status: 401 });
    }

    console.log('[syncLegislation] Starting legislation sync process...');

    // Fetch XML from NSW legislation website
    const legislationUrl = 'https://legislation.nsw.gov.au/export/xml/2025-12-15/act-2015-050';
    console.log(`[syncLegislation] Fetching XML from: ${legislationUrl}`);
    
    const response = await fetch(legislationUrl);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch legislation: ${response.status} ${response.statusText}`);
    }

    const xmlText = await response.text();
    console.log(`[syncLegislation] Successfully fetched XML (${xmlText.length} characters)`);

    // Parse XML using DOMParser
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlText, 'text/xml');

    // Check for parsing errors
    const parserError = xmlDoc.querySelector('parsererror');
    if (parserError) {
      throw new Error('XML parsing failed: ' + parserError.textContent);
    }

    // Extract sections from XML
    const sections = [];
    const actTitle = 'Strata Schemes Management Act 2015 No 50';
    const sourceUrl = 'https://legislation.nsw.gov.au/view/html/inforce/current/act-2015-050';
    
    // Extract all sections
    const sectionElements = xmlDoc.querySelectorAll('section');
    console.log(`[syncLegislation] Found ${sectionElements.length} sections in XML`);

    for (const sectionEl of sectionElements) {
      try {
        const sectionNum = sectionEl.getAttribute('id') || sectionEl.querySelector('num')?.textContent || 'Unknown';
        const heading = sectionEl.querySelector('heading')?.textContent?.trim() || 'No title';
        
        // Extract all text content from the section
        const contentParts = [];
        const textElements = sectionEl.querySelectorAll('para, subsection, text, p');
        for (const textEl of textElements) {
          const text = textEl.textContent?.trim();
          if (text) contentParts.push(text);
        }
        const content = contentParts.join('\n\n') || sectionEl.textContent?.trim() || '';

        // Determine category based on content keywords
        let category = 'general';
        const lowerContent = (heading + ' ' + content).toLowerCase();
        if (lowerContent.includes('common property')) category = 'common_property';
        else if (lowerContent.includes('maintain') || lowerContent.includes('repair')) category = 'maintenance';
        else if (lowerContent.includes('insurance')) category = 'insurance';
        else if (lowerContent.includes('by-law') || lowerContent.includes('bylaw')) category = 'by_laws';
        else if (lowerContent.includes('duty') || lowerContent.includes('obligation')) category = 'owners_corporation_duties';

        if (content.length > 10) { // Only include sections with substantial content
          sections.push({
            act_title: actTitle,
            section_number: sectionNum,
            section_title: heading,
            content: content,
            category: category,
            source_url: sourceUrl,
            effective_date: new Date().toISOString().split('T')[0]
          });
        }
      } catch (err) {
        console.error(`[syncLegislation] Error parsing section: ${err.message}`);
      }
    }

    console.log(`[syncLegislation] Extracted ${sections.length} valid sections`);

    // Use service role to update database
    // First, delete existing entries for this act
    const existingEntries = await base44.asServiceRole.entities.LegislationContent.filter({
      act_title: actTitle
    });
    
    console.log(`[syncLegislation] Found ${existingEntries.length} existing entries to update`);

    // Delete old entries
    for (const entry of existingEntries) {
      await base44.asServiceRole.entities.LegislationContent.delete(entry.id);
    }

    console.log('[syncLegislation] Deleted old entries');

    // Bulk create new entries
    if (sections.length > 0) {
      await base44.asServiceRole.entities.LegislationContent.bulkCreate(sections);
      console.log(`[syncLegislation] Successfully created ${sections.length} new legislation entries`);
    }

    return Response.json({
      success: true,
      message: 'Legislation sync completed successfully',
      sections_processed: sections.length,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[syncLegislation] Error:', error);
    return Response.json({
      success: false,
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
});