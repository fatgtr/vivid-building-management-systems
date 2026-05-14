import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

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

        // Extract structured data from the Strata Roll PDF
        const result = await base44.asServiceRole.integrations.Core.ExtractDataFromUploadedFile({
            file_url: file_url,
            json_schema: {
                type: "object",
                properties: {
                    building_address: {
                        type: "string",
                        description: "The full address of the building"
                    },
                    strata_plan_number: {
                        type: "string",
                        description: "The Strata Plan Number (e.g., SP100777)"
                    },
                    managing_agent_name: {
                        type: "string",
                        description: "Managing agent company name"
                    },
                    total_lots: {
                        type: "number",
                        description: "Total number of lots/units"
                    },
                    units: {
                        type: "array",
                        items: {
                            type: "object",
                            properties: {
                                lot_number: {
                                    type: "string",
                                    description: "The lot number"
                                },
                                unit_number: {
                                    type: "string",
                                    description: "The unit number (e.g., 9.01, 10.02)"
                                },
                                unit_entitlement: {
                                    type: "number",
                                    description: "Unit entitlement value"
                                },
                                owner_name: {
                                    type: "string",
                                    description: "Owner's full name or company name"
                                },
                                owner_email: {
                                    type: "string",
                                    description: "Owner's email address"
                                },
                                owner_address: {
                                    type: "string",
                                    description: "Owner's address for service of notices"
                                }
                            },
                            required: ["lot_number", "unit_number"]
                        }
                    }
                },
                required: ["units"]
            }
        });

        if (result.status === 'error' || !result.output) {
            return Response.json({ 
                success: false, 
                error: result.details || 'Could not extract data from the provided PDF. Please ensure it is a valid Strata Roll document.' 
            }, { status: 400 });
        }

        return Response.json({ 
            success: true, 
            data: result.output 
        });

    } catch (error) {
        return Response.json({ 
            success: false, 
            error: error.message 
        }, { status: 500 });
    }
});