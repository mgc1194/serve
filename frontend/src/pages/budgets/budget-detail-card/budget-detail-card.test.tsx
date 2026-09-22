// pages/budgets/budget-detail-card/budget-detail-card.test.tsx

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { BudgetDetailCard } from '@pages/budgets/budget-detail-card';
import { makeBudget } from '@serve/mocks';
import { deleteBudget, listBudgetLines, updateBudget, ApiError } from '@services/budgets';
import { listCategories } from '@services/categories';

vi.mock('@services/budgets', async importOriginal => {
  const actual = await importOriginal<typeof import('@services/budgets')>();
  return {
    ...actual,
    listBudgetLines: vi.fn(),
    updateBudget: vi.fn(),
    deleteBudget: vi.fn(),
  };
});
vi.mock('@services/categories', async importOriginal => {
  const actual = await importOriginal<typeof import('@services/categories')>();
  return { ...actual, listCategories: vi.fn() };
});

const mockListBudgetLines = vi.mocked(listBudgetLines);
const mockUpdateBudget = vi.mocked(updateBudget);
const mockDeleteBudget = vi.mocked(deleteBudget);
const mockListCategories = vi.mocked(listCategories);

const BUDGET = makeBudget({ id: 1, name: 'January Budget', type: 'spending' });

function setup(overrides: Partial<React.ComponentProps<typeof BudgetDetailCard>> = {}) {
  const onUpdated = vi.fn();
  const onDeleted = vi.fn();
  render(
    <BudgetDetailCard
      budget={BUDGET}
      onUpdated={onUpdated}
      onDeleted={onDeleted}
      {...overrides}
    />,
  );
  return { onUpdated, onDeleted };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockListBudgetLines.mockResolvedValue([]);
  mockListCategories.mockResolvedValue([]);
});

describe('BudgetDetailCard rendering', () => {
  it('renders the budget name and type', async () => {
    setup();
    expect(screen.getByText('January Budget')).toBeDefined();
    expect(screen.getByText('Spending')).toBeDefined();
    await waitFor(() => expect(mockListBudgetLines).toHaveBeenCalledWith(1));
  });

  it('renders the period range for a spending budget', async () => {
    setup();
    expect(screen.getByText('2026-01-01 – 2026-01-31')).toBeDefined();
    await waitFor(() => expect(mockListBudgetLines).toHaveBeenCalled());
  });

  it('renders "No fixed period" for a project budget', async () => {
    setup({
      budget: makeBudget({ id: 2, name: 'Trip', type: 'project', period_start: null, period_end: null }),
    });
    expect(screen.getByText('No fixed period')).toBeDefined();
    await waitFor(() => expect(mockListBudgetLines).toHaveBeenCalled());
  });
});

describe('BudgetDetailCard rename', () => {
  it('switches to an editable name field when the rename button is clicked', async () => {
    setup();
    fireEvent.click(screen.getByRole('button', { name: /rename/i }));
    expect(screen.getByDisplayValue('January Budget')).toBeDefined();
    await waitFor(() => expect(mockListBudgetLines).toHaveBeenCalled());
  });

  it('calls updateBudget and onUpdated on save', async () => {
    mockUpdateBudget.mockResolvedValueOnce({ ...BUDGET, name: 'Renamed Budget' });
    const { onUpdated } = setup();

    fireEvent.click(screen.getByRole('button', { name: /rename/i }));
    fireEvent.change(screen.getByDisplayValue('January Budget'), {
      target: { value: 'Renamed Budget' },
    });
    fireEvent.click(screen.getByRole('button', { name: /^save$/i }));

    await waitFor(() => expect(mockUpdateBudget).toHaveBeenCalledWith(1, { name: 'Renamed Budget' }));
    await waitFor(() => expect(onUpdated).toHaveBeenCalledWith({ ...BUDGET, name: 'Renamed Budget' }));
  });

  it('shows an error when updateBudget throws', async () => {
    mockUpdateBudget.mockRejectedValueOnce(new ApiError(400, 'Name already taken.'));
    setup();

    fireEvent.click(screen.getByRole('button', { name: /rename/i }));
    fireEvent.change(screen.getByDisplayValue('January Budget'), {
      target: { value: 'Taken' },
    });
    fireEvent.click(screen.getByRole('button', { name: /^save$/i }));

    await waitFor(() => expect(screen.getByText('Name already taken.')).toBeDefined());
  });
});

describe('BudgetDetailCard deactivate', () => {
  it('calls deleteBudget and onDeleted when Deactivate → Yes is confirmed', async () => {
    mockDeleteBudget.mockResolvedValueOnce(undefined);
    const { onDeleted } = setup();

    fireEvent.click(screen.getByRole('button', { name: /deactivate budget/i }));
    fireEvent.click(screen.getByRole('button', { name: /yes, deactivate/i }));

    await waitFor(() => expect(mockDeleteBudget).toHaveBeenCalledWith(1));
    await waitFor(() => expect(onDeleted).toHaveBeenCalledWith(1));
  });

  it('does not deactivate when Cancel is clicked', async () => {
    setup();
    fireEvent.click(screen.getByRole('button', { name: /deactivate budget/i }));
    fireEvent.click(screen.getByRole('button', { name: /^cancel$/i }));

    expect(mockDeleteBudget).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: /deactivate budget/i })).toBeDefined();
    await waitFor(() => expect(mockListBudgetLines).toHaveBeenCalled());
  });
});
