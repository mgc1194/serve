// pages/transactions/budget-filter-bar.test.tsx

import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { BudgetFilterBar } from '@pages/transactions/budget-filter-bar';
import { makeBudget } from '@serve/mocks';

const BUDGETS = [
  makeBudget({ id: 1, name: 'January Budget' }),
  makeBudget({ id: 2, name: 'February Budget' }),
];

function setup(overrides: Partial<React.ComponentProps<typeof BudgetFilterBar>> = {}) {
  const onBudgetChange = vi.fn();
  render(
    <BudgetFilterBar
      budgets={BUDGETS}
      budgetId={undefined}
      onBudgetChange={onBudgetChange}
      {...overrides}
    />,
  );
  return { onBudgetChange };
}

function openDropdown() {
  fireEvent.mouseDown(screen.getByRole('combobox'));
}

beforeEach(() => vi.clearAllMocks());

describe('BudgetFilterBar rendering', () => {
  it('renders the filter input with a placeholder of "No budget"', () => {
    setup();
    expect(screen.getByPlaceholderText('No budget')).toBeDefined();
  });

  it('shows the selected budget name as the input value', () => {
    setup({ budgetId: 1 });
    expect((screen.getByRole('combobox') as HTMLInputElement).value).toBe('January Budget');
  });

  it('lists every budget when opened', () => {
    setup();
    openDropdown();
    expect(screen.getByText('January Budget')).toBeDefined();
    expect(screen.getByText('February Budget')).toBeDefined();
  });

  it('renders with no budgets gracefully', () => {
    setup({ budgets: [] });
    openDropdown();
    expect(screen.queryByRole('option')).toBeNull();
  });
});

describe('BudgetFilterBar interactions', () => {
  it('calls onBudgetChange with the budget id when a budget option is chosen', () => {
    const { onBudgetChange } = setup();
    openDropdown();
    fireEvent.click(screen.getByText('January Budget'));
    expect(onBudgetChange).toHaveBeenCalledWith(1);
  });

  it('calls onBudgetChange with undefined when the selection is cleared', () => {
    const { onBudgetChange } = setup({ budgetId: 1 });
    fireEvent.click(screen.getByTitle('Clear'));
    expect(onBudgetChange).toHaveBeenCalledWith(undefined);
  });
});
