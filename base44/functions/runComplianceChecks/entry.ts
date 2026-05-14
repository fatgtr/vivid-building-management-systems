import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Verify admin access
    const user = await base44.auth.me();
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const results = {
      processed: 0,
      created: 0,
      updated: 0,
      errors: []
    };

    // Fetch all certificate and insurance documents
    const documents = await base44.asServiceRole.entities.Document.filter({
      category: ['certificate', 'insurance']
    });

    console.log(`Found ${documents.length} compliance documents to process`);

    for (const doc of documents) {
      try {
        // Use AI to extract compliance data from the document
        const extractionResult = await base44.asServiceRole.integrations.Core.InvokeLLM({
          prompt: `Analyze this compliance document and extract the following information:
1. Certificate/Policy Number
2. Expiry Date (in YYYY-MM-DD format)
3. Type of compliance (choose from: annual_fire_safety_statement, pool_registration_certificate, lift_registration_certificate, emergency_evacuation_assistance_audit, cooling_tower_inspection_program, reduced_pressure_zone_rpz, roof_height_safety_systems, gym_equipment_safety_check, thermostatic_mixing_valves_tmv, thermal_scanning_switchboard, emergency_planning_evac, fire_storage_tank_drain_clean, electrical_testing, plumbing_check, emergency_lighting, exit_signage, fire_equipment, hvac_service, backflow_prevention, pool_safety, other)
4. Any inspection findings or status (pass/fail/compliant/non-compliant)

Document Title: ${doc.title}
Document Description: ${doc.description || 'N/A'}
Document Category: ${doc.category}

If you cannot find a specific field, return null for that field.`,
          file_urls: [doc.file_url],
          response_json_schema: {
            type: "object",
            properties: {
              certificate_number: { type: "string" },
              expiry_date: { type: "string" },
              compliance_type: { type: "string" },
              findings: { type: "string" }
            }
          }
        });

        const { certificate_number, expiry_date, compliance_type, findings } = extractionResult;

        // Determine compliance status
        let status = 'compliant';
        const today = new Date();
        
        if (!certificate_number) {
          status = 'non_compliant';
        } else if (expiry_date) {
          const expiryDate = new Date(expiry_date);
          const daysUntilExpiry = Math.floor((expiryDate - today) / (1000 * 60 * 60 * 24));
          
          if (daysUntilExpiry < 0) {
            status = 'overdue';
          } else if (daysUntilExpiry <= 30) {
            status = 'requires_action';
          } else {
            status = 'compliant';
          }
        }

        // Check if a ComplianceRecord already exists for this document
        const existingRecords = await base44.asServiceRole.entities.ComplianceRecord.filter({
          building_id: doc.building_id,
          certificate_url: doc.file_url
        });

        const complianceData = {
          building_id: doc.building_id,
          compliance_type: compliance_type || 'other',
          certificate_number: certificate_number || '',
          certificate_url: doc.file_url,
          expiry_date: expiry_date || null,
          status: status,
          findings: findings || `AI-processed from document: ${doc.title}`,
          inspection_date: new Date().toISOString().split('T')[0],
          next_due_date: expiry_date || null
        };

        if (existingRecords.length > 0) {
          // Update existing record
          await base44.asServiceRole.entities.ComplianceRecord.update(
            existingRecords[0].id,
            complianceData
          );
          results.updated++;
        } else {
          // Create new record
          await base44.asServiceRole.entities.ComplianceRecord.create(complianceData);
          results.created++;
        }

        results.processed++;

      } catch (error) {
        console.error(`Error processing document ${doc.id}:`, error);
        results.errors.push({
          document_id: doc.id,
          document_title: doc.title,
          error: error.message
        });
      }
    }

    console.log('Compliance check results:', results);

    return Response.json({
      success: true,
      message: `Processed ${results.processed} documents. Created ${results.created} new records, updated ${results.updated} existing records.`,
      results
    });

  } catch (error) {
    console.error('Compliance check error:', error);
    return Response.json({ 
      success: false,
      error: error.message 
    }, { status: 500 });
  }
});