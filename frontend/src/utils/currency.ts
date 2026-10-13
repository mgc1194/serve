// utils/currency.ts — Shared signed-currency display helpers.
//
// Used anywhere a value's magnitude and sign are rendered separately (e.g.
// an explicit "+"/"−" prefix next to a color-coded amount) rather than via
// Intl's own sign handling, so the whole app shows one consistent minus
// character (U+2212, not the ASCII hyphen Intl.NumberFormat's own
// signDisplay would use).

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    signDisplay: 'never',
  }).format(Math.abs(value));
}

export function signPrefix(value: number): string {
  return value > 0 ? '+' : value < 0 ? '−' : '';
}

// Sums dollar amounts via integer cents rather than plain floating-point
// addition, which drifts across repeated sums (e.g. 0.1 + 0.2 !== 0.3) —
// harmless for display (formatCurrency rounds to cents regardless), but
// not for an exact-equality check like a >= 0 sign comparison: two sums
// that are mathematically equal can land a hair apart in floating point,
// occasionally flipping which side of zero a diff falls on. Rounds each
// value to the nearest cent before accumulating, so representation noise
// in a single value (e.g. 420.57 not being exactly representable) can't
// compound across many of them either.
export function sumCurrency(values: number[]): number {
  const totalCents = values.reduce((sum, value) => sum + Math.round(value * 100), 0);
  return totalCents / 100;
}
