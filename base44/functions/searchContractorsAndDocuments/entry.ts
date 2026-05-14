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
      query, 
      searchType = 'all', // 'all', 'contractors', 'documents'
      page = 1, 
      pageSize = 10 
    } = await req.json();

    if (!query || query.trim().length === 0) {
      return Response.json({ 
        error: 'Search query is required' 
      }, { status: 400 });
    }

    const searchTerm = query.toLowerCase().trim();
    const results = [];

    // Search contractors
    if (searchType === 'all' || searchType === 'contractors') {
      const contractors = await base44.entities.Contractor.list();
      
      const matchingContractors = contractors.filter(c => {
        return (
          c.company_name?.toLowerCase().includes(searchTerm) ||
          c.contact_name?.toLowerCase().includes(searchTerm) ||
          c.email?.toLowerCase().includes(searchTerm) ||
          c.phone?.includes(searchTerm) ||
          c.abn?.includes(searchTerm) ||
          c.license_number?.toLowerCase().includes(searchTerm) ||
          c.specialty?.some(s => s.toLowerCase().includes(searchTerm))
        );
      });

      for (const contractor of matchingContractors) {
        results.push({
          type: 'contractor',
          id: contractor.id,
          title: contractor.company_name,
          subtitle: contractor.contact_name,
          description: `${contractor.email || ''} • ${contractor.phone || ''}`,
          status: contractor.status,
          complianceScore: contractor.compliance_score,
          metadata: {
            specialty: contractor.specialty,
            license: contractor.license_number,
            rating: contractor.rating
          }
        });
      }
    }

    // Search contractor documents
    if (searchType === 'all' || searchType === 'documents') {
      const allDocuments = await base44.entities.ContractorDocument.list();
      
      const matchingDocuments = allDocuments.filter(doc => {
        return (
          doc.title?.toLowerCase().includes(searchTerm) ||
          doc.description?.toLowerCase().includes(searchTerm) ||
          doc.category?.toLowerCase().includes(searchTerm) ||
          doc.policy_number?.toLowerCase().includes(searchTerm)
        );
      });

      // Get contractor details for documents
      const contractorIds = [...new Set(matchingDocuments.map(d => d.contractor_id))];
      const contractors = await base44.entities.Contractor.filter({
        id: { $in: contractorIds }
      });
      
      const contractorMap = {};
      contractors.forEach(c => {
        contractorMap[c.id] = c;
      });

      for (const doc of matchingDocuments) {
        const contractor = contractorMap[doc.contractor_id];
        results.push({
          type: 'document',
          id: doc.id,
          contractorId: doc.contractor_id,
          title: doc.title,
          subtitle: contractor?.company_name || 'Unknown Contractor',
          description: `${doc.category.replace(/_/g, ' ')} • ${doc.policy_number || 'No policy number'}`,
          status: doc.status,
          metadata: {
            category: doc.category,
            expiryDate: doc.expiry_date,
            issueDate: doc.issue_date,
            fileUrl: doc.file_url,
            policyNumber: doc.policy_number
          }
        });
      }
    }

    // Apply pagination
    const total = results.length;
    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const paginatedResults = results.slice(startIndex, endIndex);

    return Response.json({
      success: true,
      results: paginatedResults,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
        hasNext: endIndex < total,
        hasPrevious: page > 1
      }
    });

  } catch (error) {
    console.error('Search error:', error);
    return Response.json({ 
      error: error.message || 'Failed to perform search' 
    }, { status: 500 });
  }
});