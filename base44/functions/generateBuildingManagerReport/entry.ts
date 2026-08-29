import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { jsPDF } from 'npm:jspdf@2.5.1';

// Sydney/AU-safe DD/MM/YYYY (timezone-stable on the server)
function formatDDMMYYYY(date) {
  return new Intl.DateTimeFormat('en-AU', {
    timeZone: 'Australia/Sydney',
    day: '2-digit', month: '2-digit', year: 'numeric'
  }).format(date);
}

// Map a building to a stable cover/accent color from its name hash
function brandColorFor(name) {
  const palette = [
    [37, 99, 235], [13, 71, 161], [30, 64, 175], [29, 78, 216],
    [79, 70, 229], [67, 56, 202], [15, 23, 42], [12, 74, 110]
  ];
  let h = 0;
  for (let i = 0; i < (name || '').length; i++) h = (h * 31 + name.charCodeAt(i)) | 0;
  return palette[Math.abs(h) % palette.length];
}

const CATEGORY_COLORS = {
  core_building_structure: [120, 113, 108],
  mechanical_services: [14, 165, 233],
  electrical_services: [234, 179, 8],
  fire_life_safety: [220, 38, 38],
  vertical_transportation: [168, 85, 247],
  hydraulic_plumbing: [8, 145, 178],
  security_access_control: [40, 40, 40],
  communications_it: [99, 102, 241],
  building_management_systems: [37, 99, 235],
  external_grounds: [22, 163, 74],
  common_area_fixtures_fittings: [180, 83, 9],
  waste_management: [87, 83, 78],
  parking_traffic: [100, 116, 139],
  compliance_safety: [190, 18, 60],
  commercial_specific: [15, 118, 110],
  residential_specific: [219, 39, 119],
  documentation_registers: [71, 85, 105]
};

const COMPLETED_STATUSES = ['completed', 'cancelled'];
const CATEGORY_LABELS = {
  core_building_structure: 'Core Building Structure',
  mechanical_services: 'Mechanical Services',
  electrical_services: 'Electrical Services',
  fire_life_safety: 'Fire & Life Safety',
  vertical_transportation: 'Vertical Transportation',
  hydraulic_plumbing: 'Hydraulic & Plumbing',
  security_access_control: 'Security & Access Control',
  communications_it: 'Communications & IT',
  building_management_systems: 'Building Management Systems',
  external_grounds: 'External & Grounds',
  common_area_fixtures_fittings: 'Common Area Fixtures & Fittings',
  waste_management: 'Waste Management',
  parking_traffic: 'Parking & Traffic',
  compliance_safety: 'Compliance & Safety',
  commercial_specific: 'Commercial Specific',
  residential_specific: 'Residential Specific',
  documentation_registers: 'Documentation & Registers'
};

