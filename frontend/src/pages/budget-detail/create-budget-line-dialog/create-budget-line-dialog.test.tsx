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
    queryClient,
    rerender: (nextUi: React.ReactElement) =>
      result.rerender(<QueryClientProvider client={queryClient}>{nextUi}</QueryClientProvider>),
  };
}

function setup(overrides: Partial<React.ComponentProps<typeof CreateBudgetLineDialog>> = {}) {
  const onClose = vi.fn();
  const onCreate = vi.fn();
  const { queryClient } = render(
    <CreateBudgetLineDialog
      open
      budgetId={9}
      householdId={1}
      categoryType="spending"
      onClose={onClose}
      onCreate={onCreate}
      {...overrides}
    />,
  );
  return { onClose, onCreate, queryClient };
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(categoriesService, 'listCategories').mockResolvedValue(CATEGORIES);
});

describe('CreateBudgetLineDialog category fetch state', () => {
  it('shows a loading state instead of an empty picker while categories load', () => {
    let resolveCategories!: (value: typeof CATEGORIES) => void;
    vi.spyOn(categoriesService, 'listCategories').mockReturnValue(
      new Promise(resolve => {
        resolveCategories = resolve;
      }),
    );
    setup();

    expect(screen.getByText(/loading categories/i)).toBeDefined();
    expect(screen.queryByRole('combobox', { name: /category/i })).toBeNull();
    expect(screen.getByRole('button', { name: /^add$/i }).hasAttribute('disabled')).toBe(true);

    resolveCategories(CATEGORIES);
  });

  it('shows an error with a retry action instead of an empty picker on failure', async () => {
    const listCategories = vi
      .spyOn(categoriesService, 'listCategories')
      .mockRejectedValueOnce(new Error('boom'))
      .mockResolvedValueOnce(CATEGORIES);
    setup();

    await screen.findByText('Could not load categories.');
    expect(screen.queryByRole('combobox', { name: /category/i })).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: /retry/i }));

    await screen.findByRole('combobox', { name: /category/i });
    expect(listCategories).toHaveBeenCalledTimes(2);
  });
});

describe('CreateBudgetLineDialog rendering', () => {
  it('renders only categories matching categoryType (spending)', async () => {
    setup({ categoryType: 'spending' });
    fireEvent.mouseDown(await screen.findByRole('combobox', { name: /category/i }));
    expect(await screen.findByRole('option', { name: 'Groceries' })).toBeDefined();
    expect(screen.queryByRole('option', { name: 'Salary' })).toBeNull();
  });

  it('renders only categories matching categoryType (earning)', async () => {
    setup({ categoryType: 'earning' });
    fireEvent.mouseDown(await screen.findByRole('combobox', { name: /category/i }));
    expect(await screen.findByRole('option', { name: 'Salary' })).toBeDefined();
    expect(screen.queryByRole('option', { name: 'Groceries' })).toBeNull();
  });

  it('does not offer an inactive category', async () => {
    setup();
    fireEvent.mouseDown(await screen.findByRole('combobox', { name: /category/i }));
    await screen.findByRole('option', { name: 'Groceries' });
    expect(screen.queryByRole('option', { name: 'Old Hobby' })).toBeNull();
  });

  it.each(['earning', 'spending'] as const)(
    'titles the dialog "Add %s category"',
    categoryType => {
      setup({ categoryType });
      expect(screen.getByText(`Add ${categoryType} category`)).toBeDefined();
    },
  );
});

