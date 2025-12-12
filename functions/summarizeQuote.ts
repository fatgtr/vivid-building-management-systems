import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        try {
            await base44.auth.me();
        } catch (e) {
            // Allow unauthenticated for internal calls
        }

        const { file_url } = await req.json();

        if (!file_url) {
            return Response.json({ success: false, error: 'File URL is required' }, { status: 400 });
        }

        const response = await base44.asServiceRole.integrations.Core.InvokeLLM({
            prompt: `Summarize the content of this document, focusing on key details of the work or service proposed, costs, and timeline. Exclude any banking information. Format the summary as a concise paragraph.`, 
            file_urls: [file_url],
        });

        if (response && response.data) {
            return Response.json({ success: true, summary: response.data });
        } else {
            return Response.json({ success: false, error: 'Failed to summarize quote' }, { status: 500 });
        }

    } catch (error) {
        console.error('Error summarizing quote:', error);
        return Response.json({ success: false, error: error.message }, { status: 500 });
    }
});