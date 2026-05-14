import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        try {
            await base44.auth.me();
        } catch (e) {
            // Allow unauthenticated for internal calls
        }

        const { prompt, file_urls, generateTitle, suggestPriority } = await req.json();

        if (!prompt) {
            return Response.json({ success: false, error: 'Prompt is required' }, { status: 400 });
        }

        let schema = undefined;
        if (generateTitle || suggestPriority) {
            const properties = {};
            const required = [];
            
            if (generateTitle) {
                properties.title = { type: "string", description: "A concise, professional title for the work order (max 60 characters)" };
                properties.description = { type: "string", description: "A detailed professional description of the work order" };
                required.push("title", "description");
            }
            
            if (suggestPriority) {
                properties.priority = { 
                    type: "string", 
                    enum: ["low", "medium", "high", "urgent"],
                    description: "Suggested priority level based on severity, safety concerns, and impact" 
                };
                properties.priority_reason = { 
                    type: "string", 
                    description: "Brief explanation for the priority recommendation" 
                };
                required.push("priority", "priority_reason");
            }
            
            schema = {
                type: "object",
                properties,
                required
            };
        }

        const response = await base44.asServiceRole.integrations.Core.InvokeLLM({
            prompt: prompt,
            file_urls: file_urls || undefined,
            response_json_schema: schema
        });

        if (response && response.data) {
            return Response.json({ 
                success: true, 
                ...(schema ? response.data : { description: response.data })
            });
        } else {
            return Response.json({ success: false, error: 'Failed to generate content' }, { status: 500 });
        }

    } catch (error) {
        console.error('Error generating description:', error);
        return Response.json({ success: false, error: error.message }, { status: 500 });
    }
});