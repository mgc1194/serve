// pages/budget-detail/budget-progress-bar.test.tsx

import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { BudgetProgressBar } from '@pages/budget-detail/budget-progress-bar';

describe('BudgetProgressBar', () => {
  it('shows the total planned and total actual amounts', () => {
    render(<BudgetProgressBar type="spending" totalPlanned={700} totalActual={670} />);
    expect(screen.getByText('$670.00 actual')).toBeDefined();
    expect(screen.getByText('$700.00 planned')).toBeDefined();
  });

  it('shows success color when under budget (spending)', () => {
    render(<BudgetProgressBar type="spending" totalPlanned={500} totalActual={400} />);
    expect(screen.getByRole('progressbar').className).toMatch(/colorSuccess/);
  });

  it('shows error color when over budget (spending)', () => {
    render(<BudgetProgressBar type="spending" totalPlanned={500} totalActual={600} />);
    expect(screen.getByRole('progressbar').className).toMatch(/colorError/);
  });

  it('shows success color when exceeding an earning goal', () => {
    render(<BudgetProgressBar type="earning" totalPlanned={500} totalActual={600} />);
    expect(screen.getByRole('progressbar').className).toMatch(/colorSuccess/);
  });

  it('shows error color when falling short of an earning goal', () => {
    render(<BudgetProgressBar type="earning" totalPlanned={500} totalActual={400} />);
    expect(screen.getByRole('progressbar').className).toMatch(/colorError/);
  });

  it('caps the bar value at 100% when actual exceeds planned', () => {
    render(<BudgetProgressBar type="spending" totalPlanned={500} totalActual={600} />);
    expect(screen.getByRole('progressbar').getAttribute('aria-valuenow')).toBe('100');
  });

  it('shows a 0% bar without dividing by zero when nothing is planned', () => {
    render(<BudgetProgressBar type="spending" totalPlanned={0} totalActual={0} />);
    expect(screen.getByRole('progressbar').getAttribute('aria-valuenow')).toBe('0');
  });

  // The adjacent "actual"/"planned" Typography text isn't programmatically
  // associated with the bar, so without its own accessible name a screen
  // reader would announce only a bare percentage with no indication of
  // what it's a percentage OF.
  it('has an accessible name stating the actual and planned amounts', () => {
    render(<BudgetProgressBar type="spending" totalPlanned={700} totalActual={670} />);
    expect(screen.getByRole('progressbar', { name: '$670.00 actual of $700.00 planned' })).toBeDefined();
  });
});
