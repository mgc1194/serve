// pages/budget-detail/budget-column.test.tsx

import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { BudgetColumn } from '@pages/budget-detail/budget-column';
import { makeBudgetLine } from '@serve/mocks';

const LINES = [
  makeBudgetLine({ id: 1, category_name: 'Groceries', planned_amount: 500, actual_amount: '420.00' }),
  makeBudgetLine({ id: 2, category_name: 'Transport', planned_amount: 200, actual_amount: '250.00' }),
];

describe('BudgetColumn rendering', () => {
  it('renders the section title', () => {
    render(<BudgetColumn title="Spending" type="spending" lines={LINES} />);
    expect(screen.getByText('Spending')).toBeDefined();
  });

  it('renders the column headers', () => {
    render(<BudgetColumn title="Spending" type="spending" lines={LINES} />);
    expect(screen.getByText('Category')).toBeDefined();
    expect(screen.getByText('Budgeted')).toBeDefined();
    expect(screen.getByText('Total')).toBeDefined();
    expect(screen.getByText('Diff')).toBeDefined();
  });

  it('renders a row per line', () => {
    render(<BudgetColumn title="Spending" type="spending" lines={LINES} />);
    expect(screen.getByText('Groceries')).toBeDefined();
    expect(screen.getByText('Transport')).toBeDefined();
  });

  it('shows a default empty message when there are no lines', () => {
    render(<BudgetColumn title="Earnings" type="earning" lines={[]} />);
    expect(screen.getByText('No categories yet.')).toBeDefined();
    expect(screen.queryByText('Category')).toBeNull();
  });

  it('shows a custom empty message when given one', () => {
    render(
      <BudgetColumn title="Earnings" type="earning" lines={[]} emptyMessage="No earning categories yet." />,
    );
    expect(screen.getByText('No earning categories yet.')).toBeDefined();
  });

  it('does not show the progress bar when there are no lines', () => {
    render(<BudgetColumn title="Earnings" type="earning" lines={[]} />);
    expect(screen.queryByRole('progressbar')).toBeNull();
  });
});

// Only presence and totals delegation — BudgetProgressBar's own behavior
// (color, 100% cap, zero-planned handling) is covered by its own test file.
describe('BudgetColumn progress bar delegation', () => {
  it('shows a progress bar reflecting the totals of all its lines', () => {
    render(<BudgetColumn title="Spending" type="spending" lines={LINES} />);
    // LINES: planned 500 + 200 = 700; actual 420 + 250 = 670.
    expect(screen.getByText('$670.00 actual')).toBeDefined();
    expect(screen.getByText('$700.00 planned')).toBeDefined();
  });
});
