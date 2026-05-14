import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized - Admin only' }, { status: 401 });
    }

    const templates = [
      {
        name: 'Standard Move-In/Move-Out Policy',
        policy_type: 'move_in_move_out',
        description: 'Comprehensive policy covering resident move-in and move-out procedures',
        template_content: `MOVE-IN/MOVE-OUT POLICY - {building_name}

1. BOOKING REQUIREMENTS
All residents must book move-in/move-out times at least 48 hours in advance through the building management system.

2. PERMITTED TIMES
Moving activities are permitted:
- Monday to Friday: 9:00 AM - 5:00 PM
- Saturday: 10:00 AM - 4:00 PM
- Sunday and public holidays: No moving permitted

3. LIFT RESERVATION
The service lift must be reserved and will be allocated on a first-come, first-served basis.

4. DEPOSIT
A refundable bond of $500 is required to secure the booking. This will be returned within 14 days if no damage occurs.

5. INSURANCE
Residents must provide proof of insurance from their removalist company covering public liability of at least $10 million.

6. PARKING
Temporary loading zone parking may be available subject to availability and approval.

7. COMMON AREA PROTECTION
All common areas must be protected during the move. Padding materials for walls and floors must be used.

8. CLEANING
Common areas must be left clean and free of debris after the move is complete.

9. DAMAGE
Any damage to common property will be assessed and charged to the resident or deducted from the bond.`,
        template_key_points: [
          'Book 48 hours in advance',
          '$500 refundable bond required',
          'Insurance certificate from removalist required',
          'Moving only permitted during specified hours',
          'Protect all common areas during move'
        ],
        applies_to: 'all_residents',
        customization_hints: [
          'Look for specific moving hours in building bylaws',
          'Check for bond/deposit amounts mentioned',
          'Find any specific lift or loading dock requirements',
          'Identify insurance requirements',
          'Note any parking restrictions or arrangements'
        ],
        is_default: true
      },
      {
        name: 'Standard Pet Policy',
        policy_type: 'pet_policy',
        description: 'Policy covering pet ownership and responsibilities in residential buildings',
        template_content: `PET POLICY - {building_name}

1. APPROVAL REQUIREMENT
All pets must be approved by the Owners Corporation before being brought into the building.

2. PERMITTED PETS
The following pets are generally permitted subject to approval:
- Dogs (maximum 2 per unit)
- Cats (maximum 2 per unit)
- Small caged birds
- Fish in aquariums

3. PROHIBITED PETS
The following are not permitted:
- Dangerous or restricted breed dogs
- Exotic animals
- Farm animals
- Any animal that causes nuisance

4. REGISTRATION
All pets must be registered with:
- Building management
- Local council (where required)
- Microchip registration

5. COMMON AREAS
- Pets must be on a leash or carried in common areas
- Pets are not permitted in swimming pools, gyms, or food preparation areas
- Owners must immediately clean up after their pets

6. NOISE
Pets must not create excessive noise that disturbs other residents, particularly barking dogs.

7. DAMAGE
Owners are responsible for any damage caused by their pets to common property or other units.

8. VISITOR PETS
Visiting pets must be approved in advance and comply with all building pet policies.`,
        template_key_points: [
          'Prior approval required for all pets',
          'Maximum 2 dogs or cats per unit',
          'Pets must be registered with building and council',
          'Must be leashed in common areas',
          'Owners liable for any damage or nuisance'
        ],
        applies_to: 'all_residents',
        customization_hints: [
          'Check bylaws for specific pet restrictions or approvals',
          'Look for maximum number of pets allowed',
          'Identify any breed restrictions',
          'Find specific common area restrictions',
          'Check for any pet deposit or fee requirements'
        ],
        is_default: true
      },
      {
        name: 'WHS & Safety Policy',
        policy_type: 'whs_safety',
        description: 'Workplace Health & Safety policy for building operations and contractors',
        template_content: `WORK HEALTH & SAFETY POLICY - {building_name}

1. COMMITMENT
{building_name} is committed to providing a safe environment for all residents, visitors, contractors, and staff.

2. CONTRACTOR REQUIREMENTS
All contractors must:
- Hold appropriate licenses and insurance
- Provide a Safe Work Method Statement (SWMS) for high-risk work
- Conduct toolbox talks before commencing work
- Wear appropriate PPE at all times
- Report all incidents and near misses

3. COMMON AREA SAFETY
- Keep all fire exits clear and unobstructed
- Report any safety hazards immediately
- Do not prop open fire doors
- Ensure adequate lighting in all common areas

4. EMERGENCY PROCEDURES
- Familiarize yourself with emergency evacuation routes
- Know the location of fire extinguishers and emergency equipment
- Report to the designated assembly area during evacuations
- Follow instructions from emergency personnel

5. INCIDENT REPORTING
All incidents, injuries, or near misses must be reported to building management within 24 hours.

6. INSPECTIONS
Regular safety inspections will be conducted quarterly.

7. TRAINING
Building staff receive annual WHS training and certification.`,
        template_key_points: [
          'All contractors must provide SWMS for high-risk work',
          'PPE required for all maintenance work',
          'All incidents must be reported within 24 hours',
          'Fire exits must remain clear at all times',
          'Regular safety inspections conducted quarterly'
        ],
        applies_to: 'contractors',
        customization_hints: [
          'Look for specific safety requirements in building documents',
          'Check for emergency evacuation procedures',
          'Identify any specific contractor requirements',
          'Find details about incident reporting processes',
          'Check for required safety equipment or certifications'
        ],
        is_default: true
      }
    ];

    const created = [];
    for (const template of templates) {
      const existing = await base44.asServiceRole.entities.PolicyTemplate.filter({ 
        name: template.name 
      });
      
      if (existing.length === 0) {
        const newTemplate = await base44.asServiceRole.entities.PolicyTemplate.create(template);
        created.push(newTemplate);
      }
    }

    return Response.json({
      success: true,
      message: `Created ${created.length} policy templates`,
      templates: created
    });

  } catch (error) {
    console.error('Error seeding templates:', error);
    return Response.json({ 
      error: error.message || 'Failed to seed templates' 
    }, { status: 500 });
  }
});