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
