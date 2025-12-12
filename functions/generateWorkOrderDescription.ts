import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        try {
            await base44.auth.me();
        } catch (e) {
            // Allow unauthenticated for internal calls
        }

        const { prompt, file_urls } = await req.json();

        if (!prompt) {
            return Response.json({ success: false, error: 'Prompt is required' }, { status: 400 });
        }

        const response = await base44.asServiceRole.integrations.Core.InvokeLLM({
            prompt: prompt,
            file_urls: file_urls || undefined,
        });

        if (response && response.data) {
            return Response.json({ success: true, description: response.data });
        } else {
            return Response.json({ success: false, error: 'Failed to generate description' }, { status: 500 });
        }

    } catch (error) {
        console.error('Error generating description:', error);
        return Response.json({ success: false, error: error.message }, { status: 500 });
    }
});