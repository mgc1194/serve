// src/mocks/budgets.ts — Mocks for Budget and BudgetLine.

import type { Budget, BudgetLine } from '@serve/types/global';

export function makeBudget(overrides: Partial<Budget> = {}): Budget {
  return {
    id: 1,
    name: 'January Budget',
    type: 'spending',
    period_start: '2026-01-01',
    period_end: '2026-01-31',
    is_active: true,
    household_id: 1,
    ...overrides,
  };
}

export function makeBudgetLine(overrides: Partial<BudgetLine> = {}): BudgetLine {
  return {
    id: 1,
    budget_id: 1,
    category_id: 1,
    category_name: 'Groceries',
    category_type: 'spending',
    planned_amount: '0.00',
    notes: '',
    ...overrides,
  };
}
