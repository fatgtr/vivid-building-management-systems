import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Authenticate user
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { work_order_id, contractor_id } = await req.json();

    if (!work_order_id) {
      return Response.json({ error: 'work_order_id is required' }, { status: 400 });
    }

    // Fetch work order details
    const workOrder = await base44.entities.WorkOrder.get(work_order_id);
    
    // Fetch building details
    const building = await base44.entities.Building.get(workOrder.building_id);
    
    // Fetch unit details if applicable
    let unit = null;
    if (workOrder.unit_id) {
      unit = await base44.entities.Unit.get(workOrder.unit_id);
    }

    // Fetch historical work orders for pricing analysis
    const historicalOrders = await base44.entities.WorkOrder.filter({
      main_category: workOrder.main_category,
      status: 'completed'
    });

    // Fetch contractor's past work for reference
    let contractorHistory = [];
    if (contractor_id) {
      contractorHistory = await base44.entities.WorkOrder.filter({
        assigned_contractor_id: contractor_id,
        status: 'completed'
      });
    }

    // Calculate average costs from historical data
    const avgCost = historicalOrders.length > 0
      ? historicalOrders.reduce((sum, wo) => sum + (wo.actual_cost || 0), 0) / historicalOrders.filter(wo => wo.actual_cost).length
      : null;

    // Prepare context for AI
    const context = {
      workOrder: {
        title: workOrder.title,
        description: workOrder.description,
        category: workOrder.main_category,
        subcategory: workOrder.subcategory,
        priority: workOrder.priority,
        isCommonArea: workOrder.is_common_area,
        location: unit ? `Unit ${unit.unit_number}` : 'Common Area'
      },
      building: {
        name: building.name,
        address: building.address,
        type: building.building_type
      },
      historicalData: {
        averageCost: avgCost,
        similarJobsCount: historicalOrders.length,
        contractorCompletedJobs: contractorHistory.length
      }
    };

    // Generate proposal using AI
    const proposalSchema = {
      type: "object",
      properties: {
        executive_summary: {
          type: "string",
          description: "Brief overview of the work to be performed"
        },
        scope_of_work: {
          type: "array",
          items: { type: "string" },
          description: "Detailed list of tasks and deliverables"
        },
        materials_required: {
          type: "array",
          items: {
            type: "object",
            properties: {
              item: { type: "string" },
              quantity: { type: "string" },
              estimated_cost: { type: "number" }
            }
          }
        },
        labor_breakdown: {
          type: "object",
          properties: {
            hours: { type: "number" },
            rate_per_hour: { type: "number" },
            total_labor_cost: { type: "number" }
          }
        },
        timeline: {
          type: "object",
          properties: {
            estimated_duration: { type: "string" },
            start_date: { type: "string" },
            completion_date: { type: "string" }
          }
        },
        cost_breakdown: {
          type: "object",
          properties: {
            materials_cost: { type: "number" },
            labor_cost: { type: "number" },
            equipment_cost: { type: "number" },
            contingency: { type: "number" },
            subtotal: { type: "number" },
            gst: { type: "number" },
            total: { type: "number" }
          }
        },
        terms_and_conditions: {
          type: "array",
          items: { type: "string" },
          description: "Key terms, payment schedule, warranties"
        },
        notes: {
          type: "string",
          description: "Additional notes or recommendations"
        }
      }
    };

    const aiPrompt = `
You are an expert building maintenance contractor preparing a professional bid proposal.

Work Order Details:
- Title: ${context.workOrder.title}
- Description: ${context.workOrder.description}
- Category: ${context.workOrder.category} / ${context.workOrder.subcategory || 'N/A'}
- Priority: ${context.workOrder.priority}
- Location: ${context.workOrder.location}

Building Information:
- Building: ${context.building.name}
- Address: ${context.building.address}
- Type: ${context.building.type}

Historical Context:
${avgCost ? `- Average cost for similar jobs: $${avgCost.toFixed(2)}` : '- No historical pricing data available'}
- Similar completed jobs: ${context.historicalData.similarJobsCount}
${contractor_id ? `- Your completed jobs: ${context.historicalData.contractorCompletedJobs}` : ''}

Generate a comprehensive, professional bid proposal that includes:
1. Executive summary - Brief overview of the work
2. Detailed scope of work - Break down all tasks
3. Materials required - List items, quantities, and costs
4. Labor breakdown - Hours, rates, and total labor cost
5. Timeline - Realistic duration and dates (start 3-5 business days from now)
6. Cost breakdown - Materials, labor, equipment, 10% contingency, GST (10%), total
7. Terms and conditions - Payment terms (30% upfront, 70% on completion), warranties (12 months workmanship), access requirements, site cleanup
8. Additional notes - Any recommendations or important considerations

Use realistic Australian pricing:
- Labor rates: $80-150/hour depending on specialty
- Include GST (10%) in final pricing
- Consider building type and location for pricing
- Materials should be market-rate for Sydney/NSW

Be professional, detailed, and competitive. Focus on value and quality.
`;

    const aiResponse = await base44.integrations.Core.InvokeLLM({
      prompt: aiPrompt,
      response_json_schema: proposalSchema
    });

    return Response.json({
      success: true,
      proposal: aiResponse,
      work_order_id: work_order_id,
      context: context
    });

  } catch (error) {
    console.error('Error generating bid proposal:', error);
    return Response.json({ 
      error: error.message || 'Failed to generate bid proposal' 
    }, { status: 500 });
  }
});