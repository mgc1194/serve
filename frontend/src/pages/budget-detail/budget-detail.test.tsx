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

describe('BudgetDetailPage sync actuals', () => {
  beforeEach(() => {
    vi.spyOn(budgetsService, 'syncBudget').mockResolvedValue({
      budget: makeBudget({ id: 9, name: 'Monthly Budget', synced_at: '2026-03-05T14:30:00Z' }),
      lines: [],
    });
  });

  it('shows "Never synced" when the budget has never been synced', async () => {
    renderPage();
    await screen.findByText('Monthly Budget');
    expect(screen.getByText('Never synced')).toBeDefined();
  });

  it('syncs actuals and shows the updated amount and synced time', async () => {
    vi.spyOn(budgetsService, 'listBudgetLines').mockResolvedValue([
      makeBudgetLine({ category_name: 'Groceries', actual_amount: '0.00' }),
    ]);
    vi.spyOn(budgetsService, 'syncBudget').mockResolvedValue({
      budget: makeBudget({ id: 9, name: 'Monthly Budget', synced_at: '2026-03-05T14:30:00Z' }),
      lines: [makeBudgetLine({ category_name: 'Groceries', actual_amount: '320.57' })],
    });

    renderPage();
    await screen.findByText('Groceries');
    expect(screen.getByText('$0.00')).toBeDefined();

    fireEvent.click(screen.getByRole('button', { name: /sync budget/i }));

    expect(await screen.findByText('$320.57')).toBeDefined();
    // Not asserting the exact formatted timestamp — it renders in the
    // viewer's local time zone, so just confirm it's no longer the
    // never-synced placeholder.
    expect(screen.queryByText('Never synced')).toBeNull();
    expect(screen.getByText(/^Synced /)).toBeDefined();
  });

  // Regresses to a bug where setBudget(result.budget) — a brand-new object,
  // even though it's the same budget — retriggered the lines-loading
  // effect (keyed off the whole `budget` object) into an entirely
  // redundant GET /budgets/{id}/lines, racing with and liable to overwrite
  // the lines the sync response had just supplied.
  it('does not refetch lines after a sync (the response is already authoritative)', async () => {
    const listBudgetLines = vi
      .spyOn(budgetsService, 'listBudgetLines')
      .mockResolvedValue([makeBudgetLine({ category_name: 'Groceries', actual_amount: '0.00' })]);
    vi.spyOn(budgetsService, 'syncBudget').mockResolvedValue({
      budget: makeBudget({ id: 9, name: 'Monthly Budget', synced_at: '2026-03-05T14:30:00Z' }),
      lines: [makeBudgetLine({ category_name: 'Groceries', actual_amount: '320.57' })],
    });

    renderPage();
    await screen.findByText('Groceries');
    expect(listBudgetLines).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole('button', { name: /sync budget/i }));
    await screen.findByText('$320.57');

    // Give any (wrongly) re-triggered effect a turn to fire before asserting.
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(listBudgetLines).toHaveBeenCalledTimes(1);
  });

  it('disables the Sync button and shows a spinner while syncing', async () => {
    const syncPromise = deferred<{ budget: Budget; lines: ReturnType<typeof makeBudgetLine>[] }>();
    vi.spyOn(budgetsService, 'syncBudget').mockReturnValue(syncPromise.promise);

    renderPage();
    await screen.findByText('Monthly Budget');

    const syncButton = screen.getByRole('button', { name: /sync budget/i });
    fireEvent.click(syncButton);

    await waitFor(() => expect(syncButton.hasAttribute('disabled')).toBe(true));

    syncPromise.resolve({ budget: makeBudget({ id: 9, name: 'Monthly Budget' }), lines: [] });
    await waitFor(() => expect(syncButton.hasAttribute('disabled')).toBe(false));
  });

  it('shows an error message when sync fails, without touching the lines', async () => {
    vi.spyOn(budgetsService, 'listBudgetLines').mockResolvedValue([
      makeBudgetLine({ category_name: 'Groceries' }),
    ]);
    vi.spyOn(budgetsService, 'syncBudget').mockRejectedValue(new Error('boom'));

    renderPage();
    await screen.findByText('Monthly Budget');

    fireEvent.click(screen.getByRole('button', { name: /sync budget/i }));

    await screen.findByText('Could not sync budget.');
    expect(screen.getByText('Groceries')).toBeDefined();
    expect(screen.getByText('Never synced')).toBeDefined();
  });

  // Same staleness concern as the "rejects a stale create" test below, for
  // the sync request instead: it started against budget 9, but the route
  // moved to budget 10 before it resolved.
  it('ignores a stale sync that resolves after navigating to a different budget', async () => {
    const syncPromise = deferred<{ budget: Budget; lines: ReturnType<typeof makeBudgetLine>[] }>();
    vi.spyOn(budgetsService, 'syncBudget').mockReturnValue(syncPromise.promise);
    vi.spyOn(budgetsService, 'listBudgets')
      .mockResolvedValueOnce([BUDGET])
      .mockResolvedValueOnce([makeBudget({ id: 10, name: 'Vacation Fund' })]);

    renderPageWithNav();
    await screen.findByText('Monthly Budget');

    fireEvent.click(screen.getByRole('button', { name: /sync budget/i }));

    fireEvent.click(screen.getByRole('link', { name: /go to budget 10/i, hidden: true }));
    await screen.findByText('Vacation Fund');

    await act(async () => {
      syncPromise.resolve({
        budget: makeBudget({ id: 9, name: 'Monthly Budget', synced_at: '2026-03-05T14:30:00Z' }),
        lines: [],
      });
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    // Budget 10 is still on screen, unaffected by budget 9's stale sync.
    expect(screen.getByText('Vacation Fund')).toBeDefined();
    expect(screen.queryByText(/^Synced /)).toBeNull();
    // Regresses to a bug where the stale sync's `finally` skipped
    // setIsSyncing(false) (its own staleness guard caught it too, since
    // isSyncing is page-global, not re-derived from `budget`) — leaving
    // budget 10's own Sync button disabled forever, with no sync of its
    // own ever started.
    expect(screen.getByRole('button', { name: /sync budget/i }).hasAttribute('disabled')).toBe(
      false,
    );
  });

  // A budget-id-only staleness check can't tell two separate visits to the
  // SAME budget apart: navigate 9 -> 10 -> back to 9 while a sync from the
  // FIRST visit to 9 is still in flight, and an id-only guard would see id
  // 9 both times and wrongly let that stale response overwrite the second
  // visit's already-fresher budget/lines.
  it('ignores a stale sync that resolves after navigating away and back to the same budget', async () => {
    const staleSyncPromise = deferred<{ budget: Budget; lines: ReturnType<typeof makeBudgetLine>[] }>();
    vi.spyOn(budgetsService, 'syncBudget').mockReturnValue(staleSyncPromise.promise);

    vi.spyOn(budgetsService, 'listBudgets')
      .mockResolvedValueOnce([BUDGET]) // first visit to budget 9
      .mockResolvedValueOnce([makeBudget({ id: 10, name: 'Vacation Fund' })]) // -> budget 10
      .mockResolvedValueOnce([BUDGET]); // -> back to budget 9, second visit
    vi.spyOn(budgetsService, 'listBudgetLines')
      .mockResolvedValueOnce([]) // budget 9, first visit
      .mockResolvedValueOnce([]) // budget 10
      .mockResolvedValueOnce([makeBudgetLine({ category_name: 'Fresh Line' })]); // budget 9, second visit

    renderPageWithNav();
    await screen.findByText('Monthly Budget');

    // Starts a sync during the FIRST visit to budget 9; it never resolves
    // until well after the page has moved on.
    fireEvent.click(screen.getByRole('button', { name: /sync budget/i }));

    fireEvent.click(screen.getByRole('link', { name: /go to budget 10/i, hidden: true }));
    await screen.findByText('Vacation Fund');

    fireEvent.click(screen.getByRole('link', { name: /go to budget 9/i, hidden: true }));
    await screen.findByText('Fresh Line');

    await act(async () => {
      staleSyncPromise.resolve({
        budget: makeBudget({ id: 9, name: 'Monthly Budget', synced_at: '2020-01-01T00:00:00Z' }),
        lines: [makeBudgetLine({ id: 999, category_name: 'Stale Line' })],
      });
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    // Still showing the second visit's fresh data, not the stale sync's.
    expect(screen.getByText('Fresh Line')).toBeDefined();
    expect(screen.queryByText('Stale Line')).toBeNull();
    expect(screen.getByText('Never synced')).toBeDefined();
    expect(screen.getByRole('button', { name: /sync budget/i }).hasAttribute('disabled')).toBe(
      false,
    );
  });

  // Different leak than the stale-sync test above: here the sync for
  // budget 9 fails and settles WHILE budget 9 is still on screen (so its
  // error Alert is already showing), and only then does the route move to
  // budget 10 — syncError is page-global state with nothing to clear it
  // on navigation, so without the fix budget 9's error Alert would still
  // be sitting there under budget 10's own header.
  it("does not carry a previous budget's sync error into a newly navigated budget", async () => {
    vi.spyOn(budgetsService, 'syncBudget').mockRejectedValue(new Error('boom'));
    vi.spyOn(budgetsService, 'listBudgets')
      .mockResolvedValueOnce([BUDGET])
      .mockResolvedValueOnce([makeBudget({ id: 10, name: 'Vacation Fund' })]);

    renderPageWithNav();
    await screen.findByText('Monthly Budget');

    fireEvent.click(screen.getByRole('button', { name: /sync budget/i }));
    await screen.findByText('Could not sync budget.');

    fireEvent.click(screen.getByRole('link', { name: /go to budget 10/i, hidden: true }));
    await screen.findByText('Vacation Fund');

    expect(screen.queryByText('Could not sync budget.')).toBeNull();
  });

  // The initial lines GET and a sync both ultimately call setLines — if
  // that initial fetch is still in flight (or just slower) and resolves
  // AFTER a sync, its now-stale response must not silently overwrite the
  // sync's own freshly-computed lines, and isLoadingLines must not stay
  // stuck true (hiding the already-synced columns) in the meantime.
  it('does not let a slower initial lines fetch clobber a faster sync', async () => {
    const initialLinesPromise = deferred<ReturnType<typeof makeBudgetLine>[]>();
    vi.spyOn(budgetsService, 'listBudgetLines').mockReturnValue(initialLinesPromise.promise);
    vi.spyOn(budgetsService, 'syncBudget').mockResolvedValue({
      budget: makeBudget({ id: 9, name: 'Monthly Budget', synced_at: '2026-03-05T14:30:00Z' }),
      lines: [makeBudgetLine({ category_name: 'Groceries', actual_amount: '320.57' })],
    });

    renderPage();
    await screen.findByText('Monthly Budget');
    await screen.findByText('Loading categories…');

    fireEvent.click(screen.getByRole('button', { name: /sync budget/i }));
    await screen.findByText('$320.57');
    expect(screen.queryByText('Loading categories…')).toBeNull();

    // The slower initial fetch resolves only now, with DIFFERENT (by now
    // stale) data — it must not overwrite what the sync already supplied.
    await act(async () => {
      initialLinesPromise.resolve([
        makeBudgetLine({ category_name: 'Groceries', actual_amount: '0.00' }),
      ]);
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    expect(screen.getByText('$320.57')).toBeDefined();
    expect(screen.queryByText('$0.00')).toBeNull();
    expect(screen.queryByText('Loading categories…')).toBeNull();
  });

  // A line created while a sync is in flight would exist only in `lines`,
  // not in the sync's own in-flight snapshot (computed server-side before
  // the create) — setLines(result.lines) on the sync's resolution would
  // silently drop it. Disabling the "Add" buttons for the duration of a
  // sync closes off that window entirely, rather than trying to reconcile
  // the two writes after the fact.
  it('disables both "Add" buttons while a sync is in flight', async () => {
    const syncPromise = deferred<{ budget: Budget; lines: ReturnType<typeof makeBudgetLine>[] }>();
    vi.spyOn(budgetsService, 'syncBudget').mockReturnValue(syncPromise.promise);

    renderPage();
    await screen.findByText('Monthly Budget');

    fireEvent.click(screen.getByRole('button', { name: /sync budget/i }));

    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: /add earning category/i }).hasAttribute('disabled'),
      ).toBe(true);
      expect(
        screen.getByRole('button', { name: /add spending category/i }).hasAttribute('disabled'),
      ).toBe(true);
    });

    syncPromise.resolve({ budget: makeBudget({ id: 9, name: 'Monthly Budget' }), lines: [] });

    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: /add earning category/i }).hasAttribute('disabled'),
      ).toBe(false);
      expect(
        screen.getByRole('button', { name: /add spending category/i }).hasAttribute('disabled'),
      ).toBe(false);
    });
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

