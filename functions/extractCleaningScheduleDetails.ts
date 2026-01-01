import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { file_url, building_id } = await req.json();

    if (!file_url || !building_id) {
      return Response.json({ error: 'file_url and building_id are required' }, { status: 400 });
    }

    // Define the schema for cleaning schedule extraction
    const extractionSchema = {
      type: "object",
      properties: {
        schedule_items: {
          type: "array",
          items: {
            type: "object",
            properties: {
              subject: {
                type: "string",
                description: "Brief description of the cleaning task, e.g., 'Weekly common area cleaning'"
              },
              description: {
                type: "string",
                description: "Detailed description of the cleaning duties"
              },
              frequency: {
                type: "string",
                enum: ["daily", "weekly", "monthly", "quarterly", "half_yearly", "yearly"],
                description: "How often the cleaning task occurs"
              },
              assigned_area: {
                type: "string",
                description: "Specific area to be cleaned, e.g., 'Level 1 lobby', 'All common bathrooms'"
              }
            },
            required: ["subject", "frequency"]
          }
        }
      },
      required: ["schedule_items"]
    };

    // Extract data from the cleaning schedule document
    const result = await base44.asServiceRole.integrations.Core.ExtractDataFromUploadedFile({
      file_url,
      json_schema: extractionSchema
    });

    if (result.status === 'error') {
      return Response.json({
        success: false,
        error: result.details || 'Failed to extract cleaning schedule data'
      }, { status: 400 });
    }

    const extractedSchedules = result.output?.schedule_items || [];

    // Create MaintenanceSchedule entries for each extracted item
    const createdSchedules = [];
    for (const item of extractedSchedules) {
      const newSchedule = {
        building_id: building_id,
        subject: item.subject,
        description: item.description || item.subject,
        scheduled_date: new Date().toISOString().split('T')[0],
        recurrence: item.frequency || 'weekly',
        assigned_contractor_type: 'cleaning',
        status: 'pending_assignment',
        notes: `Extracted from uploaded cleaning schedule. Area: ${item.assigned_area || 'Not specified'}`,
      };
      const created = await base44.asServiceRole.entities.MaintenanceSchedule.create(newSchedule);
      createdSchedules.push(created);
    }

    return Response.json({
      success: true,
      extracted_data: extractedSchedules,
      created_maintenance_schedules: createdSchedules,
      message: `Successfully created ${createdSchedules.length} maintenance schedule(s)`
    });

  } catch (error) {
    return Response.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
});