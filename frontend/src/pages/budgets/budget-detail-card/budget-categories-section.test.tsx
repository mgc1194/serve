// pages/budgets/budget-detail-card/budget-categories-section.test.tsx

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { BudgetCategoriesSection } from '@pages/budgets/budget-detail-card/budget-categories-section';
import { makeBudgetLine, makeCategory } from '@serve/mocks';
import { createBudgetLine, deleteBudgetLine, ApiError } from '@services/budgets';
import { listCategories } from '@services/categories';

vi.mock('@services/budgets', async importOriginal => {
  const actual = await importOriginal<typeof import('@services/budgets')>();
  return { ...actual, createBudgetLine: vi.fn(), deleteBudgetLine: vi.fn() };
});
vi.mock('@services/categories', async importOriginal => {
  const actual = await importOriginal<typeof import('@services/categories')>();
  return { ...actual, listCategories: vi.fn() };
});

const mockCreateBudgetLine = vi.mocked(createBudgetLine);
const mockDeleteBudgetLine = vi.mocked(deleteBudgetLine);
const mockListCategories = vi.mocked(listCategories);

const CATEGORIES = [
  makeCategory({ id: 1, name: 'Groceries' }),
  makeCategory({ id: 2, name: 'Utilities' }),
];

function setup(overrides: Partial<React.ComponentProps<typeof BudgetCategoriesSection>> = {}) {
  const onLinesChanged = vi.fn();
  render(
    <BudgetCategoriesSection
      budgetId={1}
      householdId={1}
      lines={[]}
      onLinesChanged={onLinesChanged}
      {...overrides}
    />,
  );
  return { onLinesChanged };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockListCategories.mockResolvedValue(CATEGORIES);
});

describe('BudgetCategoriesSection rendering', () => {
  it('shows an empty message when the budget has no lines', async () => {
    setup();
    expect(screen.getByText(/no categories yet/i)).toBeDefined();
    await waitFor(() => expect(mockListCategories).toHaveBeenCalled());
  });

  it('renders a chip per line', async () => {
    setup({
      lines: [
        makeBudgetLine({ id: 1, category_id: 1, category_name: 'Groceries' }),
        makeBudgetLine({ id: 2, category_id: 2, category_name: 'Utilities' }),
      ],
    });
    expect(screen.getByText('Groceries')).toBeDefined();
    expect(screen.getByText('Utilities')).toBeDefined();
    await waitFor(() => expect(mockListCategories).toHaveBeenCalled());
  });

  it('renders the Add a category input', async () => {
    setup();
    expect(screen.getByLabelText(/add a category/i)).toBeDefined();
    await waitFor(() => expect(mockListCategories).toHaveBeenCalled());
  });
});

describe('BudgetCategoriesSection interactions', () => {
  it('excludes already-added categories from the Add a category options', async () => {
    setup({ lines: [makeBudgetLine({ id: 1, category_id: 1, category_name: 'Groceries' })] });
    await waitFor(() => expect(mockListCategories).toHaveBeenCalledWith(1));

    fireEvent.mouseDown(screen.getByLabelText(/add a category/i));
    expect(screen.queryByRole('option', { name: 'Groceries' })).toBeNull();
    expect(await screen.findByRole('option', { name: 'Utilities' })).toBeDefined();
  });

  it('calls createBudgetLine and onLinesChanged when a category is picked', async () => {
    const created = makeBudgetLine({ id: 5, category_id: 2, category_name: 'Utilities' });
    mockCreateBudgetLine.mockResolvedValueOnce(created);
    const { onLinesChanged } = setup();
    await waitFor(() => expect(mockListCategories).toHaveBeenCalled());

    fireEvent.mouseDown(screen.getByLabelText(/add a category/i));
    fireEvent.click(await screen.findByRole('option', { name: 'Utilities' }));

    await waitFor(() => expect(mockCreateBudgetLine).toHaveBeenCalledWith(1, { category_id: 2 }));
    expect(onLinesChanged).toHaveBeenCalledWith([created]);
  });

  it('calls deleteBudgetLine and onLinesChanged when a chip is removed', async () => {
    mockDeleteBudgetLine.mockResolvedValueOnce(undefined);
    const line = makeBudgetLine({ id: 1, category_id: 1, category_name: 'Groceries' });
    const { onLinesChanged } = setup({ lines: [line] });

    fireEvent.click(screen.getByTestId('CancelIcon'));

    await waitFor(() => expect(mockDeleteBudgetLine).toHaveBeenCalledWith(1));
    expect(onLinesChanged).toHaveBeenCalledWith([]);
  });

  it('shows an error message when createBudgetLine throws', async () => {
    mockCreateBudgetLine.mockRejectedValueOnce(
      new ApiError(400, '"Utilities" is already part of this budget.'),
    );
    setup();
    await waitFor(() => expect(mockListCategories).toHaveBeenCalled());

    fireEvent.mouseDown(screen.getByLabelText(/add a category/i));
    fireEvent.click(await screen.findByRole('option', { name: 'Utilities' }));

    await waitFor(() => expect(screen.getByText(/already part of this budget/i)).toBeDefined());
  });
});
