import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { workOrderId, autoAssign = false } = await req.json();

    if (!workOrderId) {
      return Response.json({ error: 'Missing work order ID' }, { status: 400 });
    }

    // Get the work order details
    const workOrder = await base44.entities.WorkOrder.get(workOrderId);
    if (!workOrder) {
      return Response.json({ error: 'Work order not found' }, { status: 404 });
    }

    // Get building details for location
    const building = workOrder.building_id 
      ? await base44.asServiceRole.entities.Building.get(workOrder.building_id)
      : null;

    // Get all active contractors
    const contractors = await base44.asServiceRole.entities.Contractor.filter({ 
      status: 'active' 
    });

    if (contractors.length === 0) {
      return Response.json({ 
        success: false, 
        message: 'No active contractors available',
        suggestions: []
      });
    }

    // Get work order history for each contractor to check availability
    const allWorkOrders = await base44.asServiceRole.entities.WorkOrder.list();

    // Analyze contractors and suggest the best matches
    const prompt = `
You are an AI contractor assignment assistant. Analyze the following work order and contractor data to suggest the best contractors for the job.

Work Order Details:
- Title: ${workOrder.title}
- Description: ${workOrder.description || 'N/A'}
- Category: ${workOrder.main_category}
- Subcategory: ${workOrder.subcategory || 'N/A'}
- Priority: ${workOrder.priority}
- Location: ${building?.address || 'N/A'}
- Building: ${building?.name || 'N/A'}

Available Contractors:
${contractors.map((c, idx) => `
${idx + 1}. ${c.company_name} (ID: ${c.id})
   - Contact: ${c.contact_name}
   - Specialties: ${c.specialty?.join(', ') || 'general'}
   - Hourly Rate: $${c.hourly_rate || 'Not specified'}
   - Rating: ${c.rating || 'Not rated'}
   - Location: ${c.address || 'Not specified'}
   - Active Work Orders: ${allWorkOrders.filter(wo => wo.assigned_contractor_id === c.id && ['open', 'in_progress'].includes(wo.status)).length}
`).join('\n')}

Analyze each contractor based on:
1. Specialty Match: Does their specialty align with the work order category?
2. Availability: Fewer active work orders means more availability
3. Location: Proximity to the building (if addresses are provided)
4. Rating: Higher ratings preferred
5. Cost: Consider hourly rate

Provide a ranked list of the top 3 most suitable contractors with reasoning.
`;

    const analysis = await base44.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: 'object',
        properties: {
          suggestions: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                contractor_id: { type: 'string' },
                contractor_name: { type: 'string' },
                match_score: { type: 'number', description: 'Score from 0-100' },
                reasoning: { type: 'string' },
                specialty_match: { type: 'boolean' },
                availability_score: { type: 'number', description: 'Score from 0-100' },
                estimated_cost: { type: 'string' }
              },
              required: ['contractor_id', 'contractor_name', 'match_score', 'reasoning']
            }
          },
          recommendation: { type: 'string' }
        },
        required: ['suggestions', 'recommendation']
      }
    });

    // If auto-assign is enabled, assign to the top contractor
    if (autoAssign && analysis.suggestions.length > 0) {
      const topContractor = analysis.suggestions[0];
      const contractor = contractors.find(c => c.id === topContractor.contractor_id);
      
      if (contractor) {
        // Update work order with contractor assignment
        await base44.asServiceRole.entities.WorkOrder.update(workOrderId, {
          assigned_contractor_id: contractor.id,
          status: workOrder.status === 'open' ? 'in_progress' : workOrder.status
        });

        // Send notification to contractor
        try {
          await base44.functions.invoke('notifyWorkOrderAssignment', {
            workOrderId,
            contractorId: contractor.id
          });
        } catch (error) {
          console.error('Failed to send notification:', error);
        }

        return Response.json({
          success: true,
          assigned: true,
          contractor: {
            id: contractor.id,
            name: contractor.company_name,
            email: contractor.email
          },
          suggestions: analysis.suggestions,
          recommendation: analysis.recommendation
        });
      }
    }

    return Response.json({
      success: true,
      assigned: false,
      suggestions: analysis.suggestions,
      recommendation: analysis.recommendation
    });

  } catch (error) {
    console.error('Error assigning contractor:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});