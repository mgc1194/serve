// utils/contrast-text-color.test.ts

import { describe, expect, it } from 'vitest';

import { contrastTextColor } from '@utils/contrast-text-color';

// Mirrors the implementation so the property-based test uses the exact same
// candidate luminances (including #111, not pure black).
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

describe('contrastTextColor', () => {
  it('returns white for black', () => {
    expect(contrastTextColor('#000000')).toBe('#fff');
  });

  it('returns black for white', () => {
    expect(contrastTextColor('#ffffff')).toBe('#111');
  });

  it('returns white for dark colors', () => {
    expect(contrastTextColor('#1a1a2e')).toBe('#fff'); // very dark navy
    expect(contrastTextColor('#7f0000')).toBe('#fff'); // dark red
    expect(contrastTextColor('#1d4ed8')).toBe('#fff'); // dark blue
  });

  it('returns black for light colors', () => {
    expect(contrastTextColor('#fef08a')).toBe('#111'); // light yellow
    expect(contrastTextColor('#bbf7d0')).toBe('#111'); // light green
    expect(contrastTextColor('#e0e7ff')).toBe('#111'); // light indigo
  });

  it('handles uppercase hex', () => {
    expect(contrastTextColor('#FFFFFF')).toBe('#111');
    expect(contrastTextColor('#000000')).toBe('#fff');
  });

  it('falls back to white for invalid hex input', () => {
    expect(contrastTextColor('')).toBe('#fff');
    expect(contrastTextColor('#fff')).toBe('#fff');   // shorthand — not supported
    expect(contrastTextColor('red')).toBe('#fff');    // named color — not supported
    expect(contrastTextColor('#GGGGGG')).toBe('#fff'); // invalid characters
  });

  it('always picks the candidate with the higher contrast ratio', () => {
    const colors = [
      '#6B7280', // neutral gray — close to the crossover
      '#ef4444', // red
      '#22c55e', // green
      '#f97316', // orange
      '#a855f7', // purple
      '#111111', // near-black itself
      '#ffffff', // white itself
    ];

    for (const hex of colors) {
      const L = luminance(hex);
      const expectedResult =
        contrastRatio(L_WHITE, L) >= contrastRatio(L_DARK, L) ? '#fff' : '#111';
      expect(contrastTextColor(hex)).toBe(expectedResult);
    }
  });
});
