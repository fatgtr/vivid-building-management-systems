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
  
  // System help queries - check first as these are specific
  if (queryLower.includes('how do i') || 
      queryLower.includes('how to use') || 
      queryLower.includes('vivid bms') ||
      queryLower.includes('create a work order') ||
      queryLower.includes('add a resident') ||
      queryLower.includes('add resident') ||
      queryLower.includes('create resident') ||
      queryLower.includes('upload document') ||
      queryLower.includes('send announcement') ||
      queryLower.includes('book amenity') ||
      queryLower.includes('create contractor') ||
      queryLower.includes('where do i') ||
      queryLower.includes('how can i') ||
      queryLower.includes('system') ||
      queryLower.includes('feature') ||
      queryLower.includes('navigate') ||
      queryLower.includes('find the')) {
    return 'System Help';
  }
  
  if (queryLower.includes('resident') && (queryLower.includes('response') || queryLower.includes('reply') || queryLower.includes('draft'))) {
    return 'Draft Response';
  }
  
  if (queryLower.includes('summarize') || queryLower.includes('summary') || queryLower.includes('document')) {
    return 'Document Summary';
  }
  
  if (queryLower.includes('insight') || queryLower.includes('optimize') || queryLower.includes('improve') || queryLower.includes('analyze')) {
    return 'Operational Insights';
  }
  
  if (queryLower.includes('best practice') || queryLower.includes('advice')) {
    return 'Best Practices';
  }
  
  return 'General Inquiry';
}

function buildContextPrompt(query, category, contextData, buildingId) {
  let systemContext = `You are a specialized AI assistant for Vivid BMS, a building management system for strata and property managers in Australia. You help with:

1. **Building Management Best Practices**: Provide expert advice on strata management, maintenance, compliance, and resident relations following Australian strata laws and regulations.

2. **System Guidance & User Manual**: Help users understand and navigate the Vivid BMS system, explain features, guide them through workflows, and suggest underutilized tools that could benefit them.

3. **Draft Responses**: Generate professional, empathetic responses to resident inquiries that building managers can use or customize.

4. **Document Summarization**: Summarize building reports, compliance documents, and other materials highlighting key points, deadlines, and action items.

5. **Operational Insights**: Analyze building data patterns and suggest improvements for maintenance, costs, and resident satisfaction.

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
    case 'System Help':
      systemContext += `\n**Task**: You are the Vivid BMS user manual. Help the user navigate and use the system effectively.

**VIVID BMS SYSTEM GUIDE:**

**Main Navigation:**
- **Dashboard** - Overview of all buildings, key metrics, and quick actions
- **Buildings** - Manage building profiles, details, and configurations
- **Residents** - Manage residents, units, and move checklists (Add residents by clicking "Add New" → "Add Resident", set move-in dates to auto-generate checklists)
- **Operations Center** - Centralized hub with tabs for:
  - Work Orders - Create and manage maintenance requests
  - Assets - Track building assets and compliance
  - Maintenance - Schedule recurring maintenance
  - Inspections - Conduct and track inspections
  - Contractors - Manage contractor relationships
  - Reports - Analytics and insights
- **Amenities** - Book and manage common area amenities
- **Communications** - Announcements, messages, polls, and broadcasts
- **Documents** - Upload, organize, and share building documents
- **Strata Knowledge Base** - Australian strata laws, responsibility guide, and AI assistant

**Common Workflows:**
1. **Create Work Order**: Operations Center → Work Orders tab → "Add New" button
2. **Add Resident**: Residents page → "Add New" dropdown → "Add Resident"
3. **Generate Move Checklist**: Edit resident → Set "Move In Date" or "Move Out Date" → Save (checklist auto-generates)
4. **Upload Documents**: Documents page → "Upload Document" → Select category and visibility
5. **Send Announcement**: Communications → Announcements tab → "Create Announcement"
6. **Invite Managing Agent**: Residents → "Add New" dropdown → "Invite Managing Agent"

**Tips:**
- Use the building selector dropdown to filter by specific building
- Operations Center provides a centralized view - click metric cards to jump to sections
- The AI Assistant (Sparkles icon, bottom right) is always available for help
- Move checklists are automatically created when you set move-in/out dates on residents

When answering:
- Provide step-by-step instructions with page names and button labels
- Mention specific navigation paths (e.g., "Go to Residents → Add New → Add Resident")
- Suggest related features they might find useful
- Be concise but complete`;
      break;
    
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
      systemContext += `\n**Task**: Provide a helpful, accurate response to the user's question. If it seems like a system usage question, guide them through the Vivid BMS interface.`;
  }

  systemContext += `\n\n**User Query**: ${query}`;

  return systemContext;
}