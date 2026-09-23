// pages/budgets/create-budget-dialog/derive-budget-name.test.ts

import { describe, expect, it } from 'vitest';

import { deriveBudgetName } from '@pages/budgets/create-budget-dialog/derive-budget-name';

describe('deriveBudgetName', () => {
  it('formats a Monthly budget as "Month Year"', () => {
    expect(deriveBudgetName('monthly', '2026-08-01')).toBe('August 2026');
  });

  it('returns an empty string for Monthly with no month picked', () => {
    expect(deriveBudgetName('monthly')).toBe('');
  });

  it('formats a Period budget as a date range', () => {
    expect(deriveBudgetName('period', '2026-08-15', '2026-09-15')).toBe(
      'Aug 15, 2026 – Sep 15, 2026',
    );
  });

  it('returns an empty string for Period with only one date picked', () => {
    expect(deriveBudgetName('period', '2026-08-15')).toBe('');
  });

  it('returns an empty string for Project regardless of dates', () => {
    expect(deriveBudgetName('project', '2026-08-15', '2026-09-15')).toBe('');
  });
});
