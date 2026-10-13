// pages/budget-detail/budget-detail.test.tsx

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, fireEvent, render as rtlRender, screen, waitFor, within } from '@testing-library/react';
import { Link, MemoryRouter, Route, Routes } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ActiveHouseholdProvider } from '@context/active-household-context';
import { BudgetDetailPage } from '@pages/budget-detail';
import { makeBudget, makeBudgetLine } from '@serve/mocks';
import type { Budget } from '@serve/types/global';
import * as budgetsService from '@services/budgets';
import * as categoriesService from '@services/categories';

// Needs its own QueryClient — the page renders CreateBudgetLineDialog,
// which reads categories via useCategories even while closed.
function render(ui: React.ReactElement) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return rtlRender(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

vi.mock('@context/auth-context', () => ({
  useAuth: () => ({
    user: {
      id: 1,
      email: 'test@example.com',
      first_name: 'Test',
      last_name: 'User',
      username: 'test',
      households: [{ id: 1, name: 'Test Household' }],
    },
    setUser: vi.fn(),
  }),
}));
vi.mock('@layout/app-header', () => ({ AppHeader: () => <header /> }));

const BUDGET = makeBudget({ id: 9, name: 'Monthly Budget' });

function renderPage(id = '9') {
  return render(
    <MemoryRouter initialEntries={[`/budgets/${id}`]}>
      <ActiveHouseholdProvider>
        <Routes>
          <Route path="/budgets/:id" element={<BudgetDetailPage />} />
        </Routes>
      </ActiveHouseholdProvider>
    </MemoryRouter>,
  );
}

// Same route element, different :id — React Router keeps BudgetDetailPage
// mounted and just re-renders it with a new useParams() value, exactly the
// "route moved to a different budget while this page (and anything open on
// it) stayed mounted" scenario a plain renderPage() can't exercise.
function renderPageWithNav(id = '9') {
  return render(
    <MemoryRouter initialEntries={[`/budgets/${id}`]}>
      <ActiveHouseholdProvider>
        <Link to="/budgets/9">Go to budget 9</Link>
        <Link to="/budgets/10">Go to budget 10</Link>
        <Routes>
          <Route path="/budgets/:id" element={<BudgetDetailPage />} />
        </Routes>
      </ActiveHouseholdProvider>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(budgetsService, 'listBudgets').mockResolvedValue([BUDGET]);
  vi.spyOn(budgetsService, 'listBudgetLines').mockResolvedValue([]);
  vi.spyOn(categoriesService, 'listCategories').mockResolvedValue([]);
});

describe('BudgetDetailPage rendering', () => {
  it('renders the budget name', async () => {
    renderPage();
    await screen.findByText('Monthly Budget');
  });

  it("shows the budget's period range", async () => {
    renderPage();
    await screen.findByText('Monthly Budget');
    expect(screen.getByText('Jan 1, 2026 – Jan 31, 2026')).toBeDefined();
  });

  it('shows "No fixed period" for a project budget', async () => {
    vi.spyOn(budgetsService, 'listBudgets').mockResolvedValue([
      makeBudget({ id: 9, name: 'Iceland Trip', type: 'project', period_start: null, period_end: null }),
    ]);
    renderPage();
    await screen.findByText('Iceland Trip');
    expect(screen.getByText('No fixed period')).toBeDefined();
  });

  it('shows "Budget not found." when no budget matches the id', async () => {
    renderPage('999');
    await screen.findByText('Budget not found.');
  });

  it('shows an error message with a retry button on failure', async () => {
    vi.spyOn(budgetsService, 'listBudgets').mockRejectedValueOnce(new Error('boom'));
    renderPage();
    await screen.findByText('Could not load budget.');
    expect(screen.getByRole('button', { name: /retry/i })).toBeDefined();
  });

  it('retries successfully after an initial failure', async () => {
    const listBudgets = vi
      .spyOn(budgetsService, 'listBudgets')
      .mockRejectedValueOnce(new Error('boom'))
      .mockResolvedValueOnce([BUDGET]);

    renderPage();
    await screen.findByText('Could not load budget.');
    fireEvent.click(screen.getByRole('button', { name: /retry/i }));

    await screen.findByText('Monthly Budget');
    expect(listBudgets).toHaveBeenCalledTimes(2);
  });

  it('does not let an earlier retry resolving late clear the loading state for a newer retry', async () => {
    const firstRetry = deferred<Budget[]>();
    const secondRetry = deferred<Budget[]>();
    vi.spyOn(budgetsService, 'listBudgets')
      .mockRejectedValueOnce(new Error('boom'))
      .mockReturnValueOnce(firstRetry.promise)
      .mockReturnValueOnce(secondRetry.promise);

    renderPage();
    await screen.findByText('Could not load budget.');

    const retryButton = screen.getByRole('button', { name: /retry/i });
    // Both retries fire before either settles, so requestIdRef is bumped
    // twice back to back — exactly the "retry clicked again before the
    // first attempt settles" scenario.
    act(() => {
      fireEvent.click(retryButton);
      fireEvent.click(retryButton);
    });

    // The earlier (now-superseded) retry resolves first. Its data is
    // already correctly skipped by the requestId guard in .then — the bug
    // this test targets is specifically that .finally used to clear
    // isLoading unconditionally, which (with budget/error both still
    // unset, since .then bailed) would fall through to this page's blank
    // null render instead of leaving "Loading budget…" up for the
    // still-pending newer retry.
    firstRetry.resolve([makeBudget({ id: 404, name: 'Stale Budget' })]);
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(screen.queryByText('Stale Budget')).toBeNull();
    expect(screen.getByText('Loading budget…')).toBeDefined();

    // The newer retry resolves — its data applies.
    secondRetry.resolve([BUDGET]);
    await screen.findByText('Monthly Budget');
  });
});

describe('BudgetDetailPage net this month placeholder', () => {
  // No real figure yet — wiring the actual net (sourced from the budget's
  // lines) is deferred to a follow-up PR. This just confirms the section
  // itself is present.
  it('shows the placeholder net section', async () => {
    renderPage();
    await screen.findByText('Monthly Budget');
    expect(screen.getByText('Net this month: —')).toBeDefined();
  });
});

describe('BudgetDetailPage add category', () => {
  it('opens CreateBudgetLineDialog scoped to earning when "Add earning category" is clicked', async () => {
    renderPage();
    await screen.findByText('Monthly Budget');

    fireEvent.click(screen.getByRole('button', { name: /add earning category/i }));

    expect(await screen.findByText('Add earning category', { selector: 'h2' })).toBeDefined();
  });

  it('opens CreateBudgetLineDialog scoped to spending when "Add spending category" is clicked', async () => {
    renderPage();
    await screen.findByText('Monthly Budget');

    fireEvent.click(screen.getByRole('button', { name: /add spending category/i }));

    expect(await screen.findByText('Add spending category', { selector: 'h2' })).toBeDefined();
  });

  it('closes the dialog on Cancel without creating a line', async () => {
    renderPage();
    await screen.findByText('Monthly Budget');

    fireEvent.click(screen.getByRole('button', { name: /add earning category/i }));
    await screen.findByText('Add earning category', { selector: 'h2' });

    fireEvent.click(screen.getByRole('button', { name: /^cancel$/i }));

    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    // Both columns (Earnings and Spending) show the empty state.
    expect(screen.getAllByText('No categories yet.')).toHaveLength(2);
  });

  // Regresses to a bug where `budget` (and the dialog's open state) stayed
  // set to the OLD budget for the entire duration of the new fetch when
  // the route moved to a different budget id while this dialog was open —
  // a submit in that window could create a line on the wrong budget, and
  // the dialog could reappear open once the new budget loaded, since
  // lineDialogType was never reset either.
  it('closes the dialog immediately when the route moves to a different budget, before the new budget loads', async () => {
    const budget10 = deferred<Budget[]>();
    vi.spyOn(budgetsService, 'listBudgets')
      .mockResolvedValueOnce([BUDGET])
      .mockReturnValueOnce(budget10.promise);

    renderPageWithNav();
    await screen.findByText('Monthly Budget');

    fireEvent.click(screen.getByRole('button', { name: /add earning category/i }));
    await screen.findByText('Add earning category', { selector: 'h2' });

    // { hidden: true } — the open MUI Dialog marks the rest of the page
    // aria-hidden, which getByRole otherwise filters out by default.
    fireEvent.click(screen.getByRole('link', { name: /go to budget 10/i, hidden: true }));

    // The dialog is gone immediately — before budget 10's fetch has even
    // resolved — rather than staying open against the stale budget 9.
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(screen.getByText('Loading budget…')).toBeDefined();

    budget10.resolve([makeBudget({ id: 10, name: 'Vacation Fund' })]);

    // The new budget loads, and the dialog does NOT reappear open.
    await screen.findByText('Vacation Fund');
    expect(screen.queryByRole('dialog')).toBeNull();
  });
});

describe('BudgetDetailPage budget lines', () => {
  it('splits fetched lines into Earnings and Spending columns', async () => {
    vi.spyOn(budgetsService, 'listBudgetLines').mockResolvedValue([
      makeBudgetLine({ id: 1, category_name: 'Paycheck', category_type: 'earning' }),
      makeBudgetLine({ id: 2, category_name: 'Groceries', category_type: 'spending' }),
    ]);
    renderPage();
    await screen.findByText('Monthly Budget');

    // Each BudgetColumn's title Typography and its table/empty-message are
    // direct siblings under the same root Box, so the heading's own
    // parentElement is exactly that column's container — scoping on it
    // (rather than just checking document order, which both columns being
    // on the same page would satisfy even if a line landed in the wrong
    // one) actually verifies which column each line is inside of.
    const earningsColumn = within((await screen.findByText('Earnings')).parentElement!);
    const spendingColumn = within(screen.getByText('Spending').parentElement!);

    expect(earningsColumn.getByText('Paycheck')).toBeDefined();
    expect(earningsColumn.queryByText('Groceries')).toBeNull();
    expect(spendingColumn.getByText('Groceries')).toBeDefined();
    expect(spendingColumn.queryByText('Paycheck')).toBeNull();
  });

  it('shows a loading state while lines are being fetched', async () => {
    const linesPromise = deferred<ReturnType<typeof makeBudgetLine>[]>();
    vi.spyOn(budgetsService, 'listBudgetLines').mockReturnValue(linesPromise.promise);
    renderPage();
    await screen.findByText('Monthly Budget');

    await waitFor(() => expect(screen.getByText('Loading categories…')).toBeDefined());

    linesPromise.resolve([]);
    await waitFor(() => expect(screen.queryByText('Loading categories…')).toBeNull());
  });

  // Regresses to a bug where "Add category" stayed enabled while the
  // initial listBudgetLines GET was still in flight. Creating a line in
  // that window appended it locally (onCreate), but the older GET then
  // resolved afterward and setLines(result) overwrote that with its
  // pre-create snapshot — the new line vanished even though it existed on
  // the backend. Disabling the trigger while that fetch is in flight
  // removes the race entirely, rather than reconciling the two results.
  it('hides both "Add" buttons while the initial lines fetch is in flight', async () => {
    const linesPromise = deferred<ReturnType<typeof makeBudgetLine>[]>();
    vi.spyOn(budgetsService, 'listBudgetLines').mockReturnValue(linesPromise.promise);
    renderPage();
    await screen.findByText('Monthly Budget');

    await waitFor(() => {
      expect(screen.queryByRole('button', { name: /add earning category/i })).toBeNull();
      expect(screen.queryByRole('button', { name: /add spending category/i })).toBeNull();
    });

    linesPromise.resolve([]);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /add earning category/i })).toBeDefined();
      expect(screen.getByRole('button', { name: /add spending category/i })).toBeDefined();
    });
  });

  it('shows an error with a retry button when lines fail to load', async () => {
    const listBudgetLines = vi
      .spyOn(budgetsService, 'listBudgetLines')
      .mockRejectedValueOnce(new Error('boom'))
      .mockResolvedValueOnce([makeBudgetLine({ category_name: 'Groceries' })]);

    renderPage();
    await screen.findByText('Monthly Budget');
    await screen.findByText('Could not load categories.');

    fireEvent.click(screen.getByRole('button', { name: /retry/i }));

    await screen.findByText('Groceries');
    expect(listBudgetLines).toHaveBeenCalledTimes(2);
  });

  it('appends a newly-created line into the right column immediately', async () => {
    vi.spyOn(categoriesService, 'listCategories').mockResolvedValue([
      { id: 5, name: 'Bonus', type: 'earning', is_active: true, household_id: 1 },
    ]);
    vi.spyOn(budgetsService, 'createBudgetLine').mockResolvedValue(
      makeBudgetLine({
        id: 3,
        budget_id: 9,
        category_id: 5,
        category_name: 'Bonus',
        category_type: 'earning',
      }),
    );

    renderPage();
    await screen.findByText('Monthly Budget');
    expect(screen.getAllByText('No categories yet.')).toHaveLength(2);

    fireEvent.click(screen.getByRole('button', { name: /add earning category/i }));
    fireEvent.mouseDown(await screen.findByRole('combobox', { name: /category/i }));
    fireEvent.click(await screen.findByRole('option', { name: 'Bonus' }));
    fireEvent.change(screen.getByLabelText(/budgeted amount/i), { target: { value: '200' } });
    fireEvent.click(screen.getByRole('button', { name: /^add$/i }));

    await screen.findByText('Bonus');
    // The Spending column still shows its own empty state — the new line
    // landed only in Earnings.
    expect(screen.getByText('No categories yet.')).toBeDefined();
  });

  it('does not let an earlier lines-retry resolving late clear the loading state for a newer retry', async () => {
    const firstRetry = deferred<ReturnType<typeof makeBudgetLine>[]>();
    const secondRetry = deferred<ReturnType<typeof makeBudgetLine>[]>();
    vi.spyOn(budgetsService, 'listBudgetLines')
      .mockRejectedValueOnce(new Error('boom'))
      .mockReturnValueOnce(firstRetry.promise)
      .mockReturnValueOnce(secondRetry.promise);

    renderPage();
    await screen.findByText('Monthly Budget');
    await screen.findByText('Could not load categories.');

    const retryButton = screen.getByRole('button', { name: /retry/i });
    // Both retries fire before either settles — the ignore flag alone
    // can't tell these two calls (from the same effect run) apart, only
    // linesRequestIdRef can.
    act(() => {
      fireEvent.click(retryButton);
      fireEvent.click(retryButton);
    });

    firstRetry.resolve([makeBudgetLine({ category_name: 'Stale Category' })]);
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(screen.queryByText('Stale Category')).toBeNull();
    expect(screen.getByText('Loading categories…')).toBeDefined();

    secondRetry.resolve([makeBudgetLine({ category_name: 'Groceries' })]);
    await screen.findByText('Groceries');
  });

  it('hides both "Add" buttons while the lines list is in an error state', async () => {
    vi.spyOn(budgetsService, 'listBudgetLines').mockRejectedValue(new Error('boom'));
    renderPage();
    await screen.findByText('Monthly Budget');

    await screen.findByText('Could not load categories.');
    // Nowhere to show a successfully-created line while the columns
    // themselves aren't rendered — the controls disappear rather than
    // sitting there disabled.
    expect(screen.queryByRole('button', { name: /add earning category/i })).toBeNull();
    expect(screen.queryByRole('button', { name: /add spending category/i })).toBeNull();
  });

  // Regresses to a bug where a create that started against budget 9 could
  // still resolve after the route moved to budget 10 — CreateBudgetLineDialog
  // unmounts the instant that happens, but its already-in-flight create
  // keeps running and still calls the onCreate closure it was holding,
  // which would otherwise append budget 9's line into whatever lines are
  // on screen by then (budget 10's).
  it('rejects a stale create that resolves after navigating to a different budget', async () => {
    const budget10 = deferred<Budget[]>();
    vi.spyOn(budgetsService, 'listBudgets')
      .mockResolvedValueOnce([BUDGET])
      .mockReturnValueOnce(budget10.promise);
    vi.spyOn(categoriesService, 'listCategories').mockResolvedValue([
      { id: 5, name: 'Bonus', type: 'earning', is_active: true, household_id: 1 },
    ]);
    const createPromise = deferred<ReturnType<typeof makeBudgetLine>>();
    vi.spyOn(budgetsService, 'createBudgetLine').mockReturnValue(createPromise.promise);

    renderPageWithNav();
    await screen.findByText('Monthly Budget');

    fireEvent.click(screen.getByRole('button', { name: /add earning category/i }));
    fireEvent.mouseDown(await screen.findByRole('combobox', { name: /category/i }));
    fireEvent.click(await screen.findByRole('option', { name: 'Bonus' }));
    fireEvent.change(screen.getByLabelText(/budgeted amount/i), { target: { value: '200' } });
    fireEvent.click(screen.getByRole('button', { name: /^add$/i }));

    // Navigate to a different budget before the create settles.
    fireEvent.click(screen.getByRole('link', { name: /go to budget 10/i, hidden: true }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());

    budget10.resolve([makeBudget({ id: 10, name: 'Vacation Fund' })]);
    await screen.findByText('Vacation Fund');

    // The stale create (for budget 9) resolves only now.
    await act(async () => {
      createPromise.resolve(
        makeBudgetLine({
          id: 3,
          budget_id: 9,
          category_id: 5,
          category_name: 'Bonus',
          category_type: 'earning',
        }),
      );
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    expect(screen.queryByText('Bonus')).toBeNull();
  });

  // The budget_id guard above (from the previous finding) only tells two
  // DIFFERENT budgets apart — it doesn't help for two separate visits to
  // the SAME budget. Navigate 9 -> 10 -> back to 9 while a create for
  // budget 9 is still in flight, and budget 9's second lines GET can
  // already include that line (the backend had processed the create by
  // then) before the stale create callback finally resolves — appending
  // it again would duplicate the row (and its React key).
  it('does not duplicate a line already present after navigating away and back to the same budget', async () => {
    const createdLine = makeBudgetLine({
      id: 3,
      budget_id: 9,
      category_id: 5,
      category_name: 'Bonus',
      category_type: 'earning',
    });

    vi.spyOn(budgetsService, 'listBudgets')
      .mockResolvedValueOnce([BUDGET]) // initial /budgets/9
      .mockResolvedValueOnce([makeBudget({ id: 10, name: 'Vacation Fund' })]) // -> /budgets/10
      .mockResolvedValueOnce([BUDGET]); // -> back to /budgets/9

    vi.spyOn(budgetsService, 'listBudgetLines')
      .mockResolvedValueOnce([]) // budget 9, first visit
      .mockResolvedValueOnce([]) // budget 10
      .mockResolvedValueOnce([createdLine]); // budget 9, second visit — already has it

    vi.spyOn(categoriesService, 'listCategories').mockResolvedValue([
      { id: 5, name: 'Bonus', type: 'earning', is_active: true, household_id: 1 },
    ]);
    const createPromise = deferred<ReturnType<typeof makeBudgetLine>>();
    vi.spyOn(budgetsService, 'createBudgetLine').mockReturnValue(createPromise.promise);

    renderPageWithNav();
    await screen.findByText('Monthly Budget');

    fireEvent.click(screen.getByRole('button', { name: /add earning category/i }));
    fireEvent.mouseDown(await screen.findByRole('combobox', { name: /category/i }));
    fireEvent.click(await screen.findByRole('option', { name: 'Bonus' }));
    fireEvent.change(screen.getByLabelText(/budgeted amount/i), { target: { value: '200' } });
    fireEvent.click(screen.getByRole('button', { name: /^add$/i }));

    // Navigate away, then back to budget 9 — its second lines GET already
    // includes the (by-now-persisted) created line.
    fireEvent.click(screen.getByRole('link', { name: /go to budget 10/i, hidden: true }));
    await screen.findByText('Vacation Fund');

    fireEvent.click(screen.getByRole('link', { name: /go to budget 9/i, hidden: true }));
    await screen.findByText('Bonus');

    // The original, now-stale create callback resolves only now.
    await act(async () => {
      createPromise.resolve(createdLine);
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    expect(screen.getAllByText('Bonus')).toHaveLength(1);
  });
});
