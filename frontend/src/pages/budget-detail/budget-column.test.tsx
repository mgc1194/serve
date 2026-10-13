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

describe('BudgetColumn progress bar', () => {
  it('shows the total planned and total actual amounts', () => {
    render(<BudgetColumn title="Spending" type="spending" lines={LINES} />);
    // LINES: planned 500 + 200 = 700; actual 420 + 250 = 670.
    expect(screen.getByText('$670.00 actual')).toBeDefined();
    expect(screen.getByText('$700.00 planned')).toBeDefined();
  });

  it('shows success color when under budget (spending)', () => {
    const lines = [makeBudgetLine({ planned_amount: 500, actual_amount: '400.00' })];
    render(<BudgetColumn title="Spending" type="spending" lines={lines} />);
    expect(screen.getByRole('progressbar').className).toMatch(/colorSuccess/);
  });

  it('shows error color when over budget (spending)', () => {
    const lines = [makeBudgetLine({ planned_amount: 500, actual_amount: '600.00' })];
    render(<BudgetColumn title="Spending" type="spending" lines={lines} />);
    expect(screen.getByRole('progressbar').className).toMatch(/colorError/);
  });

  it('shows success color when exceeding an earning goal', () => {
    const lines = [makeBudgetLine({ planned_amount: 500, actual_amount: '600.00' })];
    render(<BudgetColumn title="Earnings" type="earning" lines={lines} />);
    expect(screen.getByRole('progressbar').className).toMatch(/colorSuccess/);
  });

  it('shows error color when falling short of an earning goal', () => {
    const lines = [makeBudgetLine({ planned_amount: 500, actual_amount: '400.00' })];
    render(<BudgetColumn title="Earnings" type="earning" lines={lines} />);
    expect(screen.getByRole('progressbar').className).toMatch(/colorError/);
  });

  it('caps the bar value at 100% when actual exceeds planned', () => {
    const lines = [makeBudgetLine({ planned_amount: 500, actual_amount: '600.00' })];
    render(<BudgetColumn title="Spending" type="spending" lines={lines} />);
    expect(screen.getByRole('progressbar').getAttribute('aria-valuenow')).toBe('100');
  });

  it('shows a 0% bar without dividing by zero when nothing is planned', () => {
    const lines = [makeBudgetLine({ planned_amount: 0, actual_amount: '0.00' })];
    render(<BudgetColumn title="Spending" type="spending" lines={lines} />);
    expect(screen.getByRole('progressbar').getAttribute('aria-valuenow')).toBe('0');
  });
});
