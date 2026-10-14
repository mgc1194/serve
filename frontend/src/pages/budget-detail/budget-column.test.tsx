// pages/budget-detail/budget-column.test.tsx

import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

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

  // Plain floating-point addition of these particular amounts puts
  // totalPlanned at 0.3 and totalActual at 0.30000000000000004 — equal in
  // dollars, but (planned - actual) lands a hair below zero, which used to
  // flip the bar to the "over budget" color even though actual exactly
  // equals planned. Summing via cents (sumCurrency) keeps them exactly
  // equal instead.
  it('does not let floating-point summation drift flip the over/under color for equal totals', () => {
    const lines = [
      makeBudgetLine({ id: 1, planned_amount: 0.3, actual_amount: '0.10' }),
      makeBudgetLine({ id: 2, planned_amount: 0, actual_amount: '0.20' }),
    ];
    render(<BudgetColumn title="Spending" type="spending" lines={lines} />);
    expect(screen.getByRole('progressbar').className).toMatch(/colorSuccess/);
  });
});

// Only presence, defaulting, and prop passthrough — each BudgetLineRow's
// own edit-mode behavior (field value, validity, delete) is covered by
// its own test file.
describe('BudgetColumn edit mode delegation', () => {
  it("shows a delete button per row and defaults an untouched line's field to its committed amount", () => {
    render(<BudgetColumn title="Spending" type="spending" lines={LINES} isEditMode />);
    expect(screen.getByRole('spinbutton', { name: /groceries budgeted amount/i })).toHaveProperty(
      'value',
      '500',
    );
    expect(screen.getByRole('button', { name: /delete groceries/i })).toBeDefined();
  });

  it('does not show editable fields or delete buttons outside edit mode', () => {
    render(<BudgetColumn title="Spending" type="spending" lines={LINES} />);
    expect(screen.queryByRole('spinbutton')).toBeNull();
    expect(screen.queryByRole('button', { name: /delete groceries/i })).toBeNull();
  });

  it("passes a line's own draft text through instead of its committed amount", () => {
    render(
      <BudgetColumn
        title="Spending"
        type="spending"
        lines={LINES}
        isEditMode
        plannedAmountInputs={{ 1: '750' }}
      />,
    );
    expect(screen.getByRole('spinbutton', { name: /groceries budgeted amount/i })).toHaveProperty(
      'value',
      '750',
    );
  });

  it('forwards onPlannedAmountChange and onDelete with the right line id', () => {
    const onPlannedAmountChange = vi.fn();
    const onDelete = vi.fn();
    render(
      <BudgetColumn
        title="Spending"
        type="spending"
        lines={LINES}
        isEditMode
        onPlannedAmountChange={onPlannedAmountChange}
        onDelete={onDelete}
      />,
    );

    fireEvent.change(screen.getByRole('spinbutton', { name: /groceries budgeted amount/i }), {
      target: { value: '750' },
    });
    expect(onPlannedAmountChange).toHaveBeenCalledWith(1, '750');

    fireEvent.click(screen.getByRole('button', { name: /delete groceries/i }));
    expect(onDelete).toHaveBeenCalledWith(1);
  });

  it('disables every row while disabled is true', () => {
    render(<BudgetColumn title="Spending" type="spending" lines={LINES} isEditMode disabled />);
    expect(
      screen.getByRole('spinbutton', { name: /groceries budgeted amount/i }).hasAttribute('disabled'),
    ).toBe(true);
    expect(screen.getByRole('button', { name: /delete groceries/i }).hasAttribute('disabled')).toBe(
      true,
    );
  });
});
