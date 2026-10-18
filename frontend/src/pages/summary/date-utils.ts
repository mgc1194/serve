// pages/summary/date-utils.ts — Date helpers for the summary year/month pickers.

export const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export function currentYear(): number {
  return new Date().getFullYear();
}

export function currentMonthNum(): number {
  return new Date().getMonth() + 1; // 1-indexed
}

export function currentMonthStr(): string {
  return toMonthStr(currentYear(), currentMonthNum());
}

export function toMonthStr(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, '0')}`;
}

export function parseMonthStr(iso: string): { year: number; month: number } {
  // Expect a strict "YYYY-MM" string. Fall back to current year/month on
  // invalid input so NaN never propagates into UI state or MONTH_NAMES lookups.
  const match = /^(\d{4})-(\d{2})$/.exec(iso);
  if (match) {
    const year = Number(match[1]);
    const month = Number(match[2]);
    if (!Number.isNaN(year) && !Number.isNaN(month) && month >= 1 && month <= 12) {
      return { year, month };
    }
  }
  return { year: currentYear(), month: currentMonthNum() };
}

export function formatMonthLabel(iso: string): string {
  const { year, month } = parseMonthStr(iso);
  return `${MONTH_NAMES[month - 1]} ${year}`;
}

/**
 * The inclusive "YYYY-MM-DD" bounds of a given calendar month, for passing
 * to listTransactions' date_from/date_to filter (e.g. the label-transactions
 * modal on the Summary page). `new Date(year, month, 0)` is the last day of
 * `month` (1-indexed) since day 0 rolls back into the previous month —
 * read only via getDate(), so the local-time construction is fine here
 * (unlike parsing an ISO string, there's no UTC/local ambiguity to avoid).
 */
export function monthDateRange(year: number, month: number): { from: string; to: string } {
  const lastDay = new Date(year, month, 0).getDate();
  const monthStr = toMonthStr(year, month);
  return { from: `${monthStr}-01`, to: `${monthStr}-${String(lastDay).padStart(2, '0')}` };
}

/** Years from earliest transaction year → current year, descending. */
export function yearRange(earliestIso: string | null): number[] {
  const start = earliestIso ? Number(earliestIso.slice(0, 4)) : currentYear();
  const years: number[] = [];
  for (let y = currentYear(); y >= start; y--) years.push(y);
  return years;
}

/**
 * Month numbers (1–12) that are valid for the given year.
 * Excludes future months in the current year and months before the
 * earliest transaction in the earliest year.
 */
export function availableMonths(year: number, earliestIso: string | null): number[] {
  const earliest = earliestIso ? parseMonthStr(earliestIso.slice(0, 7)) : null;
  return Array.from({ length: 12 }, (_, i) => i + 1).filter(m => {
    if (year === currentYear() && m > currentMonthNum()) return false;
    if (earliest && year === earliest.year && m < earliest.month) return false;
    return true;
  });
}
