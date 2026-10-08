// pages/budget-detail/budget-detail.test.tsx

import { act, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ActiveHouseholdProvider } from '@context/active-household-context';
import { BudgetDetailPage } from '@pages/budget-detail';
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

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(budgetsService, 'listBudgets').mockResolvedValue([BUDGET]);
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
