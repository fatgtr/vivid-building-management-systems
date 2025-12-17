import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { originalDocumentId, newFileUrl, versionNotes } = await req.json();

    if (!originalDocumentId || !newFileUrl) {
      return Response.json({ 
        error: 'Original document ID and new file URL required' 
      }, { status: 400 });
    }

    // Get the original document
    const originalDocs = await base44.entities.Document.filter({ id: originalDocumentId });
    const originalDoc = originalDocs[0];

    if (!originalDoc) {
      return Response.json({ error: 'Original document not found' }, { status: 404 });
    }

    // Archive the old version
    await base44.asServiceRole.entities.Document.update(originalDocumentId, {
      status: 'archived'
    });

    // Get file info from URL
    const fileResponse = await fetch(newFileUrl, { method: 'HEAD' });
    const contentType = fileResponse.headers.get('content-type') || '';
    const contentLength = parseInt(fileResponse.headers.get('content-length') || '0');

    // Create new version
    const newVersion = await base44.entities.Document.create({
      ...originalDoc,
      id: undefined, // Remove old ID
      created_date: undefined,
      updated_date: undefined,
      file_url: newFileUrl,
      file_type: contentType,
      file_size: contentLength,
      version: (originalDoc.version || 1) + 1,
      parent_document_id: originalDoc.parent_document_id || originalDocumentId,
      version_notes: versionNotes || `Updated by ${user.full_name}`,
      status: 'active',
      ocr_status: 'pending',
      ocr_content: null,
      ocr_processed_date: null
    });

    // Trigger OCR processing for new version
    await base44.functions.invoke('processDocumentOCR', {
      documentId: newVersion.id
    });

    return Response.json({
      success: true,
      newVersion,
      message: 'New version created successfully'
    });

  } catch (error) {
    return Response.json({ 
      error: 'Failed to create version', 
      details: error.message 
    }, { status: 500 });
  }
});