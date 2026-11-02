// pages/summary/summary.test.tsx — Unit test for the SummaryPage
// stale-request regression.
//
// Regresses to a bug where switching the active household while an
// in-flight getSummary() request for the previous household was still
// pending could let that stale response resolve after the new household's
// response and overwrite the page with the wrong household's summary. This
// suite switches households mid-fetch, resolves the requests out of order,
// and asserts the page reflects only the latest household's summary.

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ActiveHouseholdProvider } from '@context/active-household-context';
import { AuthProvider } from '@context/auth-context';
import { SummaryPage } from '@pages/summary';
import { makeHousehold, makeUser } from '@serve/mocks';
import type { PaginatedTransactions, Summary } from '@serve/types/global';
import * as summaryService from '@services/summary';
import * as transactionsService from '@services/transactions';

vi.mock('@services/summary');
vi.mock('@services/transactions', async importOriginal => {
  const actual = await importOriginal<typeof import('@services/transactions')>();
  return { ...actual, listTransactions: vi.fn() };
});
vi.mock('@layout/app-header', () => ({ AppHeader: () => <header /> }));

const HOUSEHOLD_A = makeHousehold({ id: 1, name: 'Alpha Household' });
const HOUSEHOLD_B = makeHousehold({ id: 2, name: 'Beta Household' });

// ActiveHouseholdProvider persists the chosen household in localStorage,
// keyed by user id (see active-household-context.tsx) — every test here
// uses the same mock user id, so without this a switch made in one test
// (the stale-request regression below) would leak into the next test's
// default active household.
beforeEach(() => localStorage.clear());

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(res => {
    resolve = res;
  });
  return { promise, resolve };
}

function makeSummary(overrides: Partial<Summary> = {}): Summary {
  return {
    earnings: [],
    spending: [],
    total: 0,
    balance: 0,
    uncategorised_total: 0,
    earliest_transaction_date: null,
    ...overrides,
  };
}

function renderPage(initialEntries: string[] = ['/']) {
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <AuthProvider
        value={{
          user: makeUser({ households: [HOUSEHOLD_A, HOUSEHOLD_B] }),
          setUser: vi.fn(),
          isLoading: false,
          sessionError: false,
        }}
      >
        <ActiveHouseholdProvider>
          <SummaryPage />
        </ActiveHouseholdProvider>
      </AuthProvider>
    </MemoryRouter>,
  );
}

const EMPTY_TRANSACTIONS_PAGE: PaginatedTransactions = {
  results: [],
  count: 0,
  offset: 0,
  next_cursor: null,
  previous_cursor: null,
  sort: 'date',
  sort_dir: 'desc',
};

describe('SummaryPage stale request regression', () => {
  it('ignores a stale response for the previous household after switching', async () => {
    const forA = deferred<Summary>();
    const forB = deferred<Summary>();
    const getSummary = vi.mocked(summaryService.getSummary);
    getSummary.mockReturnValueOnce(forA.promise).mockReturnValueOnce(forB.promise);

    renderPage();

    await waitFor(() =>
      expect(getSummary).toHaveBeenCalledWith(expect.objectContaining({ household_id: 1 })),
    );

    // Switch to household B while A's request is still pending.
    fireEvent.click(screen.getByRole('button', { name: /alpha household/i }));
    fireEvent.click(screen.getByText('Beta Household'));

    await waitFor(() =>
      expect(getSummary).toHaveBeenCalledWith(expect.objectContaining({ household_id: 2 })),
    );

    // B's request resolves first...
    forB.resolve(makeSummary({ balance: 222 }));
    await screen.findByText(/\$222\.00/);

    // ...then A's stale request resolves late. It must not clobber the page.
    forA.resolve(makeSummary({ balance: 111 }));
    await new Promise(resolve => setTimeout(resolve, 0));

    expect(screen.getByText(/\$222\.00/)).toBeDefined();
    expect(screen.queryByText(/\$111\.00/)).toBeNull();
  });
});

// Issue #338 follow-up (PR review): the dialog and row unit tests each
// cover their own half of this feature in isolation — neither would catch
// a regression in the wiring between them (e.g. a prop renamed or dropped
// in pages/summary/index.tsx). This exercises the real path: a click on a
// SummarySection label row must open LabelTransactionsDialog and fetch with
// that label's id and the selected month's actual date_from/date_to, not
// just "some" params.
describe('SummaryPage label-transactions dialog wiring', () => {
  it('opens the dialog and fetches transactions for the clicked label within the selected month', async () => {
    vi.mocked(summaryService.getSummary).mockResolvedValue(
      makeSummary({
        spending: [
          {
            category_id: 2,
            category_name: 'Food',
            total: -42.57,
            labels: [
              {
                label_id: 2,
                label_name: 'Groceries',
                label_color: '#16a34a',
                category_id: 2,
                category_name: 'Food',
                total: -42.57,
              },
            ],
          },
        ],
      }),
    );
    const listTransactions = vi.mocked(transactionsService.listTransactions);
    listTransactions.mockResolvedValue(EMPTY_TRANSACTIONS_PAGE);

    renderPage(['/?month=2026-03']);

    fireEvent.click(await screen.findByText('Groceries'));

    await waitFor(() =>
      expect(listTransactions).toHaveBeenCalledWith({
        household_id: HOUSEHOLD_A.id,
        label_id: 2,
        date_from: '2026-03-01',
        date_to: '2026-03-31',
        exclude_from_summary: false,
      }),
    );
  });
});
