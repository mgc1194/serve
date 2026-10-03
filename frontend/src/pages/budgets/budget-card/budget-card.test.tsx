// pages/budgets/budget-card/budget-card.test.tsx

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { BudgetCard } from '@pages/budgets/budget-card';
import { makeBudget } from '@serve/mocks';
import { deleteBudget, updateBudget, ApiError } from '@services/budgets';

vi.mock('@services/budgets', async importOriginal => {
  const actual = await importOriginal<typeof import('@services/budgets')>();
  return { ...actual, updateBudget: vi.fn(), deleteBudget: vi.fn() };
});

const mockUpdateBudget = vi.mocked(updateBudget);
const mockDeleteBudget = vi.mocked(deleteBudget);

const BUDGET = makeBudget({ id: 1, name: 'January 2026' });

function setup(overrides: Partial<React.ComponentProps<typeof BudgetCard>> = {}) {
  const onUpdated = vi.fn();
  const onDeactivated = vi.fn();
  render(
    <BudgetCard budget={BUDGET} onUpdated={onUpdated} onDeactivated={onDeactivated} {...overrides} />,
  );
  return { onUpdated, onDeactivated };
}

beforeEach(() => vi.clearAllMocks());

describe('BudgetCard rendering', () => {
  it('renders the budget name', () => {
    setup();
    expect(screen.getByText('January 2026')).toBeDefined();
  });

  it('shows the Period type and date range for a period budget', () => {
    setup({
      budget: makeBudget({ type: 'period', period_start: '2026-01-01', period_end: '2026-01-31' }),
    });
    expect(screen.getByText('Period')).toBeDefined();
    expect(screen.getByText('2026-01-01 – 2026-01-31')).toBeDefined();
  });

  it('shows "No fixed period" for a project budget', () => {
    setup({ budget: makeBudget({ type: 'project', period_start: null, period_end: null }) });
    expect(screen.getByText('Project')).toBeDefined();
    expect(screen.getByText('No fixed period')).toBeDefined();
  });
});

describe('BudgetCard rename', () => {
  it('switches to an editable name field when the rename button is clicked', () => {
    setup();
    fireEvent.click(screen.getByRole('button', { name: /rename/i }));
    expect(screen.getByDisplayValue('January 2026')).toBeDefined();
  });

  it('calls updateBudget and onUpdated on save', async () => {
    mockUpdateBudget.mockResolvedValueOnce({ ...BUDGET, name: 'Renamed Budget' });
    const { onUpdated } = setup();

    fireEvent.click(screen.getByRole('button', { name: /rename/i }));
    fireEvent.change(screen.getByDisplayValue('January 2026'), {
      target: { value: 'Renamed Budget' },
    });
    fireEvent.click(screen.getByRole('button', { name: /^save$/i }));

    await waitFor(() => expect(mockUpdateBudget).toHaveBeenCalledWith(1, { name: 'Renamed Budget' }));
    await waitFor(() => expect(onUpdated).toHaveBeenCalledWith({ ...BUDGET, name: 'Renamed Budget' }));
  });

  it('does not call updateBudget when the name is unchanged', () => {
    setup();
    fireEvent.click(screen.getByRole('button', { name: /rename/i }));
    fireEvent.click(screen.getByRole('button', { name: /^save$/i }));
    expect(mockUpdateBudget).not.toHaveBeenCalled();
  });

  it('cancels editing without calling updateBudget when Cancel is clicked', () => {
    setup();
    fireEvent.click(screen.getByRole('button', { name: /rename/i }));
    fireEvent.change(screen.getByDisplayValue('January 2026'), { target: { value: 'Discarded' } });
    fireEvent.click(screen.getByRole('button', { name: /^cancel$/i }));

    expect(mockUpdateBudget).not.toHaveBeenCalled();
    expect(screen.getByText('January 2026')).toBeDefined();
  });

  it('shows an error when updateBudget throws', async () => {
    mockUpdateBudget.mockRejectedValueOnce(new ApiError(400, 'Name already taken.'));
    setup();

    fireEvent.click(screen.getByRole('button', { name: /rename/i }));
    fireEvent.change(screen.getByDisplayValue('January 2026'), { target: { value: 'Taken' } });
    fireEvent.click(screen.getByRole('button', { name: /^save$/i }));

    await waitFor(() => expect(screen.getByText('Name already taken.')).toBeDefined());
  });
});

describe('BudgetCard deactivate', () => {
  it('calls deleteBudget and onDeactivated when Deactivate → Yes is confirmed', async () => {
    mockDeleteBudget.mockResolvedValueOnce(undefined);
    const { onDeactivated } = setup();

    fireEvent.click(screen.getByRole('button', { name: /deactivate budget/i }));
    fireEvent.click(screen.getByRole('button', { name: /yes, deactivate/i }));

    await waitFor(() => expect(mockDeleteBudget).toHaveBeenCalledWith(1));
    await waitFor(() => expect(onDeactivated).toHaveBeenCalledWith(1));
  });

  it('does not deactivate when Cancel is clicked', () => {
    setup();
    fireEvent.click(screen.getByRole('button', { name: /deactivate budget/i }));
    fireEvent.click(screen.getByRole('button', { name: /^cancel$/i }));

    expect(mockDeleteBudget).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: /deactivate budget/i })).toBeDefined();
  });

  it('shows an error when deleteBudget throws', async () => {
    mockDeleteBudget.mockRejectedValueOnce(
      new ApiError(403, 'You are not a member of this household.'),
    );
    setup();

    fireEvent.click(screen.getByRole('button', { name: /deactivate budget/i }));
    fireEvent.click(screen.getByRole('button', { name: /yes, deactivate/i }));

    await waitFor(() =>
      expect(screen.getByText('You are not a member of this household.')).toBeDefined(),
    );
  });
});