describe('CreateBudgetLineDialog stale/refetching selection', () => {
  // isLoading is only true for the very first fetch — a background
  // refetch of already-cached data (e.g. the 30s staleTime in
  // queries/categories.ts expiring while this dialog sits open) only
  // flips isFetching. Add must stay disabled for that window too, since
  // the in-flight refetch could be about to deactivate the selected
  // category.
  it('disables Add while a background refetch is in flight, even with a category already selected', async () => {
    const { queryClient } = setup();

    fireEvent.mouseDown(await screen.findByRole('combobox', { name: /category/i }));
    fireEvent.click(await screen.findByRole('option', { name: 'Groceries' }));
    fireEvent.change(screen.getByLabelText(/budgeted amount/i), { target: { value: '500' } });
    expect(screen.getByRole('button', { name: /^add$/i }).hasAttribute('disabled')).toBe(false);

    // A deferred promise, not an already-resolved one — otherwise the
    // refetch's start and resolution could land in the same React commit,
    // making the in-between isFetching:true state invisible to the test
    // even though real/slower network latency would show it.
    let resolveRefetch!: (value: typeof CATEGORIES) => void;
    vi.spyOn(categoriesService, 'listCategories').mockReturnValue(
      new Promise(resolve => {
        resolveRefetch = resolve;
      }),
    );

    // Trigger a background refetch of the same query key without
    // unmounting anything — isLoading stays false (data is cached), only
    // isFetching flips true.
    void queryClient.refetchQueries({ queryKey: ['categories', 1] });
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /^add$/i }).hasAttribute('disabled')).toBe(true),
    );

    resolveRefetch(CATEGORIES);
  });

  // The backend doesn't reject an inactive category_id on its own — if the
  // selected category is deactivated by the time a refetch resolves (e.g.
  // someone else in the household deactivated it from
  // CategoryManagementDialog), submitting the stale selection would still
  // reach the API and create a line for a category the picker no longer
  // even offers.
  it('disables Add once the selected category is no longer active after a refetch resolves', async () => {
    const { queryClient } = setup();

    fireEvent.mouseDown(await screen.findByRole('combobox', { name: /category/i }));
    fireEvent.click(await screen.findByRole('option', { name: 'Groceries' }));
    fireEvent.change(screen.getByLabelText(/budgeted amount/i), { target: { value: '500' } });
    expect(screen.getByRole('button', { name: /^add$/i }).hasAttribute('disabled')).toBe(false);

    vi.spyOn(categoriesService, 'listCategories').mockResolvedValue([
      makeCategory({ id: 1, name: 'Groceries', type: 'spending', is_active: false }),
      makeCategory({ id: 2, name: 'Salary', type: 'earning' }),
    ]);
    await queryClient.refetchQueries({ queryKey: ['categories', 1] });

    await waitFor(() =>
      expect(screen.getByRole('button', { name: /^add$/i }).hasAttribute('disabled')).toBe(true),
    );
  });

  // TanStack Query keeps serving the previous successful `data` when a
  // background refetch fails — only `status` (and so isSuccess) flips to
  // reflect the failure, isError sitting alongside stale data rather than
  // replacing it. The picker UI switches to the error+retry Alert in this
  // state, but without gating canCreate on isSuccess specifically, Add
  // stayed enabled against the now-hidden, possibly-stale selection.
  it('disables Add when a background refetch fails, even though stale data and the selection remain', async () => {
    const { queryClient } = setup();

    fireEvent.mouseDown(await screen.findByRole('combobox', { name: /category/i }));
    fireEvent.click(await screen.findByRole('option', { name: 'Groceries' }));
    fireEvent.change(screen.getByLabelText(/budgeted amount/i), { target: { value: '500' } });
    expect(screen.getByRole('button', { name: /^add$/i }).hasAttribute('disabled')).toBe(false);

    vi.spyOn(categoriesService, 'listCategories').mockRejectedValue(new Error('boom'));
    await queryClient.refetchQueries({ queryKey: ['categories', 1] }).catch(() => {});

    await screen.findByText('Could not load categories.');
    expect(screen.getByRole('button', { name: /^add$/i }).hasAttribute('disabled')).toBe(true);
  });
});

describe('CreateBudgetLineDialog validation', () => {
  it('disables Add until a category and a valid amount are both set', async () => {
    setup();
    expect(screen.getByRole('button', { name: /^add$/i }).hasAttribute('disabled')).toBe(true);

    fireEvent.mouseDown(await screen.findByRole('combobox', { name: /category/i }));
    fireEvent.click(await screen.findByRole('option', { name: 'Groceries' }));
    expect(screen.getByRole('button', { name: /^add$/i }).hasAttribute('disabled')).toBe(true);

    fireEvent.change(screen.getByLabelText(/budgeted amount/i), { target: { value: '500' } });
    expect(screen.getByRole('button', { name: /^add$/i }).hasAttribute('disabled')).toBe(false);
  });

  it('keeps Add disabled for a negative amount', async () => {
    setup();
    fireEvent.mouseDown(await screen.findByRole('combobox', { name: /category/i }));
    fireEvent.click(await screen.findByRole('option', { name: 'Groceries' }));
    fireEvent.change(screen.getByLabelText(/budgeted amount/i), { target: { value: '-5' } });

    expect(screen.getByRole('button', { name: /^add$/i }).hasAttribute('disabled')).toBe(true);
  });

  it('keeps Add disabled for a non-integer amount', async () => {
    setup();
    fireEvent.mouseDown(await screen.findByRole('combobox', { name: /category/i }));
    fireEvent.click(await screen.findByRole('option', { name: 'Groceries' }));
    fireEvent.change(screen.getByLabelText(/budgeted amount/i), { target: { value: '49.99' } });

    expect(screen.getByRole('button', { name: /^add$/i }).hasAttribute('disabled')).toBe(true);
  });

  // Number(amount) (the previous check) happily parses all of these as a
  // valid non-negative integer — exponential notation, hex/octal/binary
  // literals, a leading "+", Infinity — none of which is "a whole-dollar
  // amount" a household would actually mean. amount is a plain string this
  // component doesn't otherwise constrain (fireEvent.change, a paste, or a
  // future non-native input could all set it to any of these), so the
  // validation regex is what must reject them, not the native number
  // input's own keystroke filtering.
  it.each(['1e3', '0x10', '0b101', '0o17', '+500', 'Infinity'])(
    'keeps Add disabled for %s, which Number() parses but is not a plain digit string',
    async value => {
      setup();
      fireEvent.mouseDown(await screen.findByRole('combobox', { name: /category/i }));
      fireEvent.click(await screen.findByRole('option', { name: 'Groceries' }));
      fireEvent.change(screen.getByLabelText(/budgeted amount/i), { target: { value } });

      expect(screen.getByRole('button', { name: /^add$/i }).hasAttribute('disabled')).toBe(true);
    },
  );

  it('keeps Add disabled for a digit string too large to represent exactly', async () => {
    setup();
    fireEvent.mouseDown(await screen.findByRole('combobox', { name: /category/i }));
    fireEvent.click(await screen.findByRole('option', { name: 'Groceries' }));
    fireEvent.change(screen.getByLabelText(/budgeted amount/i), {
      target: { value: '99999999999999999999' },
    });

    expect(screen.getByRole('button', { name: /^add$/i }).hasAttribute('disabled')).toBe(true);
  });

  it('allows a plain whole-dollar amount with leading zeros', async () => {
    setup();
    fireEvent.mouseDown(await screen.findByRole('combobox', { name: /category/i }));
    fireEvent.click(await screen.findByRole('option', { name: 'Groceries' }));
    fireEvent.change(screen.getByLabelText(/budgeted amount/i), { target: { value: '0050' } });

    expect(screen.getByRole('button', { name: /^add$/i }).hasAttribute('disabled')).toBe(false);
  });
});

