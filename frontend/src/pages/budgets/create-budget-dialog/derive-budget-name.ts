// pages/budgets/create-budget-dialog/derive-budget-name.ts

import dayjs from 'dayjs';

import { DATE_FORMAT } from '@pages/budgets/create-budget-dialog/date-helpers';
import type { UiBudgetType } from '@pages/budgets/create-budget-dialog/types';

/**
 * "August 2026" for Monthly, "Aug 15, 2026 – Sep 15, 2026" for Period —
 * both derived purely from the picked dates. A name only makes sense for a
 * Project once the household types one in, so this returns '' for it.
 */
export function deriveBudgetName(
  uiType: UiBudgetType,
  periodStart?: string,
  periodEnd?: string,
): string {
  if (uiType === 'monthly' && periodStart) {
    return dayjs(periodStart, DATE_FORMAT).format('MMMM YYYY');
  }
  if (uiType === 'period' && periodStart && periodEnd) {
    const from = dayjs(periodStart, DATE_FORMAT).format('MMM D, YYYY');
    const to = dayjs(periodEnd, DATE_FORMAT).format('MMM D, YYYY');
    return `${from} – ${to}`;
  }
  return '';
}
