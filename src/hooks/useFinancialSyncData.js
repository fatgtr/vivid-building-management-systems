import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { base44 } from '@/api/base44Client';

// Single aggregation point for the Financial & Planning sync.
// Every page reads these identical numbers — no duplicate collation.
export function useFinancialSyncData(buildingId) {
  const f = buildingId ? { building_id: buildingId } : {};

  const { data: reports = [], isLoading: lr } = useQuery({
    queryKey: ['fsync-reports', buildingId],
    queryFn: () => base44.entities.FinancialReport.filter(f, '-report_period_end'),
  });
  const { data: lines = [], isLoading: ll } = useQuery({
    queryKey: ['fsync-lines', buildingId],
    queryFn: () => base44.entities.BudgetLine.filter(f, '-created_date', 300),
  });
  const { data: workOrders = [], isLoading: lw } = useQuery({
    queryKey: ['fsync-wos', buildingId],
    queryFn: () => base44.entities.WorkOrder.filter(f, '-created_date'),
  });
  const { data: schedules = [], isLoading: ls } = useQuery({
    queryKey: ['fsync-schedules', buildingId],
    queryFn: () => base44.entities.MaintenanceSchedule.filter(f, '-next_due_date'),
  });
  const { data: capitalPlans = [], isLoading: lc } = useQuery({
    queryKey: ['fsync-capital', buildingId],
    queryFn: () => base44.entities.CapitalWorksPlan.filter(f),
  });
  const { data: assets = [], isLoading: la } = useQuery({
    queryKey: ['fsync-assets', buildingId],
    queryFn: () => base44.entities.Asset.filter(buildingId ? { building_id: buildingId, status: 'active' } : { status: 'active' }),
  });

  const loading = lr || ll || lw || ls || lc || la;

  return useMemo(() => {
    // budget vs actual by category (expenditure lines only)
    const expLines = lines.filter((l) => l.line_type === 'expenditure');
    const budgetByCategory = {};
    expLines.forEach((l) => {
      const k = `${l.fund_type}|${l.category || 'Uncategorised'}`;
      if (!budgetByCategory[k]) budgetByCategory[k] = { fund_type: l.fund_type, category: l.category || 'Uncategorised', budget: 0, actual: 0 };
      budgetByCategory[k].budget += l.budget_amount || 0;
      budgetByCategory[k].actual += l.actual_amount || 0;
    });
    const byCategory = Object.values(budgetByCategory);
    const overBudget = byCategory.filter((c) => c.budget > 0 && c.actual > c.budget);
    const totalBudget = byCategory.reduce((s, c) => s + c.budget, 0);
    const totalActual = byCategory.reduce((s, c) => s + c.actual, 0);
    const onTrackPct = totalBudget > 0 ? Math.round((Math.min(totalActual, totalBudget) / totalBudget) * 100) : 100;

    // capital forecast total — sum CapitalWorksPlan item current_cost, fall back to asset replacement_cost
    let capitalForecastTotal = 0;
    capitalPlans.forEach((p) => {
      (p.expenditure_items || []).forEach((it) => { capitalForecastTotal += it.current_cost || 0; });
    });
    if (capitalForecastTotal === 0) capitalForecastTotal = assets.reduce((s, a) => s + (a.replacement_cost || 0), 0);

    // real maintenance cost context — budget lines + work order actual cost
    const woActualTotal = workOrders.reduce((s, w) => s + (w.actual_cost || 0), 0);
    const lineExpenditureTotal = expLines.reduce((s, l) => s + (l.actual_amount || 0), 0);
    const actualMaintenanceCost = lineExpenditureTotal + woActualTotal;

    // ── Gap detection ──
    const gaps = [];

    // 1. maintenance schedules with recorded spend but no estimate
    const catNames = byCategory.map((c) => (c.category || '').toLowerCase());
    schedules.forEach((s) => {
      const hasSpend = catNames.some((c) => c && (s.item_name?.toLowerCase().includes(c) || c.includes(s.item_name?.toLowerCase())));
      if (hasSpend && (!s.estimated_cost || s.estimated_cost === 0)) {
        gaps.push({ id: `missing-est-${s.id}`, type: 'missing_estimates', severity: 'amber', label: `Schedule "${s.item_name || s.subject || '—'}" has recorded spend but no estimated cost`, page: 'Maintenance' });
      }
    });

    // 2. work orders with actual cost but no matching budget line expenditure category
    const woCats = expLines.map((l) => (l.category || '').toLowerCase());
    workOrders.forEach((w) => {
      if ((w.actual_cost || 0) > 0) {
        const wcat = (w.subcategory || w.main_category || '').toLowerCase();
        const matched = woCats.some((c) => c && (c.includes(wcat) || wcat.includes(c)));
        if (!matched && wcat) {
          gaps.push({ id: `unmatched-wo-${w.id}`, type: 'unmatched_work_order_spend', severity: 'amber', label: `Work order "${w.title || '—'}" has actual cost with no matching financial report line`, page: 'OperationsCenter' });
        }
      }
    });

    // 3. capital forecast assets with no replacement cost
    assets.forEach((a) => {
      if ((a.replacement_cost || 0) === 0 && a.lifecycle_years) {
        gaps.push({ id: `no-replace-${a.id}`, type: 'missing_replacement_costs', severity: 'red', label: `Asset "${a.name || '—'}" has a lifecycle but no replacement cost`, page: 'AssetRegister' });
      }
    });
    capitalPlans.forEach((p) => {
      (p.expenditure_items || []).forEach((it) => {
        if ((it.current_cost || 0) === 0) {
          gaps.push({ id: `no-cwp-cost-${p.id}-${it.item_name}`, type: 'missing_replacement_costs', severity: 'amber', label: `Capital Works item "${it.item_name || '—'}" has no estimated current cost`, page: 'CapitalWorksPlanning' });
        }
      });
    });

    // 4. over-budget categories with no linked maintenance schedule
    overBudget.forEach((c) => {
      const hasSchedule = schedules.some((s) => {
        const nm = (s.item_name || s.subject || '').toLowerCase();
        return nm && (nm.includes(c.category.toLowerCase()) || c.category.toLowerCase().includes(nm));
      });
      if (!hasSchedule) {
        gaps.push({ id: `over-unsched-${c.fund_type}-${c.category}`, type: 'over_budget_unscheduled', severity: 'red', label: `"${c.category}" is over budget with no linked maintenance schedule`, page: 'Maintenance' });
      }
    });

    // 5. duplicated spend — same category has both BudgetLine expenditure and WorkOrder actual_cost
    const lineCats = new Set(expLines.filter((l) => (l.actual_amount || 0) > 0).map((l) => (l.category || '').toLowerCase()));
    const woByCat = {};
    workOrders.forEach((w) => {
      if ((w.actual_cost || 0) > 0) {
        const k = (w.subcategory || w.main_category || '').toLowerCase();
        if (k) { woByCat[k] = (woByCat[k] || 0) + (w.actual_cost || 0); }
      }
    });
    Object.entries(woByCat).forEach(([cat, amt]) => {
      if (lineCats.has(cat)) {
        gaps.push({ id: `dup-${cat}`, type: 'duplicated_spend', severity: 'amber', label: `"${cat.replace(/_/g, ' ')}" may be double-counted across financial reports and work orders (${amt.toFixed(0)} in work orders)`, page: 'FinancialManagement' });
      }
    });

    return {
      loading,
      reports, lines, workOrders, schedules, capitalPlans, assets,
      byCategory, overBudget, totalBudget, totalActual, onTrackPct,
      capitalForecastTotal, woActualTotal, lineExpenditureTotal, actualMaintenanceCost,
      gaps,
    };
  }, [reports, lines, workOrders, schedules, capitalPlans, assets, loading]);
}