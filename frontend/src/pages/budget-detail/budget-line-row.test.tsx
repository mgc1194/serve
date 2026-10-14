// pages/budget-detail/budget-line-row.test.tsx

import { Table, TableBody } from '@mui/material';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { BudgetLineRow } from '@pages/budget-detail/budget-line-row';
import { makeBudgetLine } from '@serve/mocks';

function setup(
  overrides: Partial<React.ComponentProps<typeof BudgetLineRow>['line']> = {},
  rowProps: Partial<Omit<React.ComponentProps<typeof BudgetLineRow>, 'line'>> = {},
) {
  render(
    <Table>
      <TableBody>
        <BudgetLineRow line={makeBudgetLine(overrides)} {...rowProps} />
      </TableBody>
    </Table>,
  );
}

describe('BudgetLineRow rendering', () => {
  it('renders the category name', () => {
    setup({ category_name: 'Groceries' });
    expect(screen.getByText('Groceries')).toBeDefined();
  });

  it('renders the budgeted (planned) amount', () => {
    setup({ planned_amount: 500 });
    expect(screen.getByText('$500.00')).toBeDefined();
  });

  it('renders the actual total', () => {
    setup({ actual_amount: '320.57' });
    expect(screen.getByText('$320.57')).toBeDefined();
  });
});

describe('BudgetLineRow diff — earning category (actual - planned)', () => {
  it('shows + when actual exceeds planned', () => {
    setup({ category_type: 'earning', planned_amount: 2000, actual_amount: '2200.00' });
    expect(screen.getByText('+$200.00')).toBeDefined();
  });

  it('shows − when actual falls short of planned', () => {
    setup({ category_type: 'earning', planned_amount: 2000, actual_amount: '1800.00' });
    expect(screen.getByText('−$200.00')).toBeDefined();
  });
});

describe('BudgetLineRow diff — spending category (planned - actual)', () => {
  it('shows + when actual comes in under budget', () => {
    setup({ category_type: 'spending', planned_amount: 500, actual_amount: '420.00' });
    expect(screen.getByText('+$80.00')).toBeDefined();
  });

  it('shows − when actual goes over budget', () => {
    setup({ category_type: 'spending', planned_amount: 500, actual_amount: '580.00' });
    expect(screen.getByText('−$80.00')).toBeDefined();
  });
});

// A large amount (five digits and up) could otherwise wrap onto a second
// line within the cell once a category name on the same row pushes these
// columns narrow — nowrap keeps it on one line, letting the table's own
// TableContainer scroll horizontally instead if it genuinely doesn't fit.
describe('BudgetLineRow does not wrap large amounts', () => {
  it('keeps the budgeted amount on one line', () => {
    setup({ planned_amount: 12345 });
    expect(getComputedStyle(screen.getByText('$12,345.00')).whiteSpace).toBe('nowrap');
  });

  it('keeps the actual total on one line', () => {
    setup({ actual_amount: '12345.00' });
    expect(getComputedStyle(screen.getByText('$12,345.00')).whiteSpace).toBe('nowrap');
  });

  it('keeps the diff on one line', () => {
    setup({ category_type: 'spending', planned_amount: 20000, actual_amount: '7655.00' });
    // The diff text sits in a nested <span> (Typography) — the nowrap
    // style is on the <td> itself, so check via the cell, not the span.
    const diffCell = screen.getByText('+$12,345.00').closest('td');
    expect(getComputedStyle(diffCell!).whiteSpace).toBe('nowrap');
  });
});

describe('BudgetLineRow edit mode', () => {
  it('shows an editable field with the current draft text instead of the formatted amount', () => {
    setup({ category_name: 'Groceries', planned_amount: 500 }, { isEditMode: true, plannedAmountInput: '750' });
    expect(screen.getByRole('spinbutton')).toHaveProperty('value', '750');
    expect(screen.queryByText('$500.00')).toBeNull();
  });

  it('calls onPlannedAmountChange with the raw typed text on every change', () => {
    const onPlannedAmountChange = vi.fn();
    setup(
      { id: 7, planned_amount: 500 },
      { isEditMode: true, plannedAmountInput: '500', onPlannedAmountChange },
    );
    fireEvent.change(screen.getByRole('spinbutton'), { target: { value: '750' } });
    expect(onPlannedAmountChange).toHaveBeenCalledWith(7, '750');
  });

  it('flags the field as invalid when the draft is not a whole-dollar amount', () => {
    setup({ planned_amount: 500 }, { isEditMode: true, plannedAmountInput: '420.50' });
    expect(screen.getByRole('spinbutton').getAttribute('aria-invalid')).toBe('true');
  });

  it('flags the field as invalid when the draft is empty', () => {
    setup({ planned_amount: 500 }, { isEditMode: true, plannedAmountInput: '' });
    expect(screen.getByRole('spinbutton').getAttribute('aria-invalid')).toBe('true');
  });

  it('shows a delete button that calls onDelete with the line id', () => {
    const onDelete = vi.fn();
    setup({ id: 9, category_name: 'Groceries' }, { isEditMode: true, onDelete });
    fireEvent.click(screen.getByRole('button', { name: /delete groceries/i }));
    expect(onDelete).toHaveBeenCalledWith(9);
  });

  it('disables the field and delete button when disabled is true', () => {
    setup(
      { category_name: 'Groceries' },
      { isEditMode: true, plannedAmountInput: '500', disabled: true },
    );
    expect(screen.getByRole('spinbutton').hasAttribute('disabled')).toBe(true);
    expect(
      screen.getByRole('button', { name: /delete groceries/i }).hasAttribute('disabled'),
    ).toBe(true);
  });

  it('does not show the editable field or delete button outside edit mode', () => {
    setup({ category_name: 'Groceries', planned_amount: 500 });
    expect(screen.queryByRole('spinbutton')).toBeNull();
    expect(screen.queryByRole('button', { name: /delete groceries/i })).toBeNull();
    expect(screen.getByText('$500.00')).toBeDefined();
  });
});
