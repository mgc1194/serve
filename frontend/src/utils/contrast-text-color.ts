// utils/contrast-text-color.ts
//
// Returns '#fff' or '#111' for text, whichever achieves the higher
// contrast ratio against the given background color per the WCAG 2.1 formula.
//
// Candidates are white (#fff, L=1) and near-black (#111, L≈0.0049).
// Contrast ratios are computed using the actual luminance of each candidate
// so the crossover point is exact and the chosen color always wins.

const HEX_RE = /^#[0-9A-Fa-f]{6}$/;

const toLinear = (c: number) => {
  const s = c / 255;
  return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
};

function luminance(hex: string): number {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
}

function contrastRatio(l1: number, l2: number): number {
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

const L_WHITE = 1;
const L_DARK = luminance('#111111');

export function contrastTextColor(hex: string): '#fff' | '#111' {
  if (!HEX_RE.test(hex)) {
    // Fall back to white — it's more likely to be readable on an unknown color
    // than black, and this case should only occur due to a bug upstream.
    return '#fff';
  }

  const L = luminance(hex);
  return contrastRatio(L_WHITE, L) >= contrastRatio(L_DARK, L) ? '#fff' : '#111';
}
