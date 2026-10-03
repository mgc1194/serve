// pages/budgets/budgets.test.tsx — Unit tests for BudgetsPage.

import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ActiveHouseholdProvider } from '@context/active-household-context';
import { useAuth } from '@context/auth-context';
import { BudgetsPage } from '@pages/budgets';
import { makeBudget } from '@serve/mocks';
import type { Budget } from '@serve/types/global';
import * as budgetsService from '@services/budgets';

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

vi.mock('@context/auth-context', () => ({ useAuth: vi.fn() }));
vi.mock('@layout/app-header', () => ({ AppHeader: () => <header /> }));

const mockUseAuth = vi.mocked(useAuth);

const HOUSEHOLD = { id: 1, name: 'Test Household' };

function mockUser(households: (typeof HOUSEHOLD)[]) {
  mockUseAuth.mockReturnValue({
    user: {
      id: 1,
      email: 'test@example.com',
      first_name: 'Test',
      last_name: 'User',
      username: 'test',
      households,
    },
    setUser: vi.fn(),
    isLoading: false,
    sessionError: false,
  });
}

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/budgets']}>
      <ActiveHouseholdProvider>
        <Routes>
          <Route path="/" element={<div>Dashboard page</div>} />
          <Route path="/budgets" element={<BudgetsPage />} />
        </Routes>
      </ActiveHouseholdProvider>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(budgetsService, 'listBudgets').mockResolvedValue([]);
});

describe('BudgetsPage rendering', () => {
  it('renders the Budgets title', async () => {
    mockUser([HOUSEHOLD]);
    renderPage();
    expect(screen.getByRole('heading', { name: 'Budgets' })).toBeDefined();
    await waitFor(() => expect(budgetsService.listBudgets).toHaveBeenCalled());
  });

  it('navigates to the dashboard when Dashboard is clicked', async () => {
    mockUser([HOUSEHOLD]);
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: /dashboard/i }));
    expect(screen.getByText('Dashboard page')).toBeDefined();
    await waitFor(() => expect(budgetsService.listBudgets).toHaveBeenCalled());
  });

  it('shows a Create budget button for the active household', async () => {
    mockUser([HOUSEHOLD]);
    renderPage();
    expect(screen.getByText('Showing budgets in Test Household')).toBeDefined();
    expect(screen.getByRole('button', { name: /^create budget$/i })).toBeDefined();
    await waitFor(() => expect(budgetsService.listBudgets).toHaveBeenCalled());
  });

  it('does not show a Create budget button when no household is selected', () => {
    mockUser([]);
    renderPage();
    expect(screen.getByText('No household selected.')).toBeDefined();
    expect(screen.queryByRole('button', { name: /^create budget$/i })).toBeNull();
  });
});

describe('BudgetsPage list', () => {
  it('fetches budgets for the active household', async () => {
    mockUser([HOUSEHOLD]);
    renderPage();
    await waitFor(() => expect(budgetsService.listBudgets).toHaveBeenCalledWith(1));
  });

  it('renders a card per budget', async () => {
    mockUser([HOUSEHOLD]);
    vi.spyOn(budgetsService, 'listBudgets').mockResolvedValue([
      makeBudget({ id: 1, name: 'January 2026' }),
      makeBudget({ id: 2, name: 'Iceland Trip', type: 'project', period_start: null, period_end: null }),
    ]);
    renderPage();
    await screen.findByText('January 2026');
    expect(screen.getByText('Iceland Trip')).toBeDefined();
  });

  it('shows an empty-state message when there are no budgets', async () => {
    mockUser([HOUSEHOLD]);
    renderPage();
    await screen.findByText(/no budgets yet/i);
  });

  it('shows an error message with a retry button on failure', async () => {
    mockUser([HOUSEHOLD]);
    vi.spyOn(budgetsService, 'listBudgets').mockRejectedValueOnce(new Error('boom'));
    renderPage();
    await screen.findByText('Could not load budgets.');
    expect(screen.getByRole('button', { name: /retry/i })).toBeDefined();
  });

  it('retries the fetch when Retry is clicked', async () => {
    mockUser([HOUSEHOLD]);
    vi.spyOn(budgetsService, 'listBudgets')
      .mockRejectedValueOnce(new Error('boom'))
      .mockResolvedValueOnce([makeBudget({ id: 1, name: 'January 2026' })]);

    renderPage();
    await screen.findByText('Could not load budgets.');
    fireEvent.click(screen.getByRole('button', { name: /retry/i }));

    await screen.findByText('January 2026');
  });
});

