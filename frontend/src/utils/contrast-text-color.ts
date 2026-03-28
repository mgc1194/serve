// utils/contrast-text-color.ts
//
// Returns '#fff' or '#111' for text, whichever achieves the higher
// contrast ratio against the given background color per the WCAG 2.1 formula.

export function contrastTextColor(hex: string): '#fff' | '#111' {
  // Strip the leading '#' and parse RGB components.
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);

  // Relative luminance per WCAG 2.1 formula.
  const toLinear = (c: number) => {
    const s = c / 255;
    return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };

  const L = 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);

  const contrastWhite = 1.05 / (L + 0.05);
  const contrastBlack = (L + 0.05) / 0.05;

  return contrastWhite >= contrastBlack ? '#fff' : '#111';
}
