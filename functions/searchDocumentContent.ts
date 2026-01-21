import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await req.json();
    const { building_id, search_query, search_type = 'full_text' } = payload || {};

    if (!search_query) {
      return Response.json({ error: 'search_query is required' }, { status: 400 });
    }

    // Fetch all documents for the building
    const documents = building_id 
      ? await base44.entities.Document.filter({ building_id })
      : await base44.entities.Document.list();

    if (documents.length === 0) {
      return Response.json({
        results: [],
        suggestions: []
      });
    }

    let results = [];

    if (search_type === 'full_text') {
      // Simple text search
      const query = search_query.toLowerCase();
      results = documents.filter(doc => {
        const titleMatch = doc.title?.toLowerCase().includes(query);
        const contentMatch = doc.ocr_content?.toLowerCase().includes(query);
        const categoryMatch = doc.category?.toLowerCase().includes(query);
        return titleMatch || contentMatch || categoryMatch;
      }).map(doc => ({
        document_id: doc.id,
        title: doc.title,
        category: doc.category,
        file_url: doc.file_url,
        upload_date: doc.created_date,
        relevance_score: doc.title?.toLowerCase().includes(query) ? 1.0 : 0.7,
        matched_content: extractMatchedContent(doc.ocr_content, query),
        ai_summary: doc.ai_summary,
        key_points: extractKeyPoints(doc)
      }));
    } else if (search_type === 'ai_semantic') {
      // AI semantic search - limit to top 20 documents to avoid timeout
      const limitedDocs = documents.slice(0, 20);
      const aiResults = await base44.integrations.Core.InvokeLLM({
        prompt: `User is searching for: "${search_query}"

Available documents:
${limitedDocs.map((d, i) => `${i}. ${d.title} (${d.category}): ${d.ai_summary || d.ocr_content?.slice(0, 150) || 'No content'}`).join('\n')}

Return the most relevant documents ranked by relevance to the search query. For each result include:
- document_index (0-${limitedDocs.length - 1})
- relevance_score (0-1)
- reasoning for why it matches
- key_points that relate to the search`,
        response_json_schema: {
          type: 'object',
          properties: {
            results: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  document_index: { type: 'number' },
                  relevance_score: { type: 'number' },
                  reasoning: { type: 'string' },
                  key_points: {
                    type: 'array',
                    items: { type: 'string' }
                  }
                }
              }
            },
            suggestions: {
              type: 'array',
              items: { type: 'string' }
            }
          }
        }
      });

      results = (aiResults.results || []).map(r => {
        const doc = limitedDocs[r.document_index];
        if (!doc) return null;
        return {
          document_id: doc.id,
          title: doc.title,
          category: doc.category,
          file_url: doc.file_url,
          upload_date: doc.created_date,
          relevance_score: r.relevance_score,
          ai_summary: doc.ai_summary,
          key_points: r.key_points,
          ai_reasoning: r.reasoning
        };
      }).filter(Boolean);
    }

    // Sort by relevance
    results.sort((a, b) => (b.relevance_score || 0) - (a.relevance_score || 0));

    return Response.json({
      results: results.slice(0, 20),
      suggestions: search_type === 'ai_semantic' ? [] : generateSuggestions(search_query)
    });

  } catch (error) {
    console.error('Error searching documents:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

function extractMatchedContent(content, query) {
  if (!content) return [];
  const words = query.toLowerCase().split(' ');
  const sentences = content.split(/[.!?]+/);
  const matches = [];
  
  for (const sentence of sentences) {
    if (words.some(word => sentence.toLowerCase().includes(word))) {
      matches.push(sentence.trim());
      if (matches.length >= 3) break;
    }
  }
  
  return matches;
}

function extractKeyPoints(doc) {
  const points = [];
  if (doc.category) points.push(doc.category.replace(/_/g, ' '));
  if (doc.subcategory) points.push(doc.subcategory);
  if (doc.tags && Array.isArray(doc.tags)) points.push(...doc.tags);
  return points.slice(0, 5);
}

function generateSuggestions(query) {
  const suggestions = [];
  if (query.includes('fire')) suggestions.push('fire safety', 'fire protection systems');
  if (query.includes('lift')) suggestions.push('elevator', 'vertical transportation');
  if (query.includes('water')) suggestions.push('plumbing', 'hydraulic systems');
  if (query.includes('electric')) suggestions.push('electrical systems', 'power distribution');
  return suggestions.slice(0, 3);
}