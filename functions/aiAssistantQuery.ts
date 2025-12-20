import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { query, buildingId, contextData } = await req.json();

    if (!query) {
      return Response.json({ error: 'Query is required' }, { status: 400 });
    }

    // Determine query category
    const category = determineCategory(query);

    // Build context for the AI
    let contextPrompt = buildContextPrompt(query, category, contextData, buildingId);

    // Call the LLM
    const response = await base44.integrations.Core.InvokeLLM({
      prompt: contextPrompt,
      add_context_from_internet: false
    });

    return Response.json({
      response: response,
      category: category
    });

  } catch (error) {
    console.error('AI Assistant error:', error);
    return Response.json({ 
      error: error.message || 'Failed to process query'
    }, { status: 500 });
  }
});

function determineCategory(query) {
  const queryLower = query.toLowerCase();
  
  if (queryLower.includes('resident') && (queryLower.includes('response') || queryLower.includes('reply') || queryLower.includes('draft'))) {
    return 'Draft Response';
  }
  
  if (queryLower.includes('summarize') || queryLower.includes('summary') || queryLower.includes('document')) {
    return 'Document Summary';
  }
  
  if (queryLower.includes('insight') || queryLower.includes('optimize') || queryLower.includes('improve') || queryLower.includes('analyze')) {
    return 'Operational Insights';
  }
  
  if (queryLower.includes('best practice') || queryLower.includes('how to') || queryLower.includes('what is') || queryLower.includes('advice')) {
    return 'Best Practices';
  }
  
  return 'General Inquiry';
}

function buildContextPrompt(query, category, contextData, buildingId) {
  let systemContext = `You are a specialized AI assistant for Vivid BMS, a building management system for strata and property managers in Australia. You help with:

1. **Building Management Best Practices**: Provide expert advice on strata management, maintenance, compliance, and resident relations following Australian strata laws and regulations.

2. **Draft Responses**: Generate professional, empathetic responses to resident inquiries that building managers can use or customize.

3. **Document Summarization**: Summarize building reports, compliance documents, and other materials highlighting key points, deadlines, and action items.

4. **Operational Insights**: Analyze building data patterns and suggest improvements for maintenance, costs, and resident satisfaction.

`;

  // Add building context if available
  if (contextData) {
    systemContext += `\n**Current Building Context:**\n`;
    
    if (contextData.workOrdersCount !== undefined) {
      systemContext += `- Total Work Orders: ${contextData.workOrdersCount}\n`;
      systemContext += `- Open Work Orders: ${contextData.openWorkOrders}\n`;
      systemContext += `- Urgent Work Orders: ${contextData.urgentWorkOrders}\n`;
    }
    
    if (contextData.documentsCount !== undefined) {
      systemContext += `- Documents on file: ${contextData.documentsCount}\n`;
    }
    
    if (contextData.recentAnnouncements && contextData.recentAnnouncements.length > 0) {
      systemContext += `\n**Recent Announcements:**\n`;
      contextData.recentAnnouncements.forEach((ann, idx) => {
        systemContext += `${idx + 1}. ${ann.title} (${ann.type})\n`;
      });
    }
  }

  // Category-specific instructions
  switch (category) {
    case 'Draft Response':
      systemContext += `\n**Task**: Draft a professional response to a resident inquiry. Be empathetic, clear, and actionable. Include:
- Acknowledgment of their concern
- Clear explanation or solution
- Next steps or timeline
- Professional closing
Format it as an email-ready response.`;
      break;
      
    case 'Document Summary':
      systemContext += `\n**Task**: Provide a concise summary with:
- Key points and findings
- Important deadlines or dates
- Required actions
- Compliance requirements if applicable
Use bullet points for clarity.`;
      break;
      
    case 'Operational Insights':
      systemContext += `\n**Task**: Analyze the data and provide:
- Patterns or trends identified
- Specific recommendations for improvement
- Potential cost savings or efficiency gains
- Implementation priorities
Be data-driven and practical.`;
      break;
      
    case 'Best Practices':
      systemContext += `\n**Task**: Provide expert guidance including:
- Industry best practices for Australian strata management
- Step-by-step recommendations
- Common pitfalls to avoid
- Relevant regulations or compliance requirements
Be thorough but practical.`;
      break;
      
    default:
      systemContext += `\n**Task**: Provide a helpful, accurate response to the user's question.`;
  }

  systemContext += `\n\n**User Query**: ${query}`;

  return systemContext;
}