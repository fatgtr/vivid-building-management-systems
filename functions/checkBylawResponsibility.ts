import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Authenticate user
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { issueType, issueItem, unitId, buildingId } = await req.json();

    if (!unitId || !buildingId) {
      return Response.json({ 
        error: 'Missing required parameters: unitId and buildingId' 
      }, { status: 400 });
    }

    // Get unit details including lot number
    const unit = await base44.asServiceRole.entities.Unit.get(unitId);
    if (!unit) {
      return Response.json({ error: 'Unit not found' }, { status: 404 });
    }

    const lotNumber = unit.lot_number;

    // Query bylaws documents for this building
    const bylawDocuments = await base44.asServiceRole.entities.Document.filter({
      building_id: buildingId,
      category: 'bylaws',
      status: 'active'
    });

    if (bylawDocuments.length === 0) {
      return Response.json({
        found: false,
        message: 'No bylaws found for this building. Please follow standard responsibility guidelines.',
        lotNumber: lotNumber
      });
    }

    // Prepare context for AI analysis
    const bylawsContent = bylawDocuments.map(doc => ({
      title: doc.title,
      content: doc.ocr_content || 'Content not available',
      description: doc.description || ''
    }));

    // Use AI to analyze bylaws for lot-specific responsibility
    const prompt = `
You are analyzing strata bylaws to determine responsibility for maintenance issues.

Issue Details:
- Type: ${issueType}
- Specific Item: ${issueItem}
- Lot Number: ${lotNumber}
- Unit ID: ${unitId}

Available Bylaws:
${bylawsContent.map((doc, idx) => `
Document ${idx + 1}: ${doc.title}
${doc.description ? 'Description: ' + doc.description : ''}
Content: ${doc.content.substring(0, 2000)}...
`).join('\n\n')}

Task:
1. Search for any bylaws that specifically mention Lot ${lotNumber} or Unit ${unitId}
2. Determine if there are any special arrangements regarding "${issueType} - ${issueItem}" responsibility
3. Look for any amendments or special resolutions that override standard responsibility

Provide your analysis in this JSON format:
{
  "bylawFound": boolean,
  "responsibilityParty": "Owner" | "Owners Corporation" | "Unclear",
  "explanation": "Clear explanation of findings",
  "relevantBylawReferences": ["List of specific bylaw clauses or sections"],
  "confidence": "high" | "medium" | "low"
}
`;

    const aiResponse = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: prompt,
      response_json_schema: {
        type: 'object',
        properties: {
          bylawFound: { type: 'boolean' },
          responsibilityParty: { type: 'string' },
          explanation: { type: 'string' },
          relevantBylawReferences: { 
            type: 'array',
            items: { type: 'string' }
          },
          confidence: { type: 'string' }
        }
      }
    });

    return Response.json({
      success: true,
      lotNumber: lotNumber,
      unitId: unitId,
      analysis: aiResponse,
      bylawDocumentsChecked: bylawDocuments.length
    });

  } catch (error) {
    console.error('Error checking bylaw responsibility:', error);
    return Response.json({ 
      error: error.message || 'Internal server error' 
    }, { status: 500 });
  }
});