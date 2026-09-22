// pages/accounts/accounts.test.tsx — Unit test for the AccountsPage
// stale-request regression.
//
// Regresses to a bug where switching the active household while an
// in-flight listAccounts() request for the previous household was still
// pending could let that stale response resolve after the new household's
// response and overwrite the table with the wrong household's accounts.
// This suite switches households mid-fetch, resolves the requests out of
// order, and asserts the table reflects only the latest household.

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it, vi } from 'vitest';

import { ActiveHouseholdProvider } from '@context/active-household-context';
import { AuthProvider } from '@context/auth-context';
import { AccountsPage } from '@pages/accounts';
import { makeAccount, makeHousehold, makeUser } from '@serve/mocks';
import type { AccountDetail } from '@serve/types/global';
import * as accountsService from '@services/accounts';

vi.mock('@services/accounts');
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
          <AccountsPage />
        </ActiveHouseholdProvider>
      </AuthProvider>
    </MemoryRouter>,
  );
}

describe('AccountsPage stale request regression', () => {
  it('ignores a stale response for the previous household after switching', async () => {
    const forA = deferred<AccountDetail[]>();
    const forB = deferred<AccountDetail[]>();
    const listAccounts = vi.mocked(accountsService.listAccounts);
    listAccounts.mockReturnValueOnce(forA.promise).mockReturnValueOnce(forB.promise);

    renderPage();

    await waitFor(() => expect(listAccounts).toHaveBeenCalledWith({ household_id: 1 }));

    // Switch to household B while A's request is still pending.
    fireEvent.click(screen.getByRole('button', { name: /alpha household/i }));
    fireEvent.click(screen.getByText('Beta Household'));

    await waitFor(() => expect(listAccounts).toHaveBeenCalledWith({ household_id: 2 }));

    // B's request resolves first...
    forB.resolve([
      makeAccount({ id: 2, name: "Beta's Checking", household_id: 2, household_name: 'Beta Household' }),
    ]);
    await screen.findByText("Beta's Checking");

    // ...then A's stale request resolves late. It must not clobber the table.
    forA.resolve([
      makeAccount({ id: 1, name: "Alpha's Savings", household_id: 1, household_name: 'Alpha Household' }),
    ]);
    await new Promise(resolve => setTimeout(resolve, 0));

    expect(screen.getByText("Beta's Checking")).toBeDefined();
    expect(screen.queryByText("Alpha's Savings")).toBeNull();
  });
});
