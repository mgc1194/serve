// utils/contrast-text-color.test.ts

import { describe, expect, it } from 'vitest';

import { contrastTextColor } from '@utils/contrast-text-color';

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

  it('always picks the higher contrast of the two options', () => {
    // For any color, the chosen option should have a higher or equal contrast
    // ratio than the rejected one.
    const colors = [
      '#6B7280', // neutral gray — close to the crossover
      '#ef4444', // red
      '#22c55e', // green
      '#f97316', // orange
      '#a855f7', // purple
    ];

    for (const hex of colors) {
      const r = parseInt(hex.slice(1, 3), 16);
      const g = parseInt(hex.slice(3, 5), 16);
      const b = parseInt(hex.slice(5, 7), 16);
      const toLinear = (c: number) => {
        const s = c / 255;
        return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
      };
      const L = 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
      const contrastWhite = 1.05 / (L + 0.05);
      const contrastBlack = (L + 0.05) / 0.05;

      const result = contrastTextColor(hex);
      if (contrastWhite >= contrastBlack) {
        expect(result).toBe('#fff');
      } else {
        expect(result).toBe('#111');
      }
    }
  });

  it('handles uppercase hex', () => {
    expect(contrastTextColor('#FFFFFF')).toBe('#111');
    expect(contrastTextColor('#000000')).toBe('#fff');
  });
});