describe('BudgetsPage create budget', () => {
  it('opens CreateBudgetDialog for the active household when Create budget is clicked', async () => {
    mockUser([HOUSEHOLD]);
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: /^create budget$/i }));
    expect(screen.getByRole('dialog')).toBeDefined();
    expect(screen.getByText('New budget')).toBeDefined();
    await waitFor(() => expect(budgetsService.listBudgets).toHaveBeenCalled());
  });

  it('closes the dialog and adds the new budget to the list after a successful create', async () => {
    mockUser([HOUSEHOLD]);
    vi.spyOn(budgetsService, 'createBudget').mockResolvedValue(
      makeBudget({ id: 1, name: 'August 2026' }),
    );

    renderPage();
    await waitFor(() => expect(budgetsService.listBudgets).toHaveBeenCalled());
    fireEvent.click(screen.getByRole('button', { name: /^create budget$/i }));

    fireEvent.change(screen.getByLabelText('Month'), { target: { value: '2026-08' } });
    fireEvent.click(screen.getByRole('button', { name: /^create$/i }));

    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(screen.getByText('August 2026')).toBeDefined();
  });

  it('keeps a budget created while the initial list fetch is still pending', async () => {
    mockUser([HOUSEHOLD]);
    const listDeferred = deferred<Budget[]>();
    vi.spyOn(budgetsService, 'listBudgets').mockReturnValueOnce(listDeferred.promise);
    vi.spyOn(budgetsService, 'createBudget').mockResolvedValue(
      makeBudget({ id: 1, name: 'August 2026' }),
    );

    renderPage();
    // The Create budget button stays enabled while this initial fetch is
    // still in flight — create while it's pending.
    fireEvent.click(screen.getByRole('button', { name: /^create budget$/i }));
    fireEvent.change(screen.getByLabelText('Month'), { target: { value: '2026-08' } });
    fireEvent.click(screen.getByRole('button', { name: /^create$/i }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(screen.getByText('August 2026')).toBeDefined();

    // The stale request finally resolves with a list from before the
    // create — it must not wipe out the budget just created.
    listDeferred.resolve([]);
    await waitFor(() => expect(screen.queryByText(/no budgets yet/i)).toBeNull());
    expect(screen.getByText('August 2026')).toBeDefined();
  });

  it('merges a stale in-flight list response instead of discarding its other budgets', async () => {
    mockUser([HOUSEHOLD]);
    const listDeferred = deferred<Budget[]>();
    vi.spyOn(budgetsService, 'listBudgets').mockReturnValueOnce(listDeferred.promise);
    vi.spyOn(budgetsService, 'createBudget').mockResolvedValue(
      makeBudget({ id: 2, name: 'August 2026' }),
    );

    renderPage();
    fireEvent.click(screen.getByRole('button', { name: /^create budget$/i }));
    fireEvent.change(screen.getByLabelText('Month'), { target: { value: '2026-08' } });
    fireEvent.click(screen.getByRole('button', { name: /^create$/i }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(screen.getByText('August 2026')).toBeDefined();

    // The stale request finally resolves with the household's other,
    // pre-existing budget — it must not be lost, and the one just created
    // must not be duplicated.
    listDeferred.resolve([makeBudget({ id: 1, name: 'January 2026' })]);
    await waitFor(() => expect(screen.getByText('January 2026')).toBeDefined());
    expect(screen.getAllByText('August 2026')).toHaveLength(1);
  });

  it('clears a stale list error so the newly created card is visible', async () => {
    mockUser([HOUSEHOLD]);
    vi.spyOn(budgetsService, 'listBudgets').mockRejectedValueOnce(new Error('boom'));
    vi.spyOn(budgetsService, 'createBudget').mockResolvedValue(
      makeBudget({ id: 1, name: 'August 2026' }),
    );

    renderPage();
    await screen.findByText('Could not load budgets.');

    fireEvent.click(screen.getByRole('button', { name: /^create budget$/i }));
    fireEvent.change(screen.getByLabelText('Month'), { target: { value: '2026-08' } });
    fireEvent.click(screen.getByRole('button', { name: /^create$/i }));

    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(screen.queryByText('Could not load budgets.')).toBeNull();
    expect(screen.getByText('August 2026')).toBeDefined();
  });

  it('keeps a successfully created budget visible, with Retry still offered, if the in-flight list request rejects afterward', async () => {
    mockUser([HOUSEHOLD]);
    const listDeferred = deferred<Budget[]>();
    vi.spyOn(budgetsService, 'listBudgets').mockReturnValueOnce(listDeferred.promise);
    vi.spyOn(budgetsService, 'createBudget').mockResolvedValue(
      makeBudget({ id: 1, name: 'August 2026' }),
    );

    renderPage();
    fireEvent.click(screen.getByRole('button', { name: /^create budget$/i }));
    fireEvent.change(screen.getByLabelText('Month'), { target: { value: '2026-08' } });
    fireEvent.click(screen.getByRole('button', { name: /^create$/i }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(screen.getByText('August 2026')).toBeDefined();

    // The request that was already in flight at create time now rejects.
    // The newly created card must stay visible rather than getting hidden
    // behind the error, but the failure (and a way to recover the
    // household's other, not-yet-fetched budgets) must still surface.
    listDeferred.reject(new Error('boom'));
    await screen.findByText('Could not load budgets.');
    expect(screen.getByText('August 2026')).toBeDefined();
    expect(screen.getByRole('button', { name: /retry/i })).toBeDefined();
  });

  it('does not let an earlier retry resolving late clear the loading state for a newer retry', async () => {
    mockUser([HOUSEHOLD]);
    const firstRetry = deferred<Budget[]>();
    const secondRetry = deferred<Budget[]>();
    vi.spyOn(budgetsService, 'listBudgets')
      .mockRejectedValueOnce(new Error('boom'))
      .mockReturnValueOnce(firstRetry.promise)
      .mockReturnValueOnce(secondRetry.promise);

    renderPage();
    await screen.findByText('Could not load budgets.');

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
    // isLoading unconditionally, which (with budgets still empty and no
    // error) would prematurely reveal the empty state instead of leaving
    // the skeleton up for the still-pending newer retry.
    firstRetry.resolve([makeBudget({ id: 1, name: 'Stale Budget' })]);
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(screen.queryByText('Stale Budget')).toBeNull();
    expect(screen.queryByText(/no budgets yet/i)).toBeNull();
    expect(screen.queryByRole('button', { name: /retry/i })).toBeNull();

    // The newer retry resolves — its data applies.
    secondRetry.resolve([makeBudget({ id: 2, name: 'Fresh Budget' })]);
    await screen.findByText('Fresh Budget');
    expect(screen.queryByText('Stale Budget')).toBeNull();
  });
});
