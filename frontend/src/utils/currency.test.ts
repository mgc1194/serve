// utils/currency.test.ts

import { describe, expect, it } from 'vitest';

import { formatCurrency, signPrefix, sumCurrency } from '@utils/currency';

describe('formatCurrency', () => {
  it('formats a positive value', () => {
    expect(formatCurrency(2500)).toBe('$2,500.00');
  });

  it('formats a negative value as its magnitude, with no sign', () => {
    expect(formatCurrency(-320.57)).toBe('$320.57');
  });

  it('formats zero', () => {
    expect(formatCurrency(0)).toBe('$0.00');
  });
});

describe('signPrefix', () => {
  it('returns + for a positive value', () => {
    expect(signPrefix(500)).toBe('+');
  });

  it('returns − for a negative value', () => {
    expect(signPrefix(-100)).toBe('−');
  });

  it('returns an empty string for exactly zero', () => {
    expect(signPrefix(0)).toBe('');
  });
});

describe('sumCurrency', () => {
  it('sums plain amounts', () => {
    expect(sumCurrency([420.57, 250, 45])).toBe(715.57);
  });

  it('returns 0 for an empty array', () => {
    expect(sumCurrency([])).toBe(0);
  });

  // Plain floating-point addition drifts here: [0.1, 0.2].reduce((s, v) =>
  // s + v, 0) is 0.30000000000000004, not 0.3. Summing via cents avoids it.
  it('avoids floating-point drift that plain addition is prone to', () => {
    expect(sumCurrency([0.1, 0.2])).toBe(0.3);
  });

  // The scenario this actually protects against: two sums that are
  // mathematically equal but computed from different addends can land a
  // hair apart under plain floating-point addition — exactly here, naive
  // addition puts planned at 0.3 and actual at 0.30000000000000004, making
  // (planned - actual) a tiny NEGATIVE number instead of exactly 0.
  it('makes two mathematically-equal sums compare exactly equal', () => {
    const totalPlanned = sumCurrency([0.3, 0]);
    const totalActual = sumCurrency([0.1, 0.2]);
    expect(totalPlanned).toBe(totalActual);
    expect(totalPlanned - totalActual).toBe(0);
  });
});
