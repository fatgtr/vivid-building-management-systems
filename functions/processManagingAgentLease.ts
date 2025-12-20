import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Authenticate user
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { residentId, residentEmail, buildingId, unitId, fileUrl } = await req.json();

    if (!residentId || !residentEmail || !buildingId || !fileUrl) {
      return Response.json({ 
        success: false, 
        error: 'Missing required parameters' 
      }, { status: 400 });
    }

    // Step 1: Analyze the lease document with AI
    const leaseAnalysis = await base44.integrations.Core.InvokeLLM({
      prompt: `Analyze this tenancy agreement and extract the following information:
        - Lease start date
        - Lease end date
        - Monthly rent amount
        - Security deposit/bond amount
        - Pet policy (allowed/not allowed/details)
        - Parking details (included, spot number, additional cost)
        - Any special clauses or conditions
        - Renewal terms
        
        Be thorough and accurate. Extract exact dates and amounts.`,
      file_urls: [fileUrl],
      response_json_schema: {
        type: "object",
        properties: {
          lease_start_date: { type: "string", description: "Format: YYYY-MM-DD" },
          lease_end_date: { type: "string", description: "Format: YYYY-MM-DD" },
          monthly_rent: { type: "number" },
          security_deposit: { type: "number" },
          pet_policy: { type: "string" },
          parking_included: { type: "boolean" },
          parking_details: { type: "string" },
          special_clauses: { 
            type: "array", 
            items: { type: "string" } 
          },
          renewal_terms: { type: "string" },
          full_summary: { type: "string" }
        }
      }
    });

    // Step 2: Create or update LeaseAnalysis record
    const existingLeases = await base44.asServiceRole.entities.LeaseAnalysis.filter({ 
      resident_email: residentEmail 
    });

    let leaseRecord;
    const leaseData = {
      resident_email: residentEmail,
      document_id: fileUrl,
      lease_start_date: leaseAnalysis.lease_start_date || null,
      lease_end_date: leaseAnalysis.lease_end_date || null,
      monthly_rent: leaseAnalysis.monthly_rent || null,
      security_deposit: leaseAnalysis.security_deposit || null,
      pet_policy: leaseAnalysis.pet_policy || null,
      parking_included: leaseAnalysis.parking_included || false,
      parking_details: leaseAnalysis.parking_details || null,
      special_clauses: leaseAnalysis.special_clauses || [],
      renewal_terms: leaseAnalysis.renewal_terms || null,
      full_analysis: leaseAnalysis.full_summary || null,
    };

    if (existingLeases && existingLeases.length > 0) {
      leaseRecord = await base44.asServiceRole.entities.LeaseAnalysis.update(
        existingLeases[0].id, 
        leaseData
      );
    } else {
      leaseRecord = await base44.asServiceRole.entities.LeaseAnalysis.create(leaseData);
    }

    // Step 3: Update Resident record with extracted info
    const resident = await base44.asServiceRole.entities.Resident.filter({ id: residentId });
    if (resident && resident.length > 0) {
      const updateData = {
        move_in_date: leaseAnalysis.lease_start_date || resident[0].move_in_date,
        move_out_date: leaseAnalysis.lease_end_date || resident[0].move_out_date,
      };
      
      if (leaseAnalysis.parking_details) {
        updateData.parking_spot = leaseAnalysis.parking_details;
      }

      await base44.asServiceRole.entities.Resident.update(residentId, updateData);
    }

    // Step 4: Get building details for amenity booking
    const buildings = await base44.asServiceRole.entities.Building.filter({ id: buildingId });
    const building = buildings && buildings.length > 0 ? buildings[0] : null;

    // Step 5: Book move-in lift amenity
    let moveInBookingId = null;
    if (leaseAnalysis.lease_start_date) {
      const amenities = await base44.asServiceRole.entities.Amenity.filter({ 
        building_id: buildingId,
        amenity_type: 'move_in_lift'
      });

      if (amenities && amenities.length > 0) {
        const moveInBooking = await base44.asServiceRole.entities.AmenityBooking.create({
          amenity_id: amenities[0].id,
          building_id: buildingId,
          resident_id: residentId,
          resident_name: `${resident[0]?.first_name} ${resident[0]?.last_name}`,
          unit_number: resident[0]?.unit_id,
          booking_date: leaseAnalysis.lease_start_date,
          start_time: '09:00',
          end_time: '17:00',
          status: 'approved',
          purpose: 'Move-in',
          notes: 'Automatically booked from tenancy agreement'
        });
        moveInBookingId = moveInBooking.id;
      }
    }

    // Step 6: Book move-out lift amenity
    let moveOutBookingId = null;
    if (leaseAnalysis.lease_end_date) {
      const amenities = await base44.asServiceRole.entities.Amenity.filter({ 
        building_id: buildingId,
        amenity_type: 'move_out_lift'
      });

      if (amenities && amenities.length > 0) {
        const moveOutBooking = await base44.asServiceRole.entities.AmenityBooking.create({
          amenity_id: amenities[0].id,
          building_id: buildingId,
          resident_id: residentId,
          resident_name: `${resident[0]?.first_name} ${resident[0]?.last_name}`,
          unit_number: resident[0]?.unit_id,
          booking_date: leaseAnalysis.lease_end_date,
          start_time: '09:00',
          end_time: '17:00',
          status: 'approved',
          purpose: 'Move-out',
          notes: 'Automatically booked from tenancy agreement'
        });
        moveOutBookingId = moveOutBooking.id;
      }
    }

    // Update lease record with booking IDs
    if (moveInBookingId || moveOutBookingId) {
      await base44.asServiceRole.entities.LeaseAnalysis.update(leaseRecord.id, {
        move_in_lift_booking_id: moveInBookingId,
        move_out_lift_booking_id: moveOutBookingId,
      });
    }

    // Step 7: Call onboarding function to create user account and send welcome email
    const units = await base44.asServiceRole.entities.Unit.filter({ id: unitId });
    const unitNumber = units && units.length > 0 ? units[0].unit_number : null;

    const onboardingResult = await base44.functions.invoke('onboardTenant', {
      residentId,
      residentEmail,
      residentName: `${resident[0]?.first_name} ${resident[0]?.last_name}`,
      buildingId,
      unitNumber,
      leaseStartDate: leaseAnalysis.lease_start_date
    });

    // Step 8: Send detailed lease information email
    if (residentEmail && building) {
      const moveInDate = leaseAnalysis.lease_start_date ? 
        new Date(leaseAnalysis.lease_start_date).toLocaleDateString('en-US', { 
          year: 'numeric', month: 'long', day: 'numeric' 
        }) : 'your move-in date';

      const emailBody = `
        <h2>Your Lease Details - ${building.name}</h2>
        
        <p>Dear ${resident[0]?.first_name},</p>
        
        <p>Your tenancy agreement has been processed. Here are the details:</p>
        
        <h3>📋 Lease Details:</h3>
        <ul>
          <li>Move-in Date: ${moveInDate}</li>
          ${leaseAnalysis.monthly_rent ? `<li>Monthly Rent: $${leaseAnalysis.monthly_rent}</li>` : ''}
          ${leaseAnalysis.security_deposit ? `<li>Security Deposit/Bond: $${leaseAnalysis.security_deposit}</li>` : ''}
          ${leaseAnalysis.parking_included ? `<li>Parking: ${leaseAnalysis.parking_details || 'Included'}</li>` : ''}
        </ul>
        
        ${moveInBookingId ? `
        <h4>🚚 Move-In Lift Booking:</h4>
        <p>We've automatically booked the move-in lift for ${moveInDate}, 9:00 AM - 5:00 PM.</p>
        ` : ''}
        
        <h4>📖 Building Bylaws & Rules:</h4>
        <p>Please review the building bylaws and rules in your resident portal. Key points include:</p>
        <ul>
          <li>Quiet hours: 10 PM - 7 AM</li>
          <li>Common area usage guidelines</li>
          <li>Waste disposal and recycling procedures</li>
          <li>Guest and visitor policies</li>
        </ul>
        
        <h4>💰 Bond Information:</h4>
        ${leaseAnalysis.security_deposit ? `
        <p>Your security deposit of $${leaseAnalysis.security_deposit} will be held in accordance with local tenancy laws. You'll receive full details about the bond lodgment separately.</p>
        ` : ''}
        
        <h4>📦 Move-In Instructions:</h4>
        <ul>
          <li>Access cards will be available for collection from building management</li>
          <li>Please use the designated loading zone during your move</li>
          <li>Ensure elevators are protected during furniture transport</li>
          <li>Report any pre-existing damage within 48 hours</li>
        </ul>
        
        <p>If you have any questions, please don't hesitate to contact your managing agent or building management.</p>
        
        <p><em>This email was automatically generated based on your tenancy agreement.</em></p>
      `;

      await base44.integrations.Core.SendEmail({
        to: residentEmail,
        subject: `Lease Details - ${building.name}`,
        body: emailBody
      });

      // Mark documents as sent
      await base44.asServiceRole.entities.LeaseAnalysis.update(leaseRecord.id, {
        move_in_document_sent: true,
      });
    }

    return Response.json({ 
      success: true, 
      leaseAnalysis: leaseAnalysis,
      bookings: {
        moveIn: moveInBookingId,
        moveOut: moveOutBookingId
      },
      onboarding: onboardingResult.data,
      emailSent: true
    });

  } catch (error) {
    console.error('Lease processing error:', error);
    return Response.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
});