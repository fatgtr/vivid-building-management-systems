import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { file_url } = await req.json();

    if (!file_url) {
      return Response.json({ error: 'file_url is required' }, { status: 400 });
    }

    // Define the schema for data extraction
    const extractionSchema = {
      type: "object",
      properties: {
        license_number: {
          type: "string",
          description: "Trade license number or certification number"
        },
        license_expiry_date: {
          type: "string",
          description: "License expiry date in YYYY-MM-DD format"
        },
        insurance_details: {
          type: "string",
          description: "General insurance policy number and provider details"
        },
        insurance_expiry: {
          type: "string",
          description: "General insurance expiry date in YYYY-MM-DD format"
        },
        work_cover_details: {
          type: "string",
          description: "Workers compensation policy number and provider"
        },
        work_cover_expiry_date: {
          type: "string",
          description: "Workers compensation expiry date in YYYY-MM-DD format"
        },
        public_liability_details: {
          type: "string",
          description: "Public liability insurance policy number and provider"
        },
        public_liability_expiry_date: {
          type: "string",
          description: "Public liability insurance expiry date in YYYY-MM-DD format"
        },
        policy_number: {
          type: "string",
          description: "Main policy or certificate number"
        },
        company_name: {
          type: "string",
          description: "Company or business name on the document"
        },
        abn: {
          type: "string",
          description: "Australian Business Number (ABN)"
        },
        acn: {
          type: "string",
          description: "Australian Company Number (ACN)"
        }
      }
    };

    // Extract data from the document
    const result = await base44.asServiceRole.integrations.Core.ExtractDataFromUploadedFile({
      file_url,
      json_schema: extractionSchema
    });

    if (result.status === 'error') {
      return Response.json({
        success: false,
        error: result.details || 'Failed to extract document data'
      }, { status: 400 });
    }

    return Response.json({
      success: true,
      extracted_data: result.output || {},
      message: 'Document data extracted successfully'
    });

  } catch (error) {
    return Response.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
});