describe('BudgetDetailPage edit mode', () => {
  beforeEach(() => {
    vi.spyOn(budgetsService, 'listBudgetLines').mockResolvedValue([
      makeBudgetLine({ id: 1, category_name: 'Groceries', category_type: 'spending', planned_amount: 500 }),
    ]);
  });

  it('enters edit mode, replacing Edit with Cancel and Confirm changes', async () => {
    renderPage();
    await screen.findByText('Groceries');

    fireEvent.click(screen.getByRole('button', { name: /^edit$/i }));

    expect(screen.queryByRole('button', { name: /^edit$/i })).toBeNull();
    expect(screen.getByRole('button', { name: /^cancel$/i })).toBeDefined();
    expect(screen.getByRole('button', { name: /confirm changes/i })).toBeDefined();
  });

  it('disables Sync budget while edit mode is active', async () => {
    renderPage();
    await screen.findByText('Groceries');

    fireEvent.click(screen.getByRole('button', { name: /^edit$/i }));

    expect(screen.getByRole('button', { name: /sync budget/i }).hasAttribute('disabled')).toBe(true);
  });

  it('disables Edit while a sync is in flight', async () => {
    const syncPromise = deferred<{ budget: Budget; lines: ReturnType<typeof makeBudgetLine>[] }>();
    vi.spyOn(budgetsService, 'syncBudget').mockReturnValue(syncPromise.promise);

    renderPage();
    await screen.findByText('Groceries');

    fireEvent.click(screen.getByRole('button', { name: /sync budget/i }));
    expect(screen.getByRole('button', { name: /^edit$/i }).hasAttribute('disabled')).toBe(true);

    syncPromise.resolve({ budget: makeBudget({ id: 9, name: 'Monthly Budget' }), lines: [] });
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /^edit$/i }).hasAttribute('disabled')).toBe(false),
    );
  });

  it('disables both "Add" buttons while edit mode is active', async () => {
    renderPage();
    await screen.findByText('Groceries');

    fireEvent.click(screen.getByRole('button', { name: /^edit$/i }));

    expect(
      screen.getByRole('button', { name: /add earning category/i }).hasAttribute('disabled'),
    ).toBe(true);
    expect(
      screen.getByRole('button', { name: /add spending category/i }).hasAttribute('disabled'),
    ).toBe(true);
  });

  it('edits a planned amount and confirms, saving it and leaving edit mode', async () => {
    const updateBudgetLine = vi
      .spyOn(budgetsService, 'updateBudgetLine')
      .mockResolvedValue(
        makeBudgetLine({ id: 1, category_name: 'Groceries', category_type: 'spending', planned_amount: 750 }),
      );

    renderPage();
    await screen.findByText('Groceries');

    fireEvent.click(screen.getByRole('button', { name: /^edit$/i }));
    fireEvent.change(screen.getByRole('spinbutton', { name: /groceries budgeted amount/i }), {
      target: { value: '750' },
    });
    fireEvent.click(screen.getByRole('button', { name: /confirm changes/i }));

    await waitFor(() => expect(screen.queryByRole('button', { name: /^cancel$/i })).toBeNull());
    expect(updateBudgetLine).toHaveBeenCalledWith(1, { planned_amount: 750 });
    expect(screen.getByText('$750.00')).toBeDefined();
  });

  it('deletes a line and confirms, removing it and calling deleteBudgetLine', async () => {
    const deleteBudgetLine = vi.spyOn(budgetsService, 'deleteBudgetLine').mockResolvedValue(undefined);

    renderPage();
    await screen.findByText('Groceries');

    fireEvent.click(screen.getByRole('button', { name: /^edit$/i }));
    fireEvent.click(screen.getByRole('button', { name: /delete groceries/i }));

    // Staged deletes disappear from view immediately, before confirming.
    expect(screen.queryByText('Groceries')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: /confirm changes/i }));

    await waitFor(() => expect(screen.queryByRole('button', { name: /^cancel$/i })).toBeNull());
    expect(deleteBudgetLine).toHaveBeenCalledWith(1);
    expect(screen.queryByText('Groceries')).toBeNull();
  });

  it('cancel discards staged edits and deletes without calling the API', async () => {
    const updateBudgetLine = vi.spyOn(budgetsService, 'updateBudgetLine');
    const deleteBudgetLine = vi.spyOn(budgetsService, 'deleteBudgetLine');

    renderPage();
    await screen.findByText('Groceries');

    fireEvent.click(screen.getByRole('button', { name: /^edit$/i }));
    fireEvent.change(screen.getByRole('spinbutton', { name: /groceries budgeted amount/i }), {
      target: { value: '999' },
    });
    fireEvent.click(screen.getByRole('button', { name: /^cancel$/i }));

    expect(updateBudgetLine).not.toHaveBeenCalled();
    expect(deleteBudgetLine).not.toHaveBeenCalled();
    expect(screen.queryByRole('button', { name: /^cancel$/i })).toBeNull();
    expect(screen.getByText('$500.00')).toBeDefined();
  });

  it('disables Confirm changes while a staged edit is not a valid whole-dollar amount', async () => {
    renderPage();
    await screen.findByText('Groceries');

    fireEvent.click(screen.getByRole('button', { name: /^edit$/i }));
    const field = screen.getByRole('spinbutton', { name: /groceries budgeted amount/i });

    fireEvent.change(field, { target: { value: '420.50' } });
    expect(screen.getByRole('button', { name: /confirm changes/i }).hasAttribute('disabled')).toBe(
      true,
    );

    fireEvent.change(field, { target: { value: '420' } });
    expect(screen.getByRole('button', { name: /confirm changes/i }).hasAttribute('disabled')).toBe(
      false,
    );
  });

  // The partial-failure case: one line's edit saves, another's fails. The
  // succeeded one applies and clears; the failed one stays staged (still
  // editable) and edit mode doesn't exit, so the user can see it and retry.
  it('keeps a failed edit staged and in edit mode, while a succeeded one applies', async () => {
    vi.spyOn(budgetsService, 'listBudgetLines').mockResolvedValue([
      makeBudgetLine({ id: 1, category_name: 'Groceries', category_type: 'spending', planned_amount: 500 }),
      makeBudgetLine({ id: 2, category_name: 'Transport', category_type: 'spending', planned_amount: 200 }),
    ]);
    vi.spyOn(budgetsService, 'updateBudgetLine').mockImplementation((id, payload) =>
      id === 1
        ? Promise.resolve(
            makeBudgetLine({
              id: 1,
              category_name: 'Groceries',
              category_type: 'spending',
              planned_amount: payload.planned_amount,
            }),
          )
        : Promise.reject(new Error('boom')),
    );

    renderPage();
    await screen.findByText('Groceries');

    fireEvent.click(screen.getByRole('button', { name: /^edit$/i }));
    fireEvent.change(screen.getByRole('spinbutton', { name: /groceries budgeted amount/i }), {
      target: { value: '750' },
    });
    fireEvent.change(screen.getByRole('spinbutton', { name: /transport budgeted amount/i }), {
      target: { value: '300' },
    });
    fireEvent.click(screen.getByRole('button', { name: /confirm changes/i }));

    await screen.findByText('1 change could not be saved. Please try again.');
    // Still in edit mode — Confirm changes/Cancel are still showing.
    expect(screen.getByRole('button', { name: /confirm changes/i })).toBeDefined();
    // Groceries' edit succeeded and its draft cleared — still in edit mode
    // (Transport's failure kept it open), so its field now defaults to the
    // newly-committed 750, not the pre-edit 500.
    expect(screen.getByRole('spinbutton', { name: /groceries budgeted amount/i })).toHaveProperty(
      'value',
      '750',
    );
    // ...Transport's failed edit is still staged in its field.
    expect(screen.getByRole('spinbutton', { name: /transport budgeted amount/i })).toHaveProperty(
      'value',
      '300',
    );
  });

  // Same staleness concern as handleSync/onCreate: a confirm that resolves
  // after the route has moved to a different budget must not touch
  // whatever's now on screen.
  it('ignores a stale confirm that resolves after navigating to a different budget', async () => {
    const updatePromise = deferred<ReturnType<typeof makeBudgetLine>>();
    vi.spyOn(budgetsService, 'updateBudgetLine').mockReturnValue(updatePromise.promise);
    vi.spyOn(budgetsService, 'listBudgets')
      .mockResolvedValueOnce([BUDGET])
      .mockResolvedValueOnce([makeBudget({ id: 10, name: 'Vacation Fund' })]);
    vi.spyOn(budgetsService, 'listBudgetLines')
      .mockResolvedValueOnce([
        makeBudgetLine({ id: 1, category_name: 'Groceries', category_type: 'spending', planned_amount: 500 }),
      ])
      // Budget 10 happens to have a line with the SAME id (ids aren't
      // scoped to a budget) — if the stale confirm's guard didn't catch
      // this, its succeeded edit would incorrectly land on this line
      // instead, since setLines matches by id alone.
      .mockResolvedValueOnce([
        makeBudgetLine({ id: 1, category_name: 'Rent', category_type: 'spending', planned_amount: 1200 }),
      ]);

    renderPageWithNav();
    await screen.findByText('Groceries');

    fireEvent.click(screen.getByRole('button', { name: /^edit$/i }));
    fireEvent.change(screen.getByRole('spinbutton', { name: /groceries budgeted amount/i }), {
      target: { value: '750' },
    });
    fireEvent.click(screen.getByRole('button', { name: /confirm changes/i }));

    fireEvent.click(screen.getByRole('link', { name: /go to budget 10/i, hidden: true }));
    await screen.findByText('Vacation Fund');

    await act(async () => {
      updatePromise.resolve(
        makeBudgetLine({ id: 1, category_name: 'Groceries', category_type: 'spending', planned_amount: 750 }),
      );
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    expect(screen.getByText('Vacation Fund')).toBeDefined();
    expect(screen.queryByText('Groceries')).toBeNull();
    // Budget 10's own "Rent" line (also id 1) is unaffected.
    expect(screen.getByText('$1,200.00')).toBeDefined();
  });
});
