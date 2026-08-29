import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

// Advance a YYYY-MM-DD date by the building's report frequency
function advanceDate(dateStr, frequency) {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  switch (frequency) {
    case 'monthly': d.setMonth(d.getMonth() + 1); break;
    case 'quarterly': d.setMonth(d.getMonth() + 3); break;
    case 'semi_annually': d.setMonth(d.getMonth() + 6); break;
    default: return null;
  }
  return d.toISOString().split('T')[0];
}

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);

    // Cron-triggered → run as service role. Also allow manual admin run.
    let isManual = false;
    try {
      const user = await base44.auth.me();
      if (user) {
        if (user.role !== 'admin') {
          return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
        }
        isManual = true;
      }
    } catch (e) {
      // Unauthenticated (cron) — allow to proceed as service role
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Fetch all buildings and filter to those due for a report
    const buildings = await base44.asServiceRole.entities.Building.list();
    const due = buildings.filter(b => {
      if (!b.report_frequency || b.report_frequency === 'none') return false;
      if (!b.next_report_date) return false;
      try {
        const dueDate = new Date(b.next_report_date);
        dueDate.setHours(0, 0, 0, 0);
        return dueDate <= today;
      } catch { return false; }
    });

    const results = [];
    for (const building of due) {
      try {
        const res = await base44.functions.invoke('generateBuildingManagerReport', {
          buildingId: building.id,
          bySchedule: true,
          sendEmail: true
        });
        const data = res && (res.data || res);
        if (data && data.success) {
          // Advance next_report_date for the next cycle
          const nextDate = advanceDate(building.next_report_date, building.report_frequency);
          if (nextDate) {
            try {
              await base44.asServiceRole.entities.Building.update(building.id, { next_report_date: nextDate });
            } catch (e) {
              console.warn(`Failed to advance next_report_date for ${building.name}:`, e?.message || e);
            }
          }
          results.push({ building: building.name, status: 'success', document_id: data.document_id, emailed: data.email?.sent > 0 });
        } else {
          results.push({ building: building.name, status: 'failed', error: data?.error || 'unknown' });
        }
      } catch (e) {
        console.error(`Report generation failed for ${building.name}:`, e?.message || e);
        results.push({ building: building.name, status: 'error', error: e?.message || String(e) });
      }
    }

    return Response.json({
      success: true,
      mode: isManual ? 'manual' : 'scheduled',
      checked_buildings: buildings.length,
      due_buildings: due.length,
      results
    });
  } catch (error) {
    console.error('runScheduledBuildingReports error:', error);
    return Response.json({ error: error.message || String(error) }, { status: 500 });
  }
}