// pages/summary/date-utils.test.ts — Unit tests for summary date utilities.

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  availableMonths,
  formatMonthLabel,
  parseMonthStr,
  toMonthStr,
  yearRange,
  currentMonthStr,
} from './date-utils';

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Pin the current date so tests are deterministic. */
function mockNow(isoDate: string) {
  vi.setSystemTime(new Date(isoDate));
}

beforeEach(() => mockNow('2026-03-15'));
afterEach(() => vi.useRealTimers());

// ── toMonthStr ────────────────────────────────────────────────────────────────

describe('toMonthStr', () => {
  it('pads single-digit months with a leading zero', () => {
    expect(toMonthStr(2026, 3)).toBe('2026-03');
  });

  it('does not pad two-digit months', () => {
    expect(toMonthStr(2026, 11)).toBe('2026-11');
  });

  it('handles January', () => {
    expect(toMonthStr(2025, 1)).toBe('2025-01');
  });

  it('handles December', () => {
    expect(toMonthStr(2025, 12)).toBe('2025-12');
  });
});

// ── parseMonthStr ─────────────────────────────────────────────────────────────

describe('parseMonthStr', () => {
  it('parses a padded month string', () => {
    expect(parseMonthStr('2026-03')).toEqual({ year: 2026, month: 3 });
  });

  it('parses a full ISO date string (uses only YYYY-MM part)', () => {
    expect(parseMonthStr('2025-01-15')).toEqual({ year: 2025, month: 1 });
  });

  it('parses December correctly', () => {
    expect(parseMonthStr('2024-12')).toEqual({ year: 2024, month: 12 });
  });
});

// ── formatMonthLabel ──────────────────────────────────────────────────────────

describe('formatMonthLabel', () => {
  it('formats a mid-year month', () => {
    expect(formatMonthLabel('2026-03')).toBe('March 2026');
  });

  it('formats January', () => {
    expect(formatMonthLabel('2025-01')).toBe('January 2025');
  });

  it('formats December', () => {
    expect(formatMonthLabel('2024-12')).toBe('December 2024');
  });
});

// ── currentMonthStr ───────────────────────────────────────────────────────────

describe('currentMonthStr', () => {
  it('returns the current year and month as YYYY-MM', () => {
    expect(currentMonthStr()).toBe('2026-03');
  });

  it('pads single-digit months', () => {
    mockNow('2026-01-05');
    expect(currentMonthStr()).toBe('2026-01');
  });
});

// ── yearRange ─────────────────────────────────────────────────────────────────

describe('yearRange', () => {
  it('returns only the current year when no earliest date', () => {
    expect(yearRange(null)).toEqual([2026]);
  });

  it('returns only the current year when earliest is this year', () => {
    expect(yearRange('2026-01-01')).toEqual([2026]);
  });

  it('returns years descending from current to earliest', () => {
    expect(yearRange('2024-06-01')).toEqual([2026, 2025, 2024]);
  });

  it('handles earliest year equal to current year', () => {
    expect(yearRange('2026-03-01')).toEqual([2026]);
  });

  it('spans many years correctly', () => {
    const range = yearRange('2020-01-01');
    expect(range[0]).toBe(2026);
    expect(range[range.length - 1]).toBe(2020);
    expect(range).toHaveLength(7);
  });
});

// ── availableMonths ───────────────────────────────────────────────────────────

describe('availableMonths', () => {
  it('returns all 12 months for a past year', () => {
    const months = availableMonths(2025, '2025-01-01');
    expect(months).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
  });

  it('excludes future months for the current year', () => {
    // Pinned to March 2026 — months 4–12 are future
    const months = availableMonths(2026, null);
    expect(months).toEqual([1, 2, 3]);
  });

  it('excludes months before the earliest in the earliest year', () => {
    const months = availableMonths(2024, '2024-06-15');
    expect(months).toEqual([6, 7, 8, 9, 10, 11, 12]);
  });

  it('applies no lower bound for a year after the earliest year', () => {
    const months = availableMonths(2025, '2024-09-01');
    expect(months).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
  });

  it('combines future-month and earliest-month constraints in same year', () => {
    // Earliest is March 2026, current date is also March 2026
    const months = availableMonths(2026, '2026-02-01');
    expect(months).toEqual([1, 2, 3]);
  });

  it('returns only a single month when earliest is same year and month as today', () => {
    const months = availableMonths(2026, '2026-03-01');
    expect(months).toEqual([3]);
  });

  it('returns an empty array when earliest is in a future month of current year', () => {
    // Edge case: data starts in April but we are only in March
    const months = availableMonths(2026, '2026-04-01');
    expect(months).toEqual([]);
  });

  it('returns all months when no earliest and year is in the past', () => {
    const months = availableMonths(2025, null);
    expect(months).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
  });
});
