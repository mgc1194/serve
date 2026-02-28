import { ThemeProvider } from '@mui/material/styles';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { BrandPanel } from '@serve/components/brand-panel';
import theme from '@serve/theme';

function renderWithTheme(ui: React.ReactElement) {
  return render(<ThemeProvider theme={theme}>{ui}</ThemeProvider>);
}

describe('BrandPanel', () => {
  it('renders the logo', () => {
    renderWithTheme(<BrandPanel tagline="Your finances, clearly." />);
    expect(screen.getByAltText('SERVE')).toBeDefined();
  });

  it('renders the tagline', () => {
    renderWithTheme(<BrandPanel tagline="Your finances, clearly." />);
    expect(screen.getByText('Your finances, clearly.')).toBeDefined();
  });

  it('renders the brand footer', () => {
    renderWithTheme(<BrandPanel tagline="Your finances, clearly." />);
    expect(screen.getByText('Spending · Earnings · Resources · View · Engine')).toBeDefined();
  });
});
