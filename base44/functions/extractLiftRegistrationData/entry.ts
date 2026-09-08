import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import {
  upsertAssets,
  linkDocumentToAssets,
  ensureDocument,
  buildSummary
} from '../../shared/assetImport.js';

function toISO(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { file_url, buildingId, documentId, fileName } = await req.json();
    if (!file_url || !buildingId) {
      return Response.json({ success: false, error: 'Missing required parameters: file_url and buildingId' }, { status: 400 });
    }

    const registrationSchema = {
      type: 'object',
      properties: {
        building_name: { type: 'string' },
        building_address: { type: 'string' },
        lifts: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              lift_identifier: { type: 'string' },
              registration_number: { type: 'string' },
              plant_number: { type: 'string' },
              issue_date: { type: 'string', description: 'YYYY-MM-DD' },
              expiry_date: { type: 'string', description: 'YYYY-MM-DD' },
              next_inspection_date: { type: 'string' },
              certifying_body: { type: 'string' },
              inspector_name: { type: 'string' },
              inspector_license: { type: 'string' },
              lift_type: { type: 'string' },
              control_type: { type: 'string' },
              drive_suspension_type: { type: 'string' },
              carriage_type: { type: 'string' },
              rated_load_kg: { type: 'number' },
              max_passengers: { type: 'number' },
              travel_m: { type: 'number' },
              designer_rated_speed: { type: 'number' },
              manufacturer: { type: 'string' },
              model_name: { type: 'string' },
              year_of_manufacture: { type: 'number' },
              serial_number: { type: 'string' },
              design_registration_number: { type: 'string' },
              plant_location: { type: 'string' },
              capacity: { type: 'string' },
              location: { type: 'string' },
              conditions: { type: 'string' },
              compliance_status: { type: 'string' }
            },
            required: ['lift_identifier', 'expiry_date']
          }
        }
      },
      required: ['lifts']
    };

    const prompt = `You are analyzing a lift plant registration certificate for a building.
Extract all lift registration information: identifiers, registration numbers, issue/expiry dates, certifying body, lift specifications (type, control, drive, load, passengers, travel, speed), manufacturer details, design registration, plant location and conditions.
CRITICAL: extract the expiry date accurately for automated renewal reminders. Extract ALL lifts mentioned.`;

    const extractedData: any = await base44.integrations.Core.InvokeLLM({
      prompt,
      file_urls: [file_url],
      response_json_schema: registrationSchema
    });

    const lifts = (extractedData && extractedData.lifts) || [];
    const currentYear = new Date().getFullYear();

    const assetFields = lifts.map((lift: any) => {
      const manufactureYear = lift.year_of_manufacture || currentYear - 10;
      const lifecycleYears = 20;
      const replacementYear = manufactureYear + lifecycleYears;
      const replacementCost = 150000;
      const yearsRemaining = Math.max(0, replacementYear - currentYear);
      const annualSinkingFund = yearsRemaining > 0 ? Math.round(replacementCost / yearsRemaining) : 0;
      return {
        building_id: buildingId,
        asset_main_category: 'vertical_transportation',
        asset_subcategory: 'lifts',
        asset_type: lift.lift_type || 'lift',
        name: lift.lift_identifier,
        identifier: lift.registration_number || lift.plant_number || lift.lift_identifier,
        location: lift.location || lift.plant_location,
        manufacturer: lift.manufacturer || lift.certifying_body,
        model: lift.model_name || lift.lift_type || 'lift',
        installation_date: lift.issue_date || null,
        last_service_date: lift.issue_date || null,
        next_service_date: lift.expiry_date || null,
        service_frequency: 'yearly',
        compliance_status: lift.compliance_status || 'unknown',
        notes: lift.conditions || null,
        status: 'active',
        lift_type: lift.lift_type || null,
        control_type: lift.control_type || null,
        drive_suspension_type: lift.drive_suspension_type || null,
        carriage_type: lift.carriage_type || null,
        rated_load_kg: lift.rated_load_kg || null,
        max_passengers: lift.max_passengers || null,
        travel_m: lift.travel_m || null,
        designer_rated_speed: lift.designer_rated_speed || null,
        plant_location: lift.plant_location || null,
        serial_number: lift.serial_number || null,
        design_registration_number: lift.design_registration_number || null,
        year_of_manufacture: lift.year_of_manufacture || null,
        registration_number: lift.registration_number || null,
        lifecycle_years: lifecycleYears,
        replacement_cost: replacementCost,
        replacement_year: replacementYear,
        annual_sinking_fund: annualSinkingFund
      };
    });

    const existing = await base44.entities.Asset.filter({ building_id: buildingId });
    const { created, updated, createdCount, updatedCount } = await upsertAssets(base44, existing, assetFields);
    const allAssets = created.concat(updated);

    const docId = await ensureDocument(base44, {
      documentId,
      building_id: buildingId,
      category: 'lift_plant_registration',
      file_url,
      title: fileName ? `Lift Registration - ${fileName}` : 'Lift Plant Registration'
    });
    const linked = await linkDocumentToAssets(base44, docId, allAssets);

    // Maintenance schedules for lifts with expiry dates
    let schedulesCreated = 0;
    const schedules = [];
    for (let i = 0; i < lifts.length; i++) {
      const lift = lifts[i];
      const asset = allAssets[i];
      if (!lift || !lift.expiry_date || !asset) continue;
      const expiryDate = new Date(lift.expiry_date);
      if (isNaN(expiryDate.getTime())) continue;
      const reminder = new Date(expiryDate);
      reminder.setDate(reminder.getDate() - 14);
      schedules.push({
        building_id: buildingId,
        subject: `Lift Registration Renewal - ${lift.lift_identifier}`,
        description: `Lift registration certificate for ${lift.lift_identifier} (Registration: ${lift.registration_number || 'N/A'}) expires ${toISO(expiryDate)}.`,
        event_start: toISO(reminder),
        event_end: toISO(expiryDate),
        recurrence: 'yearly',
        asset: asset.id,
        job_area: lift.location || 'Building Lift',
        contractor_name: lift.certifying_body || null,
        auto_send_email: true,
        status: 'active'
      });
    }
    for (let i = 0; i < schedules.length; i += 150) {
      await base44.entities.MaintenanceSchedule.bulkCreate(schedules.slice(i, i + 150));
    }
    schedulesCreated = schedules.length;

    // Compliance records
    let complianceCreated = 0;
    const compliance = [];
    for (let i = 0; i < lifts.length; i++) {
      const lift = lifts[i];
      const asset = allAssets[i];
      if (!lift || !lift.expiry_date || !asset) continue;
      compliance.push({
        asset_id: asset.id,
        building_id: buildingId,
        compliance_type: 'lift_registration_certificate',
        inspection_date: lift.issue_date || null,
        expiry_date: lift.expiry_date,
        next_due_date: lift.expiry_date,
        status: 'compliant',
        inspector_name: lift.inspector_name || null,
        inspector_company: lift.certifying_body || null,
        certificate_number: lift.registration_number || null
      });
    }
    for (let i = 0; i < compliance.length; i += 150) {
      await base44.entities.ComplianceRecord.bulkCreate(compliance.slice(i, i + 150));
    }
    complianceCreated = compliance.length;

    return Response.json({
      ...buildSummary({ created: createdCount, updated: updatedCount, unmatched: 0, documentId: docId, linked }),
      maintenanceSchedules: schedulesCreated,
      complianceRecords: complianceCreated
    });
  } catch (error) {
    console.error('Lift registration extraction error:', error);
    return Response.json({ success: false, error: error.message || 'Failed to extract lift registration data' }, { status: 500 });
  }
}