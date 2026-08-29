import { isSameDay } from 'date-fns';

/**
 * Parse a date-only or ISO datetime value into a local Date at midnight.
 * Prevents UTC-offset shifts that turn `2026-08-29` into `Aug 28` in some timezones.
 */
export function parseDateLocal(value) {
  if (!value) return null;
  if (value instanceof Date) {
    return new Date(value.getFullYear(), value.getMonth(), value.getDate());
  }
  const str = String(value).trim();
  const isoMatch = str.match(/^(\d{4})-(\d{2})-(\d{2})(?:[T ].*)?$/);
  if (isoMatch) {
    const y = Number(isoMatch[1]);
    const m = Number(isoMatch[2]);
    const d = Number(isoMatch[3]);
    return new Date(y, m - 1, d);
  }
  const parsed = new Date(str);
  if (!isNaN(parsed.getTime())) {
    return new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
  }
  return null;
}

function addInterval(date, recurrence) {
  const d = new Date(date);
  switch (recurrence) {
    case 'daily':
      d.setDate(d.getDate() + 1);
      return d;
    case 'weekly':
      d.setDate(d.getDate() + 7);
      return d;
    case 'monthly':
      return addMonths(d, 1);
    case 'quarterly':
      return addMonths(d, 3);
    case 'half_yearly':
      return addMonths(d, 6);
    case 'yearly':
      return addMonths(d, 12);
    case 'bi_yearly':
      return addMonths(d, 24);
    default:
      return null;
  }
}

function addMonths(d, months) {
  const targetDay = d.getDate();
  const result = new Date(d.getFullYear(), d.getMonth() + months, 1);
  // Clamp to last valid day of the target month (e.g., Jan 31 + 1 month -> Feb 28/29)
  const lastDayOfMonth = new Date(result.getFullYear(), result.getMonth() + 1, 0).getDate();
  result.setDate(Math.min(targetDay, lastDayOfMonth));
  return result;
}

/**
 * Compute the next `count` occurrences on or after today, capped at endDate.
 * Returns local Date[] (midnight).
 */
export function computeNextOccurrences({ startDate, recurrence, endDateOrNever, count = 6 }) {
  if (!startDate || !recurrence || recurrence === 'none') return [];
  const anchor = parseDateLocal(startDate);
  if (!anchor) return [];
  const end = endDateOrNever ? parseDateLocal(endDateOrNever) : null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const results = [];
  let current = new Date(anchor);
  let guard = 0;
  while (results.length < count && guard < 10000) {
    guard++;
    if (end && current > end) break;
    if (current >= today) results.push(new Date(current));
    const next = addInterval(current, recurrence);
    if (!next || next <= current) break;
    current = next;
  }
  return results;
}

/**
 * Check whether a recurring schedule falls on a given calendar date.
 */
export function isOccurrenceOnDate({ startDate, recurrence, endDateOrNever, date }) {
  if (!startDate || !recurrence || !date) return false;
  const anchor = parseDateLocal(startDate);
  const target = parseDateLocal(date);
  if (!anchor || !target) return false;
  if (recurrence === 'none') return isSameDay(anchor, target);
  const end = endDateOrNever ? parseDateLocal(endDateOrNever) : null;
  if (target < anchor) return false;
  if (end && target > end) return false;
  let current = new Date(anchor);
  let guard = 0;
  while (guard < 10000) {
    guard++;
    if (current > target) return false;
    if (isSameDay(current, target)) return true;
    const next = addInterval(current, recurrence);
    if (!next || next <= current) return false;
    current = next;
  }
  return false;
}