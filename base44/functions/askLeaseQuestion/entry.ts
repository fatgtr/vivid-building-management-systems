import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { question, documentUrl, leaseAnalysisId } = await req.json();

    if (!question || !documentUrl) {
      return Response.json({ error: 'question and documentUrl are required' }, { status: 400 });
    }

    // Get existing analysis for context
    let context = '';
    if (leaseAnalysisId) {
      const analyses = await base44.asServiceRole.entities.LeaseAnalysis.filter({ id: leaseAnalysisId });
      if (analyses.length > 0) {
        context = `\nPrevious analysis: ${analyses[0].full_analysis}`;
      }
    }

    // Ask the LLM about the lease
    const answer = await base44.integrations.Core.InvokeLLM({
      prompt: `You are a helpful assistant answering questions about a lease agreement. 

Question: ${question}
${context}

Please provide a clear, accurate answer based on the lease document. If the information is not in the lease, say so.`,
      file_urls: [documentUrl]
    });

    return Response.json({ answer });

  } catch (error) {
    console.error('Error answering lease question:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});