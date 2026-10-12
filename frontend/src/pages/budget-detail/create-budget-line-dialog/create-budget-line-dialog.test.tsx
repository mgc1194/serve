// pages/budget-detail/create-budget-line-dialog/create-budget-line-dialog.test.tsx

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render as rtlRender, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { CreateBudgetLineDialog } from '@pages/budget-detail/create-budget-line-dialog';
import { makeBudgetLine, makeCategory } from '@serve/mocks';
import { createBudgetLine, ApiError } from '@services/budgets';
import * as categoriesService from '@services/categories';

vi.mock('@services/budgets', async importOriginal => {
  const actual = await importOriginal<typeof import('@services/budgets')>();
  return { ...actual, createBudgetLine: vi.fn() };
});

const mockCreateBudgetLine = vi.mocked(createBudgetLine);

const CATEGORIES = [
  makeCategory({ id: 1, name: 'Groceries', type: 'spending' }),
  makeCategory({ id: 2, name: 'Salary', type: 'earning' }),
  makeCategory({ id: 3, name: 'Old Hobby', type: 'spending', is_active: false }),
];

// Needs its own QueryClient (the dialog reads categories via useCategories)
// — rerender re-wraps with the SAME client instance so a prop change (e.g.
// open toggling) behaves like it would under the app's one long-lived client.
function render(ui: React.ReactElement) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const result = rtlRender(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
  return {
    ...result,
    rerender: (nextUi: React.ReactElement) =>
      result.rerender(<QueryClientProvider client={queryClient}>{nextUi}</QueryClientProvider>),
  };
}

function setup(overrides: Partial<React.ComponentProps<typeof CreateBudgetLineDialog>> = {}) {
  const onClose = vi.fn();
  const onCreate = vi.fn();
  render(
    <CreateBudgetLineDialog
      open
      budgetId={9}
      householdId={1}
      onClose={onClose}
      onCreate={onCreate}
      {...overrides}
    />,
  );
  return { onClose, onCreate };
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(categoriesService, 'listCategories').mockResolvedValue(CATEGORIES);
});

describe('CreateBudgetLineDialog rendering', () => {
  it('renders the active categories as options', async () => {
    setup();
    fireEvent.mouseDown(screen.getByRole('combobox', { name: /category/i }));
    expect(await screen.findByRole('option', { name: 'Groceries' })).toBeDefined();
    expect(screen.getByRole('option', { name: 'Salary' })).toBeDefined();
  });

  it('does not offer an inactive category', async () => {
    setup();
    fireEvent.mouseDown(screen.getByRole('combobox', { name: /category/i }));
    await screen.findByRole('option', { name: 'Groceries' });
    expect(screen.queryByRole('option', { name: 'Old Hobby' })).toBeNull();
  });
});

describe('CreateBudgetLineDialog validation', () => {
  it('disables Add until a category and a valid amount are both set', async () => {
    setup();
    expect(screen.getByRole('button', { name: /^add$/i }).hasAttribute('disabled')).toBe(true);

    fireEvent.mouseDown(screen.getByRole('combobox', { name: /category/i }));
    fireEvent.click(await screen.findByRole('option', { name: 'Groceries' }));
    expect(screen.getByRole('button', { name: /^add$/i }).hasAttribute('disabled')).toBe(true);

    fireEvent.change(screen.getByLabelText(/budgeted amount/i), { target: { value: '500' } });
    expect(screen.getByRole('button', { name: /^add$/i }).hasAttribute('disabled')).toBe(false);
  });

  it('keeps Add disabled for a negative amount', async () => {
    setup();
    fireEvent.mouseDown(screen.getByRole('combobox', { name: /category/i }));
    fireEvent.click(await screen.findByRole('option', { name: 'Groceries' }));
    fireEvent.change(screen.getByLabelText(/budgeted amount/i), { target: { value: '-5' } });

    expect(screen.getByRole('button', { name: /^add$/i }).hasAttribute('disabled')).toBe(true);
  });

  it('keeps Add disabled for a non-integer amount', async () => {
    setup();
    fireEvent.mouseDown(screen.getByRole('combobox', { name: /category/i }));
    fireEvent.click(await screen.findByRole('option', { name: 'Groceries' }));
    fireEvent.change(screen.getByLabelText(/budgeted amount/i), { target: { value: '49.99' } });

    expect(screen.getByRole('button', { name: /^add$/i }).hasAttribute('disabled')).toBe(true);
  });
});

describe('CreateBudgetLineDialog create flow', () => {
  async function fillAndSubmit(categoryName: string, amount: string) {
    fireEvent.mouseDown(screen.getByRole('combobox', { name: /category/i }));
    fireEvent.click(await screen.findByRole('option', { name: categoryName }));
    fireEvent.change(screen.getByLabelText(/budgeted amount/i), { target: { value: amount } });
    await userEvent.click(screen.getByRole('button', { name: /^add$/i }));
  }

  it('calls createBudgetLine with the picked category and amount', async () => {
    mockCreateBudgetLine.mockResolvedValueOnce(makeBudgetLine());
    setup();

    await fillAndSubmit('Groceries', '500');

    await waitFor(() =>
      expect(mockCreateBudgetLine).toHaveBeenCalledWith(9, { category_id: 1, planned_amount: 500 }),
    );
  });

  it('calls onCreate and onClose on success', async () => {
    const created = makeBudgetLine({ category_name: 'Groceries' });
    mockCreateBudgetLine.mockResolvedValueOnce(created);
    const { onCreate, onClose } = setup();

    await fillAndSubmit('Groceries', '500');

    await waitFor(() => expect(onCreate).toHaveBeenCalledWith(created));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('shows the backend error on a duplicate category without closing', async () => {
    mockCreateBudgetLine.mockRejectedValueOnce(
      new ApiError(400, '"Groceries" is already part of this budget.'),
    );
    const { onClose } = setup();

    await fillAndSubmit('Groceries', '500');

    await screen.findByText('"Groceries" is already part of this budget.');
    expect(onClose).not.toHaveBeenCalled();
  });

  it('shows a fallback error message for a non-ApiError failure', async () => {
    mockCreateBudgetLine.mockRejectedValueOnce(new Error('network down'));
    setup();

    await fillAndSubmit('Groceries', '500');

    await screen.findByText('Could not add category.');
  });
});

describe('CreateBudgetLineDialog form reset', () => {
  it('resets the form each time the dialog re-opens', () => {
    const { rerender } = render(
      <CreateBudgetLineDialog open budgetId={9} householdId={1} onClose={vi.fn()} onCreate={vi.fn()} />,
    );

    fireEvent.change(screen.getByLabelText(/budgeted amount/i), { target: { value: '500' } });
    expect((screen.getByLabelText(/budgeted amount/i) as HTMLInputElement).value).toBe('500');

    rerender(
      <CreateBudgetLineDialog open={false} budgetId={9} householdId={1} onClose={vi.fn()} onCreate={vi.fn()} />,
    );
    rerender(
      <CreateBudgetLineDialog open budgetId={9} householdId={1} onClose={vi.fn()} onCreate={vi.fn()} />,
    );

    expect((screen.getByLabelText(/budgeted amount/i) as HTMLInputElement).value).toBe('');
  });
});
