// src/mocks/budgets.ts — Mocks for Budget.

import type { Budget } from '@serve/types/global';

export function makeBudget(overrides: Partial<Budget> = {}): Budget {
  return {
    id: 1,
    name: 'January Budget',
    type: 'period',
    period_start: '2026-01-01',
    period_end: '2026-01-31',
    is_active: true,
    household_id: 1,
    ...overrides,
  };
}
