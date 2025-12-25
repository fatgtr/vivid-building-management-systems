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

    // Get document
    const documents = await base44.entities.Document.filter({ id: document_id });
    const document = documents[0];

    if (!document) {
      return Response.json({ error: 'Document not found' }, { status: 404 });
    }

    // Generate summary using AI
    const summary = await base44.integrations.Core.InvokeLLM({
      prompt: `Analyze this document and provide a concise, structured summary.

Document Title: ${document.title}
Category: ${document.category}
${document.description ? `Description: ${document.description}` : ''}

Instructions:
1. Create a brief 2-3 sentence overview
2. List 5-7 key points or highlights (use bullet format)
3. Identify any important dates, deadlines, or compliance requirements
4. Note any action items or requirements
5. Keep the total summary under 250 words

Format your response as:
## Overview
[Brief overview paragraph]

## Key Points
- [Point 1]
- [Point 2]
...

## Important Dates & Requirements
- [Date/requirement if any]

## Action Items
- [Action if any]`,
      file_urls: [document.file_url],
    });

    // Update document with summary
    await base44.asServiceRole.entities.Document.update(document_id, {
      ai_summary: summary,
      ai_summary_generated_date: new Date().toISOString(),
    });

    return Response.json({
      success: true,
      summary,
      document_id
    });

  } catch (error) {
    console.error('Summary generation error:', error);
    return Response.json({ 
      error: error.message || 'Failed to generate summary' 
    }, { status: 500 });
  }
});