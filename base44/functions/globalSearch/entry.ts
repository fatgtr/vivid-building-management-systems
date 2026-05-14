import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { query, buildingId, entityTypes } = await req.json();
    
    if (!query || query.length < 2) {
      return Response.json({ error: 'Query must be at least 2 characters' }, { status: 400 });
    }

    const searchQuery = query.toLowerCase();
    const results = {
      workOrders: [],
      documents: [],
      residents: [],
      assets: [],
      amenities: [],
      announcements: []
    };

    // Search Work Orders
    if (!entityTypes || entityTypes.includes('workOrders')) {
      const workOrders = await base44.asServiceRole.entities.WorkOrder.list();
      results.workOrders = workOrders.filter(wo => {
        const matchesBuilding = !buildingId || wo.building_id === buildingId;
        const matchesQuery = 
          wo.title?.toLowerCase().includes(searchQuery) ||
          wo.description?.toLowerCase().includes(searchQuery) ||
          wo.main_category?.toLowerCase().includes(searchQuery) ||
          wo.subcategory?.toLowerCase().includes(searchQuery);
        return matchesBuilding && matchesQuery;
      }).slice(0, 10);
    }

    // Search Documents (including OCR content)
    if (!entityTypes || entityTypes.includes('documents')) {
      const documents = await base44.asServiceRole.entities.Document.list();
      results.documents = documents.filter(doc => {
        const matchesBuilding = !buildingId || doc.building_id === buildingId;
        const matchesQuery = 
          doc.title?.toLowerCase().includes(searchQuery) ||
          doc.description?.toLowerCase().includes(searchQuery) ||
          doc.category?.toLowerCase().includes(searchQuery) ||
          doc.ocr_content?.toLowerCase().includes(searchQuery) ||
          doc.ai_summary?.toLowerCase().includes(searchQuery);
        return matchesBuilding && matchesQuery;
      }).slice(0, 10);
    }

    // Search Residents
    if (!entityTypes || entityTypes.includes('residents')) {
      const residents = await base44.asServiceRole.entities.Resident.list();
      results.residents = residents.filter(res => {
        const matchesBuilding = !buildingId || res.building_id === buildingId;
        const matchesQuery = 
          res.first_name?.toLowerCase().includes(searchQuery) ||
          res.last_name?.toLowerCase().includes(searchQuery) ||
          res.email?.toLowerCase().includes(searchQuery) ||
          res.unit_number?.toLowerCase().includes(searchQuery);
        return matchesBuilding && matchesQuery;
      }).slice(0, 10);
    }

    // Search Assets
    if (!entityTypes || entityTypes.includes('assets')) {
      const assets = await base44.asServiceRole.entities.Asset.list();
      results.assets = assets.filter(asset => {
        const matchesBuilding = !buildingId || asset.building_id === buildingId;
        const matchesQuery = 
          asset.name?.toLowerCase().includes(searchQuery) ||
          asset.asset_type?.toLowerCase().includes(searchQuery) ||
          asset.identifier?.toLowerCase().includes(searchQuery) ||
          asset.manufacturer?.toLowerCase().includes(searchQuery) ||
          asset.model?.toLowerCase().includes(searchQuery);
        return matchesBuilding && matchesQuery;
      }).slice(0, 10);
    }

    // Search Amenities
    if (!entityTypes || entityTypes.includes('amenities')) {
      const amenities = await base44.asServiceRole.entities.Amenity.list();
      results.amenities = amenities.filter(amenity => {
        const matchesBuilding = !buildingId || amenity.building_id === buildingId;
        const matchesQuery = 
          amenity.name?.toLowerCase().includes(searchQuery) ||
          amenity.description?.toLowerCase().includes(searchQuery) ||
          amenity.amenity_type?.toLowerCase().includes(searchQuery);
        return matchesBuilding && matchesQuery;
      }).slice(0, 10);
    }

    // Search Announcements
    if (!entityTypes || entityTypes.includes('announcements')) {
      const announcements = await base44.asServiceRole.entities.Announcement.list();
      results.announcements = announcements.filter(ann => {
        const matchesBuilding = !buildingId || ann.building_id === buildingId;
        const matchesQuery = 
          ann.title?.toLowerCase().includes(searchQuery) ||
          ann.content?.toLowerCase().includes(searchQuery);
        return matchesBuilding && matchesQuery;
      }).slice(0, 10);
    }

    const totalResults = Object.values(results).reduce((sum, arr) => sum + arr.length, 0);

    return Response.json({ 
      results, 
      totalResults,
      query: searchQuery 
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});