// pages/budget-detail/budget-line-row.test.tsx

import { Table, TableBody } from '@mui/material';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { BudgetLineRow } from '@pages/budget-detail/budget-line-row';
import { makeBudgetLine } from '@serve/mocks';

function setup(overrides: Partial<React.ComponentProps<typeof BudgetLineRow>['line']> = {}) {
  render(
    <Table>
      <TableBody>
        <BudgetLineRow line={makeBudgetLine(overrides)} />
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
