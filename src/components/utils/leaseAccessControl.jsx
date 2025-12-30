import { base44 } from '@/api/base44Client';

/**
 * Check if the current user can access a specific lease agreement
 * @param {object} leaseAgreement - The lease agreement to check access for
 * @param {object} user - The current user
 * @returns {Promise<boolean>} - Whether the user can access this lease
 */
export async function canAccessLeaseAgreement(leaseAgreement, user) {
  if (!leaseAgreement || !user) return false;

  // Admin and building managers can access all leases
  if (user.role === 'admin') return true;

  // Check if user is the resident associated with this lease
  if (leaseAgreement.resident_id) {
    const residents = await base44.entities.Resident.filter({ 
      id: leaseAgreement.resident_id,
      email: user.email 
    });
    if (residents.length > 0) return true;
  }

  // Check if user is a managing agent for this lease
  const resident = await base44.entities.Resident.get(leaseAgreement.resident_id);
  if (resident?.managing_agent_email === user.email) return true;

  // Check if user is building manager for this building
  if (leaseAgreement.building_id) {
    const building = await base44.entities.Building.get(leaseAgreement.building_id);
    if (building?.manager_email === user.email) return true;
    
    // Check if user has permission via strata plan number
    if (building?.strata_plan_number && user.managed_building_strata_plans?.includes(building.strata_plan_number)) {
      return true;
    }
  }

  return false;
}

/**
 * Filter lease agreements to only those the user can access
 * @param {array} leaseAgreements - Array of lease agreements
 * @param {object} user - The current user
 * @returns {Promise<array>} - Filtered lease agreements
 */
export async function filterAccessibleLeaseAgreements(leaseAgreements, user) {
  if (!user) return [];
  if (user.role === 'admin') return leaseAgreements;

  const accessibleLeases = [];
  for (const lease of leaseAgreements) {
    if (await canAccessLeaseAgreement(lease, user)) {
      accessibleLeases.push(lease);
    }
  }
  return accessibleLeases;
}

/**
 * Check if a document is a lease agreement and if the user can access it
 * @param {object} document - The document to check
 * @param {object} user - The current user
 * @returns {Promise<boolean>} - Whether the user can access this document
 */
export async function canAccessLeaseDocument(document, user) {
  if (!document || !user) return false;

  // Admin can access all documents
  if (user.role === 'admin') return true;

  // If it's not a lease agreement category, standard document visibility rules apply
  if (document.category !== 'lease_agreement') return true;

  // For lease agreements, check if linked to a RentalAgreement the user can access
  if (document.id) {
    const rentalAgreements = await base44.entities.RentalAgreement.filter({ 
      document_id: document.id 
    });
    
    for (const agreement of rentalAgreements) {
      if (await canAccessLeaseAgreement(agreement, user)) {
        return true;
      }
    }
  }

  // Check if user is building manager for this building
  if (document.building_id) {
    const building = await base44.entities.Building.get(document.building_id);
    if (building?.manager_email === user.email) return true;
    
    if (building?.strata_plan_number && user.managed_building_strata_plans?.includes(building.strata_plan_number)) {
      return true;
    }
  }

  return false;
}