describe('CreateBudgetLineDialog create flow', () => {
  async function fillAndSubmit(categoryName: string, amount: string) {
    fireEvent.mouseDown(await screen.findByRole('combobox', { name: /category/i }));
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
      <CreateBudgetLineDialog open budgetId={9} householdId={1} categoryType="spending" onClose={vi.fn()} onCreate={vi.fn()} />,
    );

    fireEvent.change(screen.getByLabelText(/budgeted amount/i), { target: { value: '500' } });
    expect((screen.getByLabelText(/budgeted amount/i) as HTMLInputElement).value).toBe('500');

    rerender(
      <CreateBudgetLineDialog open={false} budgetId={9} householdId={1} categoryType="spending" onClose={vi.fn()} onCreate={vi.fn()} />,
    );
    rerender(
      <CreateBudgetLineDialog open budgetId={9} householdId={1} categoryType="spending" onClose={vi.fn()} onCreate={vi.fn()} />,
    );

    expect((screen.getByLabelText(/budgeted amount/i) as HTMLInputElement).value).toBe('');
  });

  // Regresses to a bug where the effect only depended on `open` — if the
  // route moved to a different budget (or the active household changed)
  // while this dialog stayed mounted and open, a half-filled selection
  // from the old scope would stick around and could be submitted against
  // the new budgetId/householdId.
  it('resets the form when budgetId changes while the dialog stays open', () => {
    const { rerender } = render(
      <CreateBudgetLineDialog open budgetId={9} householdId={1} categoryType="spending" onClose={vi.fn()} onCreate={vi.fn()} />,
    );

    fireEvent.change(screen.getByLabelText(/budgeted amount/i), { target: { value: '500' } });
    expect((screen.getByLabelText(/budgeted amount/i) as HTMLInputElement).value).toBe('500');

    rerender(
      <CreateBudgetLineDialog open budgetId={10} householdId={1} categoryType="spending" onClose={vi.fn()} onCreate={vi.fn()} />,
    );

    expect((screen.getByLabelText(/budgeted amount/i) as HTMLInputElement).value).toBe('');
  });

  it('resets the form when householdId changes while the dialog stays open', () => {
    const { rerender } = render(
      <CreateBudgetLineDialog open budgetId={9} householdId={1} categoryType="spending" onClose={vi.fn()} onCreate={vi.fn()} />,
    );

    fireEvent.change(screen.getByLabelText(/budgeted amount/i), { target: { value: '500' } });
    expect((screen.getByLabelText(/budgeted amount/i) as HTMLInputElement).value).toBe('500');

    rerender(
      <CreateBudgetLineDialog open budgetId={9} householdId={2} categoryType="spending" onClose={vi.fn()} onCreate={vi.fn()} />,
    );

    expect((screen.getByLabelText(/budgeted amount/i) as HTMLInputElement).value).toBe('');
  });

  // Each column's own "Add X category" button opens this same dialog
  // instance with a different categoryType — a half-filled selection from
  // the Earnings button shouldn't carry over if, for whatever reason, the
  // dialog were re-opened for Spending instead without an intervening
  // close/open of `open` itself.
  it('resets the form when categoryType changes while the dialog stays open', () => {
    const { rerender } = render(
      <CreateBudgetLineDialog open budgetId={9} householdId={1} categoryType="spending" onClose={vi.fn()} onCreate={vi.fn()} />,
    );

    fireEvent.change(screen.getByLabelText(/budgeted amount/i), { target: { value: '500' } });
    expect((screen.getByLabelText(/budgeted amount/i) as HTMLInputElement).value).toBe('500');

    rerender(
      <CreateBudgetLineDialog open budgetId={9} householdId={1} categoryType="earning" onClose={vi.fn()} onCreate={vi.fn()} />,
    );

    expect((screen.getByLabelText(/budgeted amount/i) as HTMLInputElement).value).toBe('');
  });
});
