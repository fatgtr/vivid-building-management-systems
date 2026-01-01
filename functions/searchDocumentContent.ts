import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Authenticate user
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { 
      buildingName,
      documentCategory,
      searchQuery
    } = await req.json();

    if (!buildingName && !documentCategory && !searchQuery) {
      return Response.json({ 
        error: 'At least one search parameter is required' 
      }, { status: 400 });
    }

    // Find the building if specified
    let building = null;
    if (buildingName) {
      const buildings = await base44.entities.Building.list();
      building = buildings.find(b => 
        b.name?.toLowerCase().includes(buildingName.toLowerCase())
      );
      
      if (!building) {
        return Response.json({ 
          error: `Building "${buildingName}" not found` 
        }, { status: 404 });
      }
    }

    // Search for documents
    let documents = await base44.entities.Document.list();
    
    // Filter by building
    if (building) {
      documents = documents.filter(d => d.building_id === building.id);
    }
    
    // Filter by category
    if (documentCategory) {
      documents = documents.filter(d => 
        d.category?.toLowerCase().includes(documentCategory.toLowerCase())
      );
    }

    // Search in titles, descriptions, and OCR content
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      documents = documents.filter(d => 
        d.title?.toLowerCase().includes(query) ||
        d.description?.toLowerCase().includes(query) ||
        d.ocr_content?.toLowerCase().includes(query) ||
        d.ai_summary?.toLowerCase().includes(query)
      );
    }

    // Get related bylaws if documents are bylaws-related
    const documentIds = documents.map(d => d.id);
    let bylaws = [];
    
    if (building && documentCategory?.toLowerCase().includes('bylaw')) {
      bylaws = await base44.entities.BuildingBylaw.filter({ 
        building_id: building.id 
      });
    }

    // Get strata management info if relevant
    let strataInfo = [];
    if (building && documentCategory?.toLowerCase().includes('strata')) {
      strataInfo = await base44.entities.StrataManagementInfo.filter({ 
        building_id: building.id 
      });
    }

    // Format results
    const results = documents.map(doc => ({
      id: doc.id,
      title: doc.title,
      category: doc.category,
      description: doc.description,
      fileUrl: doc.file_url,
      ocrContent: doc.ocr_content ? doc.ocr_content.substring(0, 2000) : null,
      aiSummary: doc.ai_summary,
      uploadedDate: doc.created_date,
      expiryDate: doc.expiry_date,
      buildingId: doc.building_id,
      buildingName: building?.name
    }));

    return Response.json({
      success: true,
      building: building ? {
        id: building.id,
        name: building.name,
        address: building.address
      } : null,
      documents: results,
      bylaws: bylaws.map(b => ({
        id: b.id,
        title: b.title,
        type: b.bylaw_type,
        description: b.description,
        restrictions: b.restrictions,
        effectiveDate: b.effective_date,
        status: b.status
      })),
      strataInfo: strataInfo.map(s => ({
        id: s.id,
        title: s.title,
        type: s.info_type,
        description: s.description,
        requirements: s.requirements
      })),
      total: results.length
    });

  } catch (error) {
    console.error('Document search error:', error);
    return Response.json({ 
      error: error.message || 'Failed to search documents' 
    }, { status: 500 });
  }
});