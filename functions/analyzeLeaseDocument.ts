import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { documentUrl, documentId } = await req.json();

    if (!documentUrl) {
      return Response.json({ error: 'documentUrl is required' }, { status: 400 });
    }

    // Use LLM to analyze the lease document
    const analysis = await base44.integrations.Core.InvokeLLM({
      prompt: `Analyze this lease agreement document and extract key information. Be thorough and accurate.`,
      file_urls: [documentUrl],
      response_json_schema: {
        type: "object",
        properties: {
          lease_start_date: { type: "string", description: "Lease start date in YYYY-MM-DD format" },
          lease_end_date: { type: "string", description: "Lease end date in YYYY-MM-DD format" },
          monthly_rent: { type: "number", description: "Monthly rent amount as a number" },
          security_deposit: { type: "number", description: "Security deposit amount" },
          pet_policy: { type: "string", description: "Pet policy details - allowed, not allowed, restrictions" },
          parking_included: { type: "boolean", description: "Is parking included" },
          parking_details: { type: "string", description: "Parking spot number or details" },
          special_clauses: { 
            type: "array", 
            items: { type: "string" },
            description: "List of special clauses, restrictions, or important conditions"
          },
          renewal_terms: { type: "string", description: "Lease renewal terms and conditions" },
          summary: { type: "string", description: "A brief 2-3 sentence summary of the lease" }
        },
        required: ["summary"]
      }
    });

    // Save the analysis
    const leaseAnalysis = await base44.asServiceRole.entities.LeaseAnalysis.create({
      resident_email: user.email,
      document_id: documentId,
      lease_start_date: analysis.lease_start_date || null,
      lease_end_date: analysis.lease_end_date || null,
      monthly_rent: analysis.monthly_rent || null,
      security_deposit: analysis.security_deposit || null,
      pet_policy: analysis.pet_policy || null,
      parking_included: analysis.parking_included || false,
      parking_details: analysis.parking_details || null,
      special_clauses: analysis.special_clauses || [],
      renewal_terms: analysis.renewal_terms || null,
      full_analysis: JSON.stringify(analysis)
    });

    // Auto-create lift bookings if dates are available
    let moveInBooking = null;
    let moveOutBooking = null;

    if (analysis.lease_start_date || analysis.lease_end_date) {
      // Get resident info
      const residents = await base44.asServiceRole.entities.Resident.filter({ email: user.email });
      if (residents.length > 0) {
        const resident = residents[0];
        
        // Find lift amenity
        const amenities = await base44.asServiceRole.entities.Amenity.filter({ 
          building_id: resident.building_id,
          name: { $regex: 'lift|elevator', $options: 'i' }
        });

        if (amenities.length > 0) {
          const liftAmenity = amenities[0];
          const unit = await base44.asServiceRole.entities.Unit.filter({ id: resident.unit_id });

          // Create move-in booking
          if (analysis.lease_start_date) {
            try {
              moveInBooking = await base44.asServiceRole.entities.AmenityBooking.create({
                amenity_id: liftAmenity.id,
                building_id: resident.building_id,
                resident_id: resident.id,
                resident_name: `${resident.first_name} ${resident.last_name}`,
                unit_number: unit[0]?.unit_number,
                booking_date: analysis.lease_start_date,
                start_time: '08:00',
                end_time: '18:00',
                purpose: 'Move-in - Lift reservation (Auto-created from lease)',
                status: 'approved',
                notes: 'Automatically created from lease agreement analysis'
              });
            } catch (error) {
              console.error('Error creating move-in booking:', error);
            }
          }

          // Create move-out booking
          if (analysis.lease_end_date) {
            try {
              moveOutBooking = await base44.asServiceRole.entities.AmenityBooking.create({
                amenity_id: liftAmenity.id,
                building_id: resident.building_id,
                resident_id: resident.id,
                resident_name: `${resident.first_name} ${resident.last_name}`,
                unit_number: unit[0]?.unit_number,
                booking_date: analysis.lease_end_date,
                start_time: '08:00',
                end_time: '18:00',
                purpose: 'Move-out - Lift reservation (Auto-created from lease)',
                status: 'pending',
                notes: 'Automatically created from lease agreement analysis'
              });
            } catch (error) {
              console.error('Error creating move-out booking:', error);
            }
          }
        }
      }

      // Update lease analysis with booking IDs
      if (moveInBooking || moveOutBooking) {
        await base44.asServiceRole.entities.LeaseAnalysis.update(leaseAnalysis.id, {
          move_in_lift_booking_id: moveInBooking?.id,
          move_out_lift_booking_id: moveOutBooking?.id
        });
      }
    }

    return Response.json({
      ...analysis,
      leaseAnalysisId: leaseAnalysis.id,
      bookings: {
        moveIn: moveInBooking,
        moveOut: moveOutBooking
      }
    });

  } catch (error) {
    console.error('Error analyzing lease:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});