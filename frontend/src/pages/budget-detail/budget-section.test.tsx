// pages/budget-detail/budget-section.test.tsx

import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { BudgetSection } from '@pages/budget-detail/budget-section';
import { makeBudgetLine } from '@serve/mocks';

const EXPENSE_LINES = [
  makeBudgetLine({
    id: 1,
    category_id: 1,
    category_name: 'Retirement',
    category_type: 'spending',
    planned_amount: '1170.00',
    actual_amount: '0.00',
  }),
];

const INCOME_LINES = [
  makeBudgetLine({
    id: 2,
    category_id: 2,
    category_name: 'Paycheck',
    category_type: 'earning',
    planned_amount: '12680.00',
    actual_amount: '10000.00',
  }),
];

function setup(overrides: Partial<React.ComponentProps<typeof BudgetSection>> = {}) {
  const onPlannedAmountChange = vi.fn();
  const onRemove = vi.fn();
  render(
    <BudgetSection
      title="Expenses"
      lines={EXPENSE_LINES}
      isIncome={false}
      onPlannedAmountChange={onPlannedAmountChange}
      onRemove={onRemove}
      {...overrides}
    />,
  );
  return { onPlannedAmountChange, onRemove };
}

beforeEach(() => vi.clearAllMocks());

describe('BudgetSection rendering', () => {
  it('renders the section title', () => {
    setup();
    expect(screen.getByText('Expenses')).toBeDefined();
  });

  it('renders a row per line with its category name', () => {
    setup();
    expect(screen.getByText('Retirement')).toBeDefined();
  });

  it('renders the Totals row', () => {
    setup();
    expect(screen.getByText('Totals')).toBeDefined();
  });

  it('shows an empty message when there are no lines', () => {
    setup({ lines: [] });
    expect(screen.getByText(/no categories tracked yet/i)).toBeDefined();
  });

  it('does not render a table when there are no lines', () => {
    setup({ lines: [] });
    expect(screen.queryByText('Totals')).toBeNull();
  });
});

describe('BudgetSection Diff sign convention', () => {
  it('expenses: diff is planned - actual (positive means under budget)', () => {
    // Retirement: planned 1170, actual 0 -> diff +1170 — matches both the
    // single row and the Totals row (only one line), so both must appear.
    setup();
    expect(screen.getAllByText('+$1,170.00')).toHaveLength(2);
  });

  it('income: diff is actual - planned (negative means under target)', () => {
    // Paycheck: planned 12680, actual 10000 -> diff -2680 — matches both the
    // single row and the Totals row (only one line), so both must appear.
    setup({ title: 'Income', lines: INCOME_LINES, isIncome: true });
    expect(screen.getAllByText('−$2,680.00')).toHaveLength(2);
  });
});

describe('BudgetSection interactions', () => {
  it('calls onPlannedAmountChange when a planned amount is edited', () => {
    const { onPlannedAmountChange } = setup();
    const input = screen.getByLabelText(/planned amount/i);
    fireEvent.change(input, { target: { value: '1500' } });
    fireEvent.blur(input);
    expect(onPlannedAmountChange).toHaveBeenCalledWith(1, '1500.00');
  });

  it('calls onRemove with the line id when the remove button is clicked', () => {
    const { onRemove } = setup();
    fireEvent.click(screen.getByRole('button', { name: /remove retirement/i }));
    expect(onRemove).toHaveBeenCalledWith(1);
  });
});
