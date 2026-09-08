import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import {
  upsertAssets,
  linkDocumentToAssets,
  ensureDocument,
  buildSummary
} from '../../shared/assetImport.js';

export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { file_url, buildingId, documentId, fileName } = await req.json();
    if (!file_url || !buildingId) {
      return Response.json({ success: false, error: 'Missing required parameters: file_url and buildingId' }, { status: 400 });
    }

    const assetSchema = {
      type: 'object',
      properties: {
        document_type: { type: 'string' },
        building_name: { type: 'string' },
        building_address: { type: 'string' },
        inspection_date: { type: 'string' },
        next_inspection_date: { type: 'string' },
        fire_safety_practitioner: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            company: { type: 'string' },
            license_number: { type: 'string' }
          }
        },
        assets: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              asset_type: { type: 'string', description: 'e.g., fire_extinguisher, smoke_detector, fire_panel, sprinkler_system, emergency_lighting, exit_sign, fire_door, fire_hose_reel' },
              name: { type: 'string' },
              identifier: { type: 'string' },
              location: { type: 'string' },
              floor: { type: 'string' },
              manufacturer: { type: 'string' },
              model: { type: 'string' },
              last_service_date: { type: 'string' },
              next_service_date: { type: 'string' },
              service_frequency: { type: 'string' },
              compliance_status: { type: 'string' },
              notes: { type: 'string' }
            },
            required: ['asset_type', 'name', 'location']
          }
        },
        deficiencies: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              description: { type: 'string' },
              location: { type: 'string' },
              severity: { type: 'string' },
              recommended_action: { type: 'string' }
            }
          }
        }
      },
      required: ['assets']
    };

    const prompt = `You are analyzing an AFSS (Annual Fire Safety Statement) document for a building.
Extract all fire safety assets mentioned including fire extinguishers, smoke detectors, fire alarms, fire panels, sprinkler systems, emergency lighting, exit signs, fire doors, fire hose reels and any other fire safety equipment.
For each asset extract type, location, identification numbers/tags, service dates (last and next), compliance status and service frequency.
Also extract the inspection date, next inspection due date, fire safety practitioner details, and any deficiencies or issues noted.
Be thorough and extract all assets mentioned in the document.`;

    const extractedData: any = await base44.integrations.Core.InvokeLLM({
      prompt,
      file_urls: [file_url],
      response_json_schema: assetSchema
    });

    const rawAssets = (extractedData && extractedData.assets) || [];
    const subcatFor = (t: string) => {
      const s = String(t || '').toLowerCase();
      if (s.includes('emergency_lighting') || s === 'emergency_light') return 'emergency_lighting';
      if (s.includes('exit_sign') || s === 'exit_sign' || s === 'exit_light') return 'exit_signage';
      return null;
    };

    const assetFields = rawAssets.map((a: any) => ({
      building_id: buildingId,
      asset_main_category: 'fire_life_safety',
      asset_subcategory: subcatFor(a.asset_type),
      asset_type: a.asset_type,
      name: a.name,
      identifier: a.identifier || null,
      location: a.location,
      floor: a.floor || null,
      manufacturer: a.manufacturer || null,
      model: a.model || null,
      last_service_date: a.last_service_date || null,
      next_service_date: a.next_service_date || null,
      service_frequency: a.service_frequency || 'yearly',
      compliance_status: a.compliance_status || 'unknown',
      notes: a.notes || null,
      status: 'active'
    }));

    const existing = await base44.entities.Asset.filter({ building_id: buildingId });
    const { created, updated, createdCount, updatedCount } = await upsertAssets(base44, existing, assetFields);
    const allAssets = created.concat(updated);

    const docId = await ensureDocument(base44, {
      documentId,
      building_id: buildingId,
      category: 'afss_documentation',
      file_url,
      title: fileName ? `AFSS - ${fileName}` : 'Annual Fire Safety Statement'
    });
    const linked = await linkDocumentToAssets(base44, docId, allAssets);

    // Compliance records
    const inspectionDate = extractedData && extractedData.inspection_date;
    const nextDue = extractedData && extractedData.next_inspection_date;
    let complianceCreated = 0;
    if (inspectionDate) {
      const compliance = allAssets.map((a: any) => ({
        asset_id: a.id,
        building_id: buildingId,
        compliance_type: 'annual_fire_safety_statement',
        inspection_date: inspectionDate,
        next_due_date: nextDue || null,
        status: 'compliant',
        inspector_company: (extractedData.fire_safety_practitioner && extractedData.fire_safety_practitioner.company) || null,
        findings: a.notes || null
      }));
      for (let i = 0; i < compliance.length; i += 150) {
        await base44.entities.ComplianceRecord.bulkCreate(compliance.slice(i, i + 150));
      }
      complianceCreated = compliance.length;
    }

    // Maintenance schedules (preserve original behaviour)
    let schedulesCreated = 0;
    const schedules = rawAssets
      .map((a: any, idx: number) => a.next_service_date ? ({
        building_id: buildingId,
        subject: `${String(a.asset_type || 'Fire safety asset').replace(/_/g, ' ')} Service - ${a.location || ''}`,
        description: `Scheduled maintenance for ${a.name}`,
        event_start: a.next_service_date,
        event_end: a.next_service_date,
        recurrence: a.service_frequency === 'monthly' ? 'monthly'
          : a.service_frequency === 'quarterly' ? 'quarterly'
          : a.service_frequency === 'half_yearly' ? 'half_yearly' : 'yearly',
        asset: allAssets[idx] ? allAssets[idx].id : null,
        job_area: a.location || null,
        status: 'active'
      }) : null)
      .filter(Boolean);
    for (let i = 0; i < schedules.length; i += 150) {
      await base44.entities.MaintenanceSchedule.bulkCreate(schedules.slice(i, i + 150));
    }
    schedulesCreated = schedules.length;

    // Work orders for deficiencies
    let workOrdersCreated = 0;
    const deficiencies = (extractedData && extractedData.deficiencies) || [];
    for (const d of deficiencies) {
      if (!d || !d.description) continue;
      await base44.entities.WorkOrder.create({
        building_id: buildingId,
        title: `AFSS Deficiency: ${String(d.description).slice(0, 180)}`,
        description: `${d.description}${d.location ? `\nLocation: ${d.location}` : ''}${d.severity ? `\nSeverity: ${d.severity}` : ''}${d.recommended_action ? `\nRecommended: ${d.recommended_action}` : ''}`,
        main_category: 'fire_life_safety',
        priority: d.severity && String(d.severity).toLowerCase().includes('critical') ? 'urgent' : 'high',
        status: 'open',
        auto_generated: true,
        source_type: 'manual',
        reported_by: user.email
      });
      workOrdersCreated++;
    }

    return Response.json({
      ...buildSummary({ created: createdCount, updated: updatedCount, unmatched: 0, documentId: docId, linked }),
      complianceRecords: complianceCreated,
      maintenanceSchedules: schedulesCreated,
      workOrders: workOrdersCreated
    });
  } catch (error) {
    console.error('AFSS extraction error:', error);
    return Response.json({ success: false, error: error.message || 'Failed to extract AFSS assets' }, { status: 500 });
  }
}