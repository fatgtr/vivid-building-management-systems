import { base44 } from '@/api/base44Client';

// ─── shared helpers ───────────────────────────────────────────────────────
const norm = (s) => (s == null ? '' : String(s)).trim();

// Match a spreadsheet value against a record's name (case-insensitive, exact then includes)
function matchName(records, value, nameField = 'name') {
  const v = norm(value).toLowerCase();
  if (!v) return null;
  let hit = records.find((r) => String(r[nameField] || '').trim().toLowerCase() === v);
  if (hit) return hit;
  hit = records.find((r) => {
    const n = String(r[nameField] || '').trim().toLowerCase();
    return n && (n.includes(v) || v.includes(n));
  });
  return hit || null;
}

// DD/MM/YYYY → YYYY-MM-DD, with ISO + Date fallbacks
export function parseDdMmYyyy(value) {
  const str = norm(value);
  if (!str) return null;
  let m = str.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4})$/);
  if (m) {
    let [_, d, mo, y] = m;
    if (y.length === 2) y = '20' + y;
    const dt = new Date(Number(y), Number(mo) - 1, Number(d));
    if (!isNaN(dt)) return `${y}-${mo.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }
  m = str.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  const dt = new Date(str);
  if (!isNaN(dt)) return dt.toISOString().slice(0, 10);
  return null;
}

export function toDdMmYyyy(iso) {
  if (!iso) return '';
  const m = String(iso).match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return '';
  return `${m[3]}/${m[2]}/${m[1]}`;
}

const TRUE_WORDS = new Set(['yes', 'y', 'true', '1', 'x', '✓', 'on']);
function parseBool(v) {
  const s = norm(v).toLowerCase();
  return TRUE_WORDS.has(s);
}

// Map a Mybos free-text frequency string to the nearest supported recurrence enum
function mapFrequencyToRecurrence(label) {
  const s = norm(label).toLowerCase();
  if (!s || s === 'one time' || s === 'once' || s === 'one-off') return 'none';
  if (s === 'daily') return 'daily';
  if (s === 'weekly' || s === 'fortnightly' || s.includes('2 week') || s.includes('3 week') || s === 'every 3 weeks' || s === 'every 4 weeks' || s.includes('4 week')) return 'weekly';
  if (s === 'monthly' || s === 'bi monthly' || s.includes('2 month')) return 'monthly';
  if (s === 'four monthly' || s.includes('4 month') || s === 'quarterly' || s.includes('3 month')) return 'quarterly';
  if (s === 'half yearly' || s.includes('6 month') || s.includes('half year')) return 'half_yearly';
  if (s === 'yearly' || s === 'annual' || s === '1 year' || s.includes('12 month')) return 'yearly';
  if (s.includes('2 year') || s.includes('bi year')) return 'bi_yearly';
  const ym = s.match(/(\d+)\s*year/);
  if (ym) return Number(ym[1]) >= 2 ? 'bi_yearly' : 'yearly';
  const mm = s.match(/(\d+)\s*month/);
  if (mm) {
    const months = Number(mm[1]);
    if (months <= 1) return 'monthly';
    if (months <= 4) return 'quarterly';
    if (months <= 6) return 'half_yearly';
    return 'yearly';
  }
  return 'none';
}

const RECURRENCE_LABELS = {
  none: 'One Time', daily: 'Daily', weekly: 'Weekly', monthly: 'Monthly',
  quarterly: 'Quarterly', half_yearly: 'Half Yearly', yearly: 'Yearly', bi_yearly: 'Bi Yearly',
};

// Build a canonical row object from a raw sheet row using a fieldMap (canonical → [aliases])
export function normalizeRow(rawRow, fieldMap) {
  const headerToCanon = {};
  Object.entries(fieldMap).forEach(([canon, aliases]) => {
    aliases.forEach((a) => { headerToCanon[a.toLowerCase().trim()] = canon; });
  });
  const out = {};
  Object.entries(fieldMap).forEach(([canon]) => { out[canon] = ''; });
  Object.entries(rawRow).forEach(([header, value]) => {
    const canon = headerToCanon[norm(header).toLowerCase()];
    if (canon && (out[canon] === '' || out[canon] == null)) out[canon] = value;
  });
  return out;
}

async function fetchCommonLookups(buildingId) {
  const f = buildingId ? { building_id: buildingId } : {};
  const [assets, units, contractors] = await Promise.all([
    buildingId ? base44.entities.Asset.filter(f) : base44.entities.Asset.list(),
    buildingId ? base44.entities.Unit.filter(f) : base44.entities.Unit.list(),
    base44.entities.Contractor.list(),
  ]);
  return { assets, units, contractors };
}

// ─── 1. Maintenance Schedules ─────────────────────────────────────────────
const maintenanceColumns = [
  { header: 'Start Date', required: true },
  { header: 'End Date' },
  { header: 'Frequency', required: true },
  { header: 'Asset' },
  { header: 'Apartment' },
  { header: 'Assigned To (Contractor)' },
  { header: 'Subject', required: true },
  { header: 'Description' },
  { header: 'Send Email Notification' },
  { header: 'Send Before Time' },
];

function maintenanceNotes(r) {
  const bits = [];
  if (r.apartment) bits.push(`Mybos Apartment: ${r.apartment}`);
  if (r.frequency) bits.push(`Mybos Frequency: ${r.frequency}`);
  if (r.send_email) bits.push(`Email Notification: ${r.send_email}`);
  if (r.send_before_time) bits.push(`Send Before: ${r.send_before_time}`);
  return bits.join(' | ');
}

const maintenance = {
  key: 'maintenance',
  label: 'Maintenance Schedules',
  fileName: 'maintenance_schedule',
  sheetName: 'Maintenance Schedules',
  entityName: 'MaintenanceSchedule',
  columns: maintenanceColumns,
  instructions: [
    ['Please note the following'],
    ['Start Date and End Date format should be DD/MM/YYYY'],
    ['Frequency is kept verbatim (e.g. "4 Years", "Fortnightly") and mapped to the nearest supported recurrence for scheduling'],
    ['Asset and Assigned To (Contractor) must match an existing asset/contractor for the selected building, otherwise the row is skipped'],
    ['Subject is mandatory'],
  ],
  fieldMap: {
    start_date: ['Start Date', 'start_date', 'scheduled_date'],
    end_date: ['End Date', 'end_date', 'recurrence_end_date'],
    frequency: ['Frequency', 'frequency', 'frequency_label', 'recurrence'],
    asset_name: ['Asset', 'asset', 'asset_name'],
    apartment: ['Apartment', 'apartment', 'unit'],
    contractor_name: ['Assigned To (Contractor)', 'Assigned To', 'contractor', 'contractor_name'],
    subject: ['Subject', 'subject'],
    description: ['Description', 'description'],
    send_email: ['Send Email Notification', 'send_email', 'email_notification'],
    send_before_time: ['Send Before Time', 'send_before_time', 'reminder_days', 'notification_interval_days'],
  },
  fetchLookups: fetchCommonLookups,
  fetchForExport: (buildingId) => buildingId
    ? base44.entities.MaintenanceSchedule.filter({ building_id: buildingId }, '-next_due_date')
    : base44.entities.MaintenanceSchedule.list('-next_due_date'),
  validateRow(r, lookups, buildingId) {
    if (!norm(r.subject)) return { ok: false, error: 'Subject is required' };
    const startIso = parseDdMmYyyy(r.start_date);
    if (!startIso) return { ok: false, error: 'Start Date is required (DD/MM/YYYY)' };
    const resolved = { asset_id: null, contractor_id: null };
    if (norm(r.asset_name)) {
      const a = matchName(lookups.assets, r.asset_name);
      if (!a) return { ok: false, error: `Asset "${r.asset_name}" not found` };
      resolved.asset_id = a.id;
    }
    if (norm(r.contractor_name)) {
      const c = matchName(lookups.contractors, r.contractor_name, 'company_name');
      if (!c) return { ok: false, error: `Contractor "${r.contractor_name}" not found` };
      resolved.contractor_id = c.id;
    }
    return { ok: true, resolved, extra: { startIso, endIso: parseDdMmYyyy(r.end_date) } };
  },
  async createRecords(pending, lookups, buildingId) {
    const records = pending.map((p) => ({
      building_id: buildingId,
      subject: p.row.subject,
      description: p.row.description || '',
      scheduled_date: p.extra.startIso,
      next_due_date: p.extra.startIso,
      recurrence_end_date: p.extra.endIso || null,
      frequency_label: p.row.frequency || '',
      recurrence: mapFrequencyToRecurrence(p.row.frequency),
      asset_id: p.resolved.asset_id || null,
      assigned_contractor_id: p.resolved.contractor_id || null,
      status: 'active',
      notes: maintenanceNotes(p.row) || null,
    }));
    let created = 0;
    if (records.length) {
      await base44.entities.MaintenanceSchedule.bulkCreate(records);
      created = records.length;
    }
    return { created, extras: '', failed: 0, errors: [] };
  },
  mapEntityToRow(e, lookups) {
    const asset = lookups.assets.find((a) => a.id === e.asset_id);
    const contractor = lookups.contractors.find((c) => c.id === e.assigned_contractor_id);
    return {
      'Start Date': toDdMmYyyy(e.scheduled_date),
      'End Date': toDdMmYyyy(e.recurrence_end_date),
      'Frequency': e.frequency_label || RECURRENCE_LABELS[e.recurrence] || '',
      'Asset': asset?.name || '',
      'Apartment': '',
      'Assigned To (Contractor)': contractor?.company_name || '',
      'Subject': e.subject || '',
      'Description': e.description || '',
      'Send Email Notification': '',
      'Send Before Time': (e.notification_interval_days || []).join(','),
    };
  },
};

// ─── 2. Cases / Work Orders ───────────────────────────────────────────────
const WORK_CATEGORIES = [
  'core_building_structure', 'mechanical_services', 'electrical_services', 'fire_life_safety',
  'vertical_transportation', 'hydraulic_plumbing', 'security_access_control', 'communications_it',
  'building_management_systems', 'external_grounds', 'common_area_fixtures_fittings',
  'waste_management', 'parking_traffic', 'compliance_safety', 'commercial_specific',
  'residential_specific', 'documentation_registers',
];

function mapCaseTypeToCategory(caseType) {
  const s = norm(caseType).toLowerCase().replace(/[-\s]+/g, '_');
  if (WORK_CATEGORIES.includes(s)) return s;
  const Keyword = {
    plumbing: 'hydraulic_plumbing', water: 'hydraulic_plumbing', drain: 'hydraulic_plumbing',
    electrical: 'electrical_services', power: 'electrical_services', light: 'electrical_services',
    fire: 'fire_life_safety', safety: 'fire_life_safety', alarm: 'fire_life_safety',
    hvac: 'mechanical_services', air: 'mechanical_services', cooling: 'mechanical_services', heating: 'mechanical_services',
    lift: 'vertical_transportation', elevator: 'vertical_transportation',
    roof: 'external_grounds', exterior: 'external_grounds', garden: 'external_grounds', grounds: 'external_grounds',
    door: 'doors_windows', window: 'doors_windows',
    structural: 'core_building_structure', wall: 'core_building_structure', concrete: 'core_building_structure',
    security: 'security_access_control', access: 'security_access_control', cctv: 'security_access_control',
    network: 'communications_it', internet: 'communications_it', phone: 'communications_it',
    waste: 'waste_management', garbage: 'waste_management', bin: 'waste_management',
    parking: 'parking_traffic', car: 'parking_traffic',
    compliance: 'compliance_safety', certificate: 'compliance_safety',
  };
  for (const [kw, cat] of Object.entries(Keyword)) {
    if (s.includes(kw)) return cat;
  }
  return 'common_area_fixtures_fittings';
}

function mapPriority(p) {
  const s = norm(p).toLowerCase();
  if (s.includes('urgent') || s.includes('critical') || s.includes('emergency') || s === '1' || s === 'p1') return 'urgent';
  if (s.includes('high') || s === '2' || s === 'p2') return 'high';
  if (s.includes('low') || s === '4' || s === 'p4') return 'low';
  return 'medium';
}

function mapStatus(s) {
  const v = norm(s).toLowerCase();
  if (v.includes('progress') || v.includes('open') || v === 'new') return 'open';
  if (v.includes('hold') || v.includes('pending') || v.includes('waiting')) return 'on_hold';
  if (v.includes('complete') || v.includes('close') || v.includes('done') || v.includes('resolved')) return 'completed';
  if (v.includes('cancel')) return 'cancelled';
  return 'open';
}

const casesColumns = [
  { header: 'Case type (alpha numeric)' },
  { header: 'Purchase order' },
  { header: 'Start date' },
  { header: 'Due date', required: true },
  { header: 'Priority' },
  { header: 'Case status' },
  { header: 'Assets' },
  { header: 'Apartments' },
  { header: 'Assigned To (contractor)' },
  { header: 'Contacts' },
  { header: 'Case title', required: true },
  { header: 'Description' },
  { header: 'Notes' },
];

const cases = {
  key: 'cases',
  label: 'Cases / Work Orders',
  fileName: 'case',
  sheetName: 'Import Data Sheet',
  entityName: 'WorkOrder',
  columns: casesColumns,
  instructions: [
    ['Please note the following'],
    ['All red columns are mandatory fields (Case title, Due date)'],
    ['Start date and Due date format should be DD/MM/YYYY'],
    ['If Case type / Priority / Case status values are not recognised they are best-effort mapped and the original value is kept in Notes'],
    ['Assets, Apartments and Assigned To (contractor) must already exist for the selected building, otherwise the row is skipped'],
    ["Use the 'Import Data Sheet' to enter rows"],
  ],
  fieldMap: {
    case_type: ['Case type (alpha numeric)', 'Case type', 'case_type', 'main_category'],
    purchase_order: ['Purchase order', 'purchase_order', 'po'],
    start_date: ['Start date', 'start_date'],
    due_date: ['Due date', 'due_date'],
    priority: ['Priority', 'priority'],
    case_status: ['Case status', 'case_status', 'status'],
    asset_name: ['Assets', 'asset', 'asset_name'],
    apartment: ['Apartments', 'apartment', 'unit', 'unit_number'],
    contractor_name: ['Assigned To (contractor)', 'Assigned To', 'contractor', 'contractor_name'],
    contacts: ['Contacts', 'contacts'],
    case_title: ['Case title', 'case_title', 'title'],
    description: ['Description', 'description'],
    notes: ['Notes', 'notes'],
  },
  fetchLookups: fetchCommonLookups,
  fetchForExport: (buildingId) => buildingId
    ? base44.entities.WorkOrder.filter({ building_id: buildingId }, '-created_date')
    : base44.entities.WorkOrder.list('-created_date'),
  validateRow(r, lookups, buildingId) {
    if (!norm(r.case_title)) return { ok: false, error: 'Case title is required' };
    const dueIso = parseDdMmYyyy(r.due_date) || parseDdMmYyyy(r.start_date);
    const resolved = { asset_id: null, unit_id: null, contractor_id: null, main_category: mapCaseTypeToCategory(r.case_type) };
    if (norm(r.asset_name)) {
      const a = matchName(lookups.assets, r.asset_name);
      if (!a) return { ok: false, error: `Asset "${r.asset_name}" not found` };
      resolved.asset_id = a.id;
    }
    if (norm(r.apartment)) {
      const u = matchName(lookups.units, r.apartment, 'unit_number');
      if (!u) return { ok: false, error: `Apartment "${r.apartment}" not found` };
      resolved.unit_id = u.id;
    }
    if (norm(r.contractor_name)) {
      const c = matchName(lookups.contractors, r.contractor_name, 'company_name');
      if (!c) return { ok: false, error: `Contractor "${r.contractor_name}" not found` };
      resolved.contractor_id = c.id;
    }
    return { ok: true, resolved, extra: { startIso: parseDdMmYyyy(r.start_date), dueIso } };
  },
  async createRecords(pending, lookups, buildingId) {
    const records = pending.map((p) => {
      const r = p.row;
      const extraNotes = [
        norm(r.case_type) ? `Case type: ${r.case_type}` : '',
        norm(r.purchase_order) ? `PO: ${r.purchase_order}` : '',
        norm(r.contacts) ? `Contacts: ${r.contacts}` : '',
      ].filter(Boolean).join(' | ');
      return {
        building_id: buildingId,
        title: r.case_title,
        description: r.description || '',
        main_category: p.resolved.main_category,
        subcategory: WORK_CATEGORIES.includes(norm(r.case_type).toLowerCase().replace(/[-\s]+/g, '_')) ? '' : norm(r.case_type) || '',
        priority: mapPriority(r.priority),
        status: mapStatus(r.case_status),
        start_date: p.extra.startIso || null,
        due_date: p.extra.dueIso || null,
        asset_id: p.resolved.asset_id || null,
        unit_id: p.resolved.unit_id || null,
        assigned_contractor_id: p.resolved.contractor_id || null,
        notes: [r.notes || '', extraNotes].filter(Boolean).join(' | ') || null,
      };
    });
    let created = 0;
    if (records.length) {
      await base44.entities.WorkOrder.bulkCreate(records);
      created = records.length;
    }
    return { created, extras: '', failed: 0, errors: [] };
  },
  mapEntityToRow(e, lookups) {
    const asset = lookups.assets.find((a) => a.id === e.asset_id);
    const unit = lookups.units.find((u) => u.id === e.unit_id);
    const contractor = lookups.contractors.find((c) => c.id === e.assigned_contractor_id);
    return {
      'Case type (alpha numeric)': e.subcategory || '',
      'Purchase order': '',
      'Start date': toDdMmYyyy(e.start_date),
      'Due date': toDdMmYyyy(e.due_date),
      'Priority': e.priority || '',
      'Case status': e.status || '',
      'Assets': asset?.name || '',
      'Apartments': unit?.unit_number || '',
      'Assigned To (contractor)': contractor?.company_name || '',
      'Contacts': '',
      'Case title': e.title || '',
      'Description': e.description || '',
      'Notes': e.notes || '',
    };
  },
};

// ─── 3. Residents ───────────────────────────────────────────────────────
const residentsColumns = [
  { header: 'Apartment Number', required: true },
  { header: 'Lot Number' },
  { header: 'First Name', required: true },
  { header: 'Last Name', required: true },
  { header: 'Home Phone' },
  { header: 'Mobile' },
  { header: 'Secondary Number' },
  { header: 'Email' },
  { header: 'Residential Type' },
  { header: 'EC Member' },
  { header: 'Emergency Contact' },
  { header: 'Emergency Number' },
  { header: 'Notes' },
  { header: 'Broadcast Group' },
  { header: 'Owner Investor Name' },
  { header: 'Owner Investor Phone' },
  { header: 'Owner Investor Mobile' },
  { header: 'Owner Investor Email' },
  { header: 'Managing Agent Company' },
  { header: 'Managing Agent Name' },
  { header: 'Managing Agent Phone' },
  { header: 'Managing Agent Email' },
  { header: 'Key ID' },
  { header: 'Key Type' },
  { header: 'Key Location' },
  { header: 'Car Registration #' },
  { header: 'Car Location' },
  { header: 'Car Make' },
  { header: 'Car Model' },
  { header: 'Car Space #' },
  { header: 'Name of Pet' },
  { header: 'Type of Pet' },
  { header: 'Comment' },
];

function residentNotes(r) {
  const bits = [];
  if (r.home_phone) bits.push(`Home Phone: ${r.home_phone}`);
  if (r.secondary_number) bits.push(`Secondary: ${r.secondary_number}`);
  if (r.broadcast_group) bits.push(`Broadcast Group: ${r.broadcast_group}`);
  if (r.key_id) bits.push(`Key ID: ${r.key_id}`);
  if (r.key_type) bits.push(`Key Type: ${r.key_type}`);
  if (r.key_location) bits.push(`Key Location: ${r.key_location}`);
  if (r.car_location) bits.push(`Car Location: ${r.car_location}`);
  if (r.pet_name) bits.push(`Pet: ${r.pet_name} (${r.pet_type})`);
  if (r.comment) bits.push(`Comment: ${r.comment}`);
  return bits.filter(Boolean).join(' | ');
}

const residents = {
  key: 'residents',
  label: 'Residents',
  fileName: 'resident',
  sheetName: 'Residents',
  entityName: 'Resident',
  columns: residentsColumns,
  instructions: [
    ['Please note the following'],
    ['First Name, Last Name and Apartment Number are mandatory'],
    ['If the apartment/unit does not exist for the selected building it will be created automatically'],
    ['Owner Investor, Managing Agent, Pet and Key details are populated on the resident record; unmapped columns are kept in Notes for round-trip'],
  ],
  fieldMap: {
    apartment_number: ['Apartment Number', 'apartment', 'apartment_number', 'unit', 'unit_number'],
    lot_number: ['Lot Number', 'lot_number'],
    first_name: ['First Name', 'first_name'],
    last_name: ['Last Name', 'last_name'],
    home_phone: ['Home Phone', 'home_phone'],
    mobile: ['Mobile', 'mobile', 'mobile_number'],
    secondary_number: ['Secondary Number', 'secondary_number', 'secondary_phone'],
    email: ['Email', 'email'],
    residential_type: ['Residential Type', 'residential_type', 'resident_type'],
    ec_member: ['EC Member', 'ec_member', 'strata_committee'],
    emergency_contact: ['Emergency Contact', 'emergency_contact', 'emergency_contact_name'],
    emergency_number: ['Emergency Number', 'emergency_number', 'emergency_contact_phone'],
    notes: ['Notes', 'notes'],
    broadcast_group: ['Broadcast Group', 'broadcast_group'],
    investor_name: ['Owner Investor Name', 'investor_name', 'owner_investor_name'],
    investor_phone: ['Owner Investor Phone', 'investor_phone', 'investor_home_phone', 'owner_investor_phone'],
    investor_mobile: ['Owner Investor Mobile', 'investor_mobile', 'owner_investor_mobile'],
    investor_email: ['Owner Investor Email', 'investor_email', 'owner_investor_email'],
    managing_agent_company: ['Managing Agent Company', 'managing_agent_company'],
    managing_agent_name: ['Managing Agent Name', 'managing_agent_name', 'managing_agent_contact_name'],
    managing_agent_phone: ['Managing Agent Phone', 'managing_agent_phone'],
    managing_agent_email: ['Managing Agent Email', 'managing_agent_email'],
    key_id: ['Key ID', 'key_id'],
    key_type: ['Key Type', 'key_type'],
    key_location: ['Key Location', 'key_location'],
    car_registration: ['Car Registration #', 'car_registration', 'car_rego'],
    car_location: ['Car Location', 'car_location'],
    car_make: ['Car Make', 'car_make'],
    car_model: ['Car Model', 'car_model'],
    car_space: ['Car Space #', 'car_space', 'parking_spot'],
    pet_name: ['Name of Pet', 'pet_name', 'name_of_pet'],
    pet_type: ['Type of Pet', 'pet_type', 'type_of_pet'],
    comment: ['Comment', 'comment'],
  },
  fetchLookups: fetchCommonLookups,
  fetchForExport: async (buildingId) => {
    const res = buildingId
      ? await base44.entities.Resident.filter({ building_id: buildingId })
      : await base44.entities.Resident.list();
    return res;
  },
  validateRow(r, lookups, buildingId) {
    if (!norm(r.first_name)) return { ok: false, error: 'First Name is required' };
    if (!norm(r.last_name)) return { ok: false, error: 'Last Name is required' };
    if (!norm(r.apartment_number)) return { ok: false, error: 'Apartment Number is required' };
    const existing = matchName(lookups.units, r.apartment_number, 'unit_number');
    return { ok: true, resolved: { unit_id: existing ? existing.id : null, existing }, extra: {} };
  },
  async createRecords(pending, lookups, buildingId) {
    const unitMap = {};
    (lookups.units || []).forEach((u) => { unitMap[String(u.unit_number).trim().toLowerCase()] = u.id; });
    // create missing units
    const toCreate = [];
    const seen = {};
    pending.forEach((p) => {
      const num = norm(p.row.apartment_number).toLowerCase();
      if (!unitMap[num] && !seen[num]) {
        toCreate.push({ building_id: buildingId, unit_number: p.row.apartment_number, lot_number: p.row.lot_number || '', status: 'occupied' });
        seen[num] = true;
      }
    });
    let createdUnits = 0;
    if (toCreate.length) {
      const newUnits = await base44.entities.Unit.bulkCreate(toCreate);
      newUnits.forEach((u) => { unitMap[String(u.unit_number).trim().toLowerCase()] = u.id; });
      createdUnits = newUnits.length;
    }
    const records = pending.map((p) => {
      const r = p.row;
      const num = norm(r.apartment_number).toLowerCase();
      const unitId = unitMap[num];
      if (!unitId) return null;
      const vehicle = [r.car_make, r.car_model, r.car_registration ? `Rego ${r.car_registration}` : ''].filter(Boolean).join(' ');
      return {
        building_id: buildingId,
        unit_id: unitId,
        first_name: r.first_name,
        last_name: r.last_name,
        email: r.email || '',
        phone: r.mobile || r.home_phone || '',
        resident_type: /owner/i.test(r.residential_type) ? 'owner' : (/tenant/i.test(r.residential_type) ? 'tenant' : 'tenant'),
        emergency_contact_name: r.emergency_contact || '',
        emergency_contact_phone: r.emergency_number || '',
        vehicle_info: vehicle || '',
        parking_spot: r.car_space || '',
        status: 'active',
        notes: [r.notes || '', residentNotes(r)].filter(Boolean).join(' | ') || null,
        investor_name: r.investor_name || '',
        investor_home_phone: r.investor_phone || '',
        investor_mobile: r.investor_mobile || '',
        investor_email: r.investor_email || '',
        investor_strata_committee_member: parseBool(r.ec_member),
        managing_agent_company: r.managing_agent_company || '',
        managing_agent_contact_name: r.managing_agent_name || '',
        managing_agent_phone: r.managing_agent_phone || '',
        managing_agent_email: r.managing_agent_email || '',
        has_pet: !!(r.pet_name || '').trim(),
      };
    }).filter(Boolean);
    let created = 0;
    if (records.length) {
      await base44.entities.Resident.bulkCreate(records);
      created = records.length;
    }
    return { created, extras: createdUnits ? `${createdUnits} new unit${createdUnits !== 1 ? 's' : ''} created` : '', failed: 0, errors: [] };
  },
  mapEntityToRow(e, lookups) {
    const unit = lookups.units.find((u) => u.id === e.unit_id);
    const notesLower = (e.notes || '').toLowerCase();
    const read = (label) => {
      const m = (e.notes || '').match(new RegExp(`${label}:\\s*([^|]+)`, 'i'));
      return m ? m[1].trim() : '';
    };
    const phone = (e.phone || '');
    const isHome = notesLower.includes('home phone:');
    return {
      'Apartment Number': unit?.unit_number || '',
      'Lot Number': unit?.lot_number || '',
      'First Name': e.first_name || '',
      'Last Name': e.last_name || '',
      'Home Phone': isHome ? read('Home Phone') : phone,
      'Mobile': isHome ? phone : '',
      'Secondary Number': read('Secondary'),
      'Email': e.email || '',
      'Residential Type': e.resident_type ? e.resident_type.charAt(0).toUpperCase() + e.resident_type.slice(1) : '',
      'EC Member': e.investor_strata_committee_member ? 'Yes' : '',
      'Emergency Contact': e.emergency_contact_name || '',
      'Emergency Number': e.emergency_contact_phone || '',
      'Notes': e.notes || '',
      'Broadcast Group': read('Broadcast Group'),
      'Owner Investor Name': e.investor_name || '',
      'Owner Investor Phone': e.investor_home_phone || '',
      'Owner Investor Mobile': e.investor_mobile || '',
      'Owner Investor Email': e.investor_email || '',
      'Managing Agent Company': e.managing_agent_company || '',
      'Managing Agent Name': e.managing_agent_contact_name || '',
      'Managing Agent Phone': e.managing_agent_phone || '',
      'Managing Agent Email': e.managing_agent_email || '',
      'Key ID': read('Key ID'),
      'Key Type': read('Key Type'),
      'Key Location': read('Key Location'),
      'Car Registration #': (e.vehicle_info || '').match(/Rego\s+(\S+)/i)?.[1] || '',
      'Car Location': read('Car Location'),
      'Car Make': (e.vehicle_info || '').split(' ').slice(0, -1).join(' '),
      'Car Model': (e.vehicle_info || '').split(' ')[1] || '',
      'Car Space #': e.parking_spot || '',
      'Name of Pet': e.has_pet ? read('Pet').split(' (')[0] : '',
      'Type of Pet': e.has_pet ? ((e.notes || '').match(/Pet:\s*\S+\s*\(([^)]+)\)/i)?.[1] || '') : '',
      'Comment': read('Comment'),
    };
  },
};

export const DATASETS = { maintenance, cases, residents };