import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        const user = await base44.auth.me();
        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { file_url, buildingId } = await req.json();

        if (!file_url) {
            return Response.json({ error: 'File URL is required' }, { status: 400 });
        }

        const extractionSchema = {
            type: "object",
            properties: {
                building_name: {
                    type: "string",
                    description: "Name of the building or development from the cover sheet"
                },
                full_address: {
                    type: "string",
                    description: "Full street address of the building"
                },
                strata_plan_number: {
                    type: "string",
                    description: "The unique Strata Plan Number (e.g., SP100777)"
                },
                total_stories: {
                    type: "integer",
                    description: "Total number of stories including basements and above ground"
                },
                easements: {
                    type: "array",
                    items: {
                        type: "object",
                        properties: {
                            type: { type: "string" },
                            details: { type: "string" }
                        }
                    },
                    description: "List of easements affecting the land"
                },
                unit_lot_mapping: {
                    type: "array",
                    items: {
                        type: "object",
                        properties: {
                            lot_number: {
                                type: "string",
                                description: "Lot number (e.g., '1', '58', 'CP')"
                            },
                            unit_number: {
                                type: "string",
                                description: "Unit number (e.g., '9.01', '15.02')"
                            },
                            address_no: { type: "string" },
                            road_name: { type: "string" },
                            road_type: { type: "string" },
                            locality: { type: "string" }
                        }
                    },
                    description: "Mapping from STREET ADDRESS SCHEDULE table"
                },
                levels: {
                    type: "array",
                    items: {
                        type: "object",
                        properties: {
                            name: {
                                type: "string",
                                description: "Level name (e.g., Basement Level 5, Ground Level, Level 10)"
                            },
                            abbreviations_legend: {
                                type: "object",
                                additionalProperties: { type: "string" },
                                description: "Legend mappings like CP=Common Property, CS=Carspace"
                            },
                            common_areas_and_assets: {
                                type: "array",
                                items: {
                                    type: "object",
                                    properties: {
                                        type: {
                                            type: "string",
                                            description: "Type (Carspace, Storeroom, Lift, Lobby, etc.)"
                                        },
                                        lot_number: {
                                            type: "string",
                                            description: "Lot identifier (e.g., PT 58, CP, CS)"
                                        },
                                        identifier: {
                                            type: "string",
                                            description: "Additional identifier or label"
                                        },
                                        location_notes: { type: "string" }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        };

        const extractedData = await base44.asServiceRole.integrations.Core.ExtractDataFromUploadedFile({
            file_url: file_url,
            json_schema: extractionSchema
        });

        if (extractedData.status === 'error') {
            return Response.json({ 
                success: false, 
                error: extractedData.details 
            }, { status: 400 });
        }

        const planData = extractedData.output;

        // Optionally update building with extracted strata plan number if buildingId is provided
        if (buildingId && planData.strata_plan_number) {
            await base44.asServiceRole.entities.Building.update(buildingId, {
                strata_plan_number: planData.strata_plan_number
            });
        }

        return Response.json({
            success: true,
            data: planData
        });

    } catch (error) {
        console.error('Plan extraction error:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});