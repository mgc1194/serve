// pages/budgets/create-budget-dialog/date-helpers.test.ts

import { describe, expect, it } from 'vitest';

import { toDateString, toDayjs } from '@pages/budgets/create-budget-dialog/date-helpers';

describe('toDayjs', () => {
  it('parses a "YYYY-MM-DD" string', () => {
    expect(toDayjs('2026-08-15')?.format('YYYY-MM-DD')).toBe('2026-08-15');
  });

  it('returns null for undefined', () => {
    expect(toDayjs(undefined)).toBeNull();
  });
});

describe('toDateString', () => {
  it('formats a valid Dayjs value as "YYYY-MM-DD"', () => {
    expect(toDateString(toDayjs('2026-08-15'))).toBe('2026-08-15');
  });

  it('returns undefined for null', () => {
    expect(toDateString(null)).toBeUndefined();
  });
});
