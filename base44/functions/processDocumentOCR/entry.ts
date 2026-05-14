import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Verify user is authenticated
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { documentId } = await req.json();

    if (!documentId) {
      return Response.json({ error: 'Document ID required' }, { status: 400 });
    }

    // Get the document
    const documents = await base44.asServiceRole.entities.Document.filter({ id: documentId });
    const document = documents[0];

    if (!document) {
      return Response.json({ error: 'Document not found' }, { status: 404 });
    }

    // Update status to processing
    await base44.asServiceRole.entities.Document.update(documentId, {
      ocr_status: 'processing'
    });

    // Extract text content using AI
    const prompt = `Extract all text content from this document. Return ONLY the raw text content, no formatting, no explanations. If it's a PDF with multiple pages, extract text from all pages in order.`;

    try {
      const response = await base44.asServiceRole.integrations.Core.InvokeLLM({
        prompt: prompt,
        file_urls: [document.file_url]
      });

      const ocrContent = typeof response === 'string' ? response : response.text || '';

      // Update document with OCR content
      await base44.asServiceRole.entities.Document.update(documentId, {
        ocr_content: ocrContent,
        ocr_status: 'completed',
        ocr_processed_date: new Date().toISOString()
      });

      return Response.json({
        success: true,
        documentId,
        contentLength: ocrContent.length,
        message: 'OCR processing completed'
      });

    } catch (ocrError) {
      // Update status to failed
      await base44.asServiceRole.entities.Document.update(documentId, {
        ocr_status: 'failed'
      });

      return Response.json({
        success: false,
        error: 'OCR processing failed',
        details: ocrError.message
      }, { status: 500 });
    }

  } catch (error) {
    return Response.json({ 
      error: 'Failed to process document', 
      details: error.message 
    }, { status: 500 });
  }
});