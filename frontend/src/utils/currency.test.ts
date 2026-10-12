// utils/currency.test.ts

import { describe, expect, it } from 'vitest';

import { formatCurrency, signPrefix } from '@utils/currency';

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