function prettyCategory(key) {
  return CATEGORY_LABELS[key] || (key || 'Other').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

function prettyStatus(key) {
  return (key || 'unknown').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

// Fetch an image URL into a base64 data string for jsPDF. Returns null on failure.
async function fetchImageAsDataURL(url) {
  if (!url) return null;
  try {
    const res = await fetch(url, { redirect: 'follow' });
    if (!res.ok) return null;
    const buf = await res.arrayBuffer();
    const bytes = new Uint8Array(buf);
    let binary = '';
    const chunk = 0x8000;
    for (let i = 0; i < bytes.length; i += chunk) {
      binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
    }
    const base64 = btoa(binary);
    const ct = res.headers.get('content-type') || '';
    const fmt = ct.includes('png') ? 'PNG' : ct.includes('jpeg') || ct.includes('jpg') ? 'JPEG' : 'JPEG';
    return { data: base64, format: fmt };
  } catch (e) {
    console.warn('Cover image fetch failed:', e?.message || e);
    return null;
  }
}

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const {
      buildingId,
      periodStart,
      periodEnd,
      managementComment = '',
      partnerBrandOverride,
      sendEmail = false,
      emailRecipients,
      titleOverride
    } = await req.json();

    if (!buildingId) {
      return Response.json({ error: 'Building ID is required' }, { status: 400 });
    }

    // Parallel fetch of all data needed
    const [building, allWorkOrders, maintenanceSchedules, allContractors] = await Promise.all([
      base44.asServiceRole.entities.Building.get(buildingId),
      base44.asServiceRole.entities.WorkOrder.filter({ building_id: buildingId }),
      base44.asServiceRole.entities.MaintenanceSchedule.filter({ building_id: buildingId }).catch(() => []),
      base44.asServiceRole.entities.Contractor.list().catch(() => [])
    ]);

    if (!building) {
      return Response.json({ error: 'Building not found' }, { status: 404 });
    }

    // Period filtering on start_date (optional)
    let workOrders = allWorkOrders || [];
    if (periodStart && periodEnd) {
      const ps = new Date(periodStart); const pe = new Date(periodEnd); pe.setHours(23, 59, 59, 999);
      workOrders = workOrders.filter(wo => {
        if (!wo.start_date && !wo.created_date) return true;
        const d = new Date(wo.start_date || wo.created_date);
        return d >= ps && d <= pe;
      });
    }
    // Newest first for detailed cases
    workOrders = [...workOrders].sort((a, b) => {
      const ad = new Date(a.start_date || a.created_date || 0).getTime();
      const bd = new Date(b.start_date || b.created_date || 0).getTime();
      return bd - ad;
    });

    const contractorMap = new Map((allContractors || []).map(c => [c.id, c.company_name || c.name || 'Unassigned']));

    // White-label brand name resolution
    let partnerBrandName = '';
    let partnerLogoURL = '';
    if (partnerBrandOverride) {
      partnerBrandName = partnerBrandOverride;
    } else if (building.partner_id) {
      try {
        const partner = await base44.asServiceRole.entities.Partner.get(building.partner_id).catch(() => null);
        const branding = await base44.asServiceRole.entities.PartnerBranding.filter({ partner_id: building.partner_id }).catch(() => []);
        const b = Array.isArray(branding) ? branding[0] : null;
        partnerBrandName = (b && (b.company_name || b.display_name)) || (partner && partner.name) || '';
        partnerLogoURL = (b && b.management_report_logo_url) || '';
      } catch (e) { /* ignore branding failures */ }
    }
    if (!partnerBrandName) partnerBrandName = building.strata_managing_agent_name || building.manager_name || '';

    // Aggregations
    const categoriesPresent = [...new Set(workOrders.map(wo => wo.main_category || 'other').filter(Boolean))];
    const caseOverview = categoriesPresent.map(cat => {
      const rows = workOrders.filter(wo => (wo.main_category || 'other') === cat);
      const completed = rows.filter(wo => COMPLETED_STATUSES.includes(wo.status)).length;
      const open = rows.length - completed;
      return { category: cat, completed, open, total: rows.length };
    });
    const totalCompleted = caseOverview.reduce((s, r) => s + r.completed, 0);
    const totalOpen = caseOverview.reduce((s, r) => s + r.open, 0);
    const totalCases = workOrders.length;

    const statusBreakdown = [...new Set(workOrders.map(wo => wo.status || 'open').filter(Boolean))].map(st => ({
      status: st, count: workOrders.filter(wo => (wo.status || 'open') === st).length
    }));

    const schedComplete = (maintenanceSchedules || []).filter(ms => ms.status === 'completed').length;
    const schedPending = (maintenanceSchedules || []).filter(ms => ms.status !== 'completed').length;
    const schedTotal = (maintenanceSchedules || []).length;

    // ---- PDF Generation ----
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const reportDate = new Date();
    const dateStr = formatDDMMYYYY(reportDate);
    const brandColor = brandColorFor(building.name);

    // ----- COVER PAGE -----
    const coverImage = await fetchImageAsDataURL(building.image_url);
    if (coverImage) {
      try { doc.addImage(coverImage.data, coverImage.format, 0, 0, pageW, pageH, undefined, 'FAST'); } catch (e) { /* fall through */ }
      // Dark overlay for legibility
      try {
        doc.setGState(doc.GState({ opacity: 0.55 }));
        doc.setFillColor(0, 0, 0);
        doc.rect(0, 0, pageW, pageH, 'F');
        doc.setGState(doc.GState({ opacity: 1 }));
      } catch (e) { /* GState may not be available; ignore */ }
    } else {
      // Solid brand-color cover
      doc.setFillColor(brandColor[0], brandColor[1], brandColor[2]);
      doc.rect(0, 0, pageW, pageH, 'F');
      // subtle accent bar
      doc.setFillColor(255, 255, 255);
      doc.rect(0, 0, pageW, 3, 'F');
    }

    // Cover text
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(30);
    doc.text('BUILDING', 20, 90);
    doc.text('MANAGEMENT', 20, 104);
    doc.text('REPORT', 20, 118);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(18);
    const buildingLabel = building.name + (building.strata_plan_number ? ` (${building.strata_plan_number})` : '');
    doc.text(buildingLabel, 20, 135);

    // Partner brand name (top-left, smaller)
    if (partnerBrandName) {
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text(partnerBrandName.toUpperCase(), 20, 30);
    }

    // Site address + date at bottom
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    const addressLines = [
      building.address,
      [building.city, building.state, building.postal_code].filter(Boolean).join(' ')
    ].filter(Boolean);
    const addrStart = pageH - 25;
    addressLines.forEach((ln, i) => doc.text(ln, 20, addrStart + i * 5));
    if (partnerBrandName) doc.text(partnerBrandName, 20, addrStart - 6);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text(dateStr, pageW - 20, pageH - 20, { align: 'right' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text('Report Date', pageW - 20, pageH - 16, { align: 'right' });

    // ----- BODY -----
    let y = 20;
    const margin = 20;
    const contentW = pageW - margin * 2;

    const ensureSpace = (needed) => {
      if (y + needed > pageH - 18) { doc.addPage(); y = 20; return true; }
      return false;
    };

    // Body header/footer painter for non-cover pages
    const drawBodyHeaderFooter = (pageNumber, totalPages) => {
      // Top header rule
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.3);
      doc.line(margin, 12, pageW - margin, 12);
      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139);
      doc.setFont('helvetica', 'normal');
      doc.text(`${building.name}${building.strata_plan_number ? ' · ' + building.strata_plan_number : ''}`, margin, 9);
      doc.text('Building Management Report', pageW - margin, 9, { align: 'right' });
      // Footer
      doc.setDrawColor(226, 232, 240);
      doc.line(margin, pageH - 14, pageW - margin, pageH - 14);
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184);
      doc.text(dateStr, margin, pageH - 9);
      doc.text(`Page ${pageNumber} of ${totalPages}`, pageW - margin, pageH - 9, { align: 'right' });
      doc.setTextColor(15, 23, 42);
      doc.setFont('helvetica', 'normal');
    };

    // ---- Page 2: Executive Summary ----
    doc.addPage();
    y = 22;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(20);
    doc.setTextColor(15, 23, 42);
    doc.text('EXECUTIVE SUMMARY', margin, y);
    y += 4;
    doc.setDrawColor(brandColor[0], brandColor[1], brandColor[2]);
    doc.setLineWidth(1.5);
    doc.line(margin, y, margin + 40, y);
    y += 12;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    doc.setTextColor(51, 65, 85);
    const execSummary = `This Building Management Report for ${building.name}${building.strata_plan_number ? ` (${building.strata_plan_number})` : ''} covers ${totalCases} active case${totalCases === 1 ? '' : 's'} as of ${dateStr}. Of these, ${totalCompleted} ${totalCompleted === 1 ? 'is' : 'are'} completed/cancelled and ${totalOpen} remain open. ${schedTotal} scheduled maintenance task${schedTotal === 1 ? '' : 's'} ${schedTotal === 1 ? 'is' : 'are'} recorded, with ${schedComplete} complete and ${schedPending} pending.${workOrders.length === 0 ? ' No cases are currently recorded for this building.' : ' Detailed case records, scheduled maintenance status, and management commentary follow.'}`;
    const execLines = doc.splitTextToSize(execSummary, contentW);
    doc.text(execLines, margin, y);
    y += execLines.length * 6 + 8;

    // ---- Case Overview ----
    ensureSpace(30);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.setTextColor(15, 23, 42);
    doc.text('CASE OVERVIEW', margin, y);
    y += 3;
    doc.setDrawColor(brandColor[0], brandColor[1], brandColor[2]);
    doc.setLineWidth(1);
    doc.line(margin, y, margin + 32, y);
    y += 10;

    // Table 1: Category | Completed | Open | Total
    if (caseOverview.length > 0) {
      doc.setFontSize(10);
      const cols = [contentW * 0.5, contentW * 0.18, contentW * 0.18, contentW * 0.14];
      const rowH = 8;
      const drawTableHeader = (headers) => {
        doc.setFillColor(241, 245, 249);
        doc.rect(margin, y, contentW, rowH, 'F');
        doc.setTextColor(15, 23, 42);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        let x = margin + 3;
        headers.forEach((h, i) => { doc.text(h, x, y + 5.5); x += cols[i]; });
        y += rowH;
      };
      drawTableHeader(['Category', 'Completed Cases', 'Open Cases', 'Total']);
      doc.setFont('helvetica', 'normal');
      caseOverview.forEach((row, idx) => {
        ensureSpace(rowH);
        if (idx % 2 === 1) { doc.setFillColor(248, 250, 252); doc.rect(margin, y, contentW, rowH, 'F'); }
        let x = margin + 3;
        doc.setTextColor(15, 23, 42);
        doc.text(prettyCategory(row.category).length > 38 ? prettyCategory(row.category).slice(0, 36) + '…' : prettyCategory(row.category), x, y + 5.5); x += cols[0];
        doc.setTextColor(22, 163, 74); doc.text(String(row.completed), x, y + 5.5); x += cols[1];
        doc.setTextColor(220, 38, 38); doc.text(String(row.open), x, y + 5.5); x += cols[2];
        doc.setTextColor(15, 23, 42); doc.setFont('helvetica', 'bold'); doc.text(String(row.total), x, y + 5.5);
        doc.setFont('helvetica', 'normal');
        y += rowH;
      });
      // Totals row
      ensureSpace(rowH);
      doc.setFillColor(15, 23, 42);
      doc.rect(margin, y, contentW, rowH, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      let x = margin + 3;
      doc.text('Total', x, y + 5.5); x += cols[0];
      doc.text(String(totalCompleted), x, y + 5.5); x += cols[1];
      doc.text(String(totalOpen), x, y + 5.5); x += cols[2];
      doc.text(String(totalCases), x, y + 5.5);
      doc.setFont('helvetica', 'normal');
      y += rowH + 8;
    } else {
      doc.setFontSize(10);
      doc.setTextColor(100, 116, 139);
      doc.text('No cases recorded.', margin, y + 5);
      y += 12;
    }

    // Table 2: Case Status | Number of Cases
    ensureSpace(20);
    if (statusBreakdown.length > 0) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      const cols2 = [contentW * 0.7, contentW * 0.3];
      const rowH = 8;
      doc.setFillColor(241, 245, 249);
      doc.rect(margin, y, contentW, rowH, 'F');
      doc.setTextColor(15, 23, 42);
      let x = margin + 3;
      doc.text('Case Status', x, y + 5.5); x += cols2[0];
      doc.text('Number of Cases', x, y + 5.5);
      y += rowH;
      doc.setFont('helvetica', 'normal');
      statusBreakdown.forEach((row, idx) => {
        ensureSpace(rowH);
        if (idx % 2 === 1) { doc.setFillColor(248, 250, 252); doc.rect(margin, y, contentW, rowH, 'F'); }
        x = margin + 3;
        doc.setTextColor(15, 23, 42); doc.text(prettyStatus(row.status), x, y + 5.5); x += cols2[0];
        doc.setFont('helvetica', 'bold'); doc.text(String(row.count), x, y + 5.5); doc.setFont('helvetica', 'normal');
        y += rowH;
      });
      ensureSpace(rowH);
      doc.setFillColor(15, 23, 42);
      doc.rect(margin, y, contentW, rowH, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      x = margin + 3;
      doc.text('Total', x, y + 5.5); x += cols2[0];
      doc.text(String(totalCases), x, y + 5.5);
      doc.setFont('helvetica', 'normal');
      y += rowH + 8;
    }

    // ---- Scheduled Maintenance Status ----
    ensureSpace(20);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.setTextColor(15, 23, 42);
    doc.text('SCHEDULED MAINTENANCE STATUS', margin, y);
    y += 3;
    doc.setDrawColor(brandColor[0], brandColor[1], brandColor[2]);
    doc.setLineWidth(1);
    doc.line(margin, y, margin + 65, y);
    y += 10;
    {
      const cols = [contentW * 0.7, contentW * 0.3];
      const rowH = 8;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setFillColor(241, 245, 249);
      doc.rect(margin, y, contentW, rowH, 'F');
      doc.setTextColor(15, 23, 42);
      let x = margin + 3;
      doc.text('Scheduled Maintenance Status', x, y + 5.5); x += cols[0];
      doc.text('Number of Tasks', x, y + 5.5);
      y += rowH;
      doc.setFont('helvetica', 'normal');
      const rows = [
        { label: 'Complete', value: schedComplete, even: false },
        { label: 'Pending', value: schedPending, even: true }
      ];
      rows.forEach(r => {
        ensureSpace(rowH);
        if (r.even) { doc.setFillColor(248, 250, 252); doc.rect(margin, y, contentW, rowH, 'F'); }
        x = margin + 3;
        doc.setTextColor(15, 23, 42); doc.text(r.label, x, y + 5.5); x += cols[0];
        doc.setFont('helvetica', 'bold'); doc.text(String(r.value), x, y + 5.5); doc.setFont('helvetica', 'normal');
        y += rowH;
      });
      ensureSpace(rowH);
      doc.setFillColor(15, 23, 42);
      doc.rect(margin, y, contentW, rowH, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      x = margin + 3;
      doc.text('Total', x, y + 5.5); x += cols[0];
      doc.text(String(schedTotal), x, y + 5.5);
      doc.setFont('helvetica', 'normal');
      y += rowH + 8;
    }

    // ---- Management Comment ----
    ensureSpace(20);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.setTextColor(15, 23, 42);
    doc.text('MANAGEMENT COMMENT', margin, y);
    y += 3;
    doc.setDrawColor(brandColor[0], brandColor[1], brandColor[2]);
    doc.setLineWidth(1);
    doc.line(margin, y, margin + 55, y);
    y += 10;
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    const commentBoxH = 40;
    doc.roundedRect(margin, y, contentW, commentBoxH, 2, 2, 'FD');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(51, 65, 85);
    const commentText = (managementComment && managementComment.trim()) ? managementComment : 'No management comment provided for this reporting period.';
    const cl = doc.splitTextToSize(commentText, contentW - 10);
    doc.text(cl, margin + 5, y + 7);
    y += commentBoxH + 8;

    // ---- Detailed Cases ----
    if (workOrders.length > 0) {
      workOrders.forEach((wo, idx) => {
        doc.addPage();
        y = 22;
        const cat = wo.main_category || 'other';
        const color = CATEGORY_COLORS[cat] || brandColor;
        // Category header bar
        doc.setFillColor(color[0], color[1], color[2]);
        doc.rect(0, 14, pageW, 14, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.text(`CATEGORY: ${prettyCategory(cat).toUpperCase()}`, margin, 23);

        y = 46;
        // Case number + title
        doc.setTextColor(100, 116, 139);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        const caseNumber = wo.id ? `Case# ${wo.id.slice(-6).toUpperCase()}` : `Case# ${idx + 1}`;
        doc.text(caseNumber, margin, y);
        // Status badge (right-aligned)
        const statusLabel = prettyStatus(wo.status || 'open');
        doc.setFontSize(8);
        const badgeW = doc.getTextWidth(statusLabel) + 8;
        doc.setFillColor(15, 23, 42);
        doc.roundedRect(pageW - margin - badgeW, y - 5, badgeW, 7, 1.5, 1.5, 'F');
        doc.setTextColor(255, 255, 255);
        doc.text(statusLabel, pageW - margin - badgeW / 2, y - 0.2, { align: 'center' });

        y += 8;
        doc.setTextColor(15, 23, 42);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(15);
        const titleLines = doc.splitTextToSize(wo.title || 'Untitled Case', contentW);
        doc.text(titleLines, margin, y);
        y += titleLines.length * 6 + 4;

        // Assigned contractor line
        const contractorName = wo.assigned_contractor_id ? (contractorMap.get(wo.assigned_contractor_id) || 'Assigned Contractor') : (wo.assigned_to || '');
        doc.setFont('helvetica', 'italic');
        doc.setFontSize(9);
        doc.setTextColor(100, 116, 139);
        if (contractorName) doc.text(`Assigned Contractor: ${contractorName}`, margin, y);
        y += 6;

        // Job Description
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.setTextColor(15, 23, 42);
        doc.text('Job Description', margin, y);
        y += 6;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        doc.setTextColor(51, 65, 85);
        const descText = wo.description || wo.notes || 'No description provided.';
        const descLines = doc.splitTextToSize(descText, contentW);
        let renderY = y;
        descLines.forEach(line => {
          if (renderY > pageH - 50) { doc.addPage(); renderY = 22; }
          doc.text(line, margin, renderY);
          renderY += 5;
        });
        y = renderY + 4;

        // Quotes / inventory items rendering if present (common in source report)
        if (wo.inventory_items && wo.inventory_items.length > 0) {
          ensureSpace(20);
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(10);
          doc.setTextColor(15, 23, 42);
          doc.text('Items', margin, y); y += 6;
          doc.setFont('helvetica', 'normal'); doc.setFontSize(9);
          wo.inventory_items.forEach(it => {
            ensureSpace(6);
            doc.text(`• ${it.name || 'Item'} — Qty: ${it.quantity || 1} ${it.unit || ''}`, margin + 3, y);
            y += 5;
          });
          y += 4;
        }

        // Meta box: Priority / Job Area / Started Date / Categories
        ensureSpace(28);
        const metaY = y;
        const metaH = 24;
        doc.setFillColor(248, 250, 252);
        doc.setDrawColor(226, 232, 240);
        doc.roundedRect(margin, metaY, contentW, metaH, 2, 2, 'FD');
        doc.setFont('helvetica', 'bold'); doc.setFontSize(8); doc.setTextColor(100, 116, 139);
        const colW = contentW / 2;
        const lines = [
          ['Priority', prettyStatus(wo.priority || 'medium')],
          ['Job Area', wo.job_area || (wo.is_common_area ? 'Common Area' : '—')],
          ['Started Date', wo.start_date ? formatDDMMYYYY(new Date(wo.start_date)) : '—'],
          ['Assigned Contractor', contractorName || '—']
        ];
        lines.forEach((pair, i) => {
          const col = i % 2;
          const row = Math.floor(i / 2);
          const px = margin + 6 + col * colW;
          const py = metaY + 6 + row * 9;
          doc.text(pair[0].toUpperCase(), px, py);
          doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(15, 23, 42);
          doc.text(pair[1], px + 28, py);
          doc.setFont('helvetica', 'bold'); doc.setFontSize(8); doc.setTextColor(100, 116, 139);
        });
        y = metaY + metaH + 6;

        // Attached documents list
        const allDocs = [
          ...((wo.documents || []).map(u => ({ url: u, kind: 'Document' }))),
          ...((wo.quotes || []).map(u => ({ url: u, kind: 'Quote' }))),
          ...((wo.invoices || []).map(u => ({ url: u, kind: 'Invoice' }))),
          ...((wo.photos || []).map(u => ({ url: u, kind: 'Photo' })))
        ];
        if (allDocs.length > 0) {
          ensureSpace(8 + allDocs.length * 5);
          doc.setFont('helvetica', 'bold'); doc.setFontSize(10); doc.setTextColor(15, 23, 42);
          doc.text('Documents', margin, y); y += 6;
          doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(51, 65, 85);
          allDocs.slice(0, 15).forEach(d => {
            ensureSpace(5);
            const fname = d.url.split('/').pop().split('?')[0] || d.url;
            doc.text(`• [${d.kind}] ${fname}`, margin + 3, y);
            y += 5;
          });
        }
      });
    } else {
      // No cases page
      ensureSpace(20);
      doc.setFont('helvetica', 'italic'); doc.setFontSize(11); doc.setTextColor(100, 116, 139);
      doc.text('No detailed cases to report for this period.', margin, y);
    }

    // ---- Finalize: add body headers/footers to all pages except cover ----
    const totalPages = doc.internal.pages.length - 1;
    for (let i = 2; i <= totalPages; i++) {
      doc.setPage(i);
      drawBodyHeaderFooter(i, totalPages);
    }

    // Upload PDF
    const pdfBytes = doc.output('arraybuffer');
    const pdfBlob = new Blob([pdfBytes], { type: 'application/pdf' });
    const safeName = (building.name || 'Building').replace(/[^a-zA-Z0-9]+/g, '-');
    const pdfFile = new File([pdfBlob], `${safeName}-Building-Manager-Report-${dateStr.replace(/\//g, '-')}.pdf`, { type: 'application/pdf' });
    const { file_url } = await base44.asServiceRole.integrations.Core.UploadFile({ file: pdfFile });

    // Store as a Document record
    const reportTitle = titleOverride || `${building.name} - Building Manager Report ${dateStr}`;
    let documentRecord = null;
    try {
      documentRecord = await base44.asServiceRole.entities.Document.create({
        building_id: buildingId,
        title: reportTitle,
        category: 'report',
        file_url,
        file_type: 'pdf',
        visibility: 'staff_only',
        status: 'active',
        tags: ['building-manager-report', 'auto-generated']
      });
    } catch (e) {
      console.warn('Failed to create Document record:', e?.message || e);
    }

    // Optional email delivery
    let emailResult = null;
    if (sendEmail) {
      const recipients = (emailRecipients && emailRecipients.split(',').map(e => e.trim()).filter(Boolean))
        || (building.strata_managing_agent_email ? [building.strata_managing_agent_email] : []);
      if (recipients.length > 0) {
        try {
          for (const to of recipients) {
            await base44.asServiceRole.integrations.Core.SendEmail({
              to,
              subject: `${building.name} - Building Manager Report (${dateStr})`,
              body: `
                <h2 style="color:#0f172a">Building Management Report</h2>
                <p>Please find the Building Manager Report for <strong>${building.name}</strong>${building.strata_plan_number ? ` (${building.strata_plan_number})` : ''} dated ${dateStr}.</p>
                <p><strong>Summary:</strong> ${totalCases} cases (${totalCompleted} completed, ${totalOpen} open) · ${schedTotal} scheduled maintenance tasks (${schedComplete} complete, ${schedPending} pending).</p>
                <p>Download the full report: <a href="${file_url}">${file_url}</a></p>
                <p style="color:#64748b;font-size:12px;margin-top:24px">Generated by ${partnerBrandName || 'Building Management'} on ${dateStr}</p>
              `
            });
          }
          emailResult = { sent: recipients.length, recipients };
        } catch (e) {
          emailResult = { error: e.message || String(e) };
        }
      }
    }

    return Response.json({
      success: true,
      file_url,
      document_id: documentRecord ? documentRecord.id : null,
      title: reportTitle,
      date: dateStr,
      totals: { cases: totalCases, completed: totalCompleted, open: totalOpen, scheduled_total: schedTotal, scheduled_complete: schedComplete, scheduled_pending: schedPending },
      email: emailResult
    });
  } catch (error) {
    console.error('generateBuildingManagerReport error:', error);
    return Response.json({ error: error.message || String(error) }, { status: 500 });
  }
}