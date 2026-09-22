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
import { describe, expect, it, vi } from 'vitest';

import { ActiveHouseholdProvider } from '@context/active-household-context';
import { AuthProvider } from '@context/auth-context';
import { SummaryPage } from '@pages/summary';
import { makeHousehold, makeUser } from '@serve/mocks';
import type { Summary } from '@serve/types/global';
import * as summaryService from '@services/summary';

vi.mock('@services/summary');
vi.mock('@layout/app-header', () => ({ AppHeader: () => <header /> }));

const HOUSEHOLD_A = makeHousehold({ id: 1, name: 'Alpha Household' });
const HOUSEHOLD_B = makeHousehold({ id: 2, name: 'Beta Household' });

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

function renderPage() {
  return render(
    <MemoryRouter>
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
