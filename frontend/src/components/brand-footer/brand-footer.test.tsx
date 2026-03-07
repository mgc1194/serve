import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { BrandFooter } from '@components/brand-footer';

describe('BrandFooter', () => {
  it('renders the tagline', () => {
    render(<BrandFooter />);
    expect(screen.getByText('Spending · Earnings · Resources · View · Engine')).toBeDefined();
  });
});
