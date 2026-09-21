// context/active-household-context.test.tsx

import { act, fireEvent, render, renderHook, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it } from 'vitest';

import { ActiveHouseholdProvider, useActiveHousehold } from '@context/active-household-context';
import { AuthProvider, useAuth } from '@context/auth-context';
import type { User } from '@serve/types/global';

const HOUSEHOLDS = [
  { id: 2, name: 'Zeta Household' },
  { id: 1, name: 'Alpha Household' },
];

function makeUser(overrides: Partial<User> = {}): User {
  return {
    id: 1,
    email: 'a@b.com',
    first_name: 'A',
    last_name: 'B',
    username: 'ab',
    households: HOUSEHOLDS,
    ...overrides,
  };
}

function wrapperFor(user: User | null) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <AuthProvider value={{ user, setUser: () => {}, isLoading: false, sessionError: false }}>
        <ActiveHouseholdProvider>{children}</ActiveHouseholdProvider>
      </AuthProvider>
    );
  };
}

beforeEach(() => localStorage.clear());

describe('useActiveHousehold default selection', () => {
  it('defaults to the alphabetically-first household when nothing is stored', async () => {
    const { result } = renderHook(() => useActiveHousehold(), { wrapper: wrapperFor(makeUser()) });
    await waitFor(() => expect(result.current.activeHousehold?.id).toBe(1));
    expect(result.current.activeHousehold?.name).toBe('Alpha Household');
  });

  it('is null when the user has no households', async () => {
    const { result } = renderHook(() => useActiveHousehold(), {
      wrapper: wrapperFor(makeUser({ households: [] })),
    });
    await waitFor(() => expect(result.current.households).toEqual([]));
    expect(result.current.activeHousehold).toBeNull();
  });

  it('is null when there is no signed-in user', () => {
    const { result } = renderHook(() => useActiveHousehold(), { wrapper: wrapperFor(null) });
    expect(result.current.activeHousehold).toBeNull();
    expect(result.current.households).toEqual([]);
  });
});

describe('useActiveHousehold persistence', () => {
  it('persists the selection to localStorage keyed by user id', async () => {
    const { result } = renderHook(() => useActiveHousehold(), { wrapper: wrapperFor(makeUser()) });
    await waitFor(() => expect(result.current.activeHousehold).not.toBeNull());

    act(() => result.current.setActiveHousehold(HOUSEHOLDS[0]));

    expect(result.current.activeHousehold?.id).toBe(2);
    expect(localStorage.getItem('serve:activeHouseholdId:1')).toBe('2');
  });

  it('restores the stored household on next mount', async () => {
    localStorage.setItem('serve:activeHouseholdId:1', '2');
    const { result } = renderHook(() => useActiveHousehold(), { wrapper: wrapperFor(makeUser()) });
    await waitFor(() => expect(result.current.activeHousehold?.id).toBe(2));
  });

  it('persists the alphabetical-first fallback once resolved, with nothing stored beforehand', async () => {
    renderHook(() => useActiveHousehold(), { wrapper: wrapperFor(makeUser()) });
    await waitFor(() => expect(localStorage.getItem('serve:activeHouseholdId:1')).toBe('1'));
  });
});

describe('useActiveHousehold fallback', () => {
  it('falls back to the alphabetical-first household when the stored id no longer matches a household', async () => {
    localStorage.setItem('serve:activeHouseholdId:1', '999');
    const { result } = renderHook(() => useActiveHousehold(), { wrapper: wrapperFor(makeUser()) });
    await waitFor(() => expect(result.current.activeHousehold?.id).toBe(1));
  });

  // Regression: the fallback is recomputed from the current household list
  // every render, so it must be locked in (persisted) the first time it's
  // used — otherwise renaming a household so it now sorts earlier would
  // silently swap the active household out from under the user.
  it('keeps the already-resolved fallback active even if a later rename would change the alphabetical order', async () => {
    function Harness() {
      const { setUser } = useAuth();
      const { activeHousehold } = useActiveHousehold();
      return (
        <div>
          <span>{activeHousehold?.name ?? 'none'}</span>
          <button
            type="button"
            onClick={() =>
              setUser(prev =>
                prev
                  ? {
                      ...prev,
                      households: prev.households.map(h =>
                        h.id === 2 ? { ...h, name: 'AAA Household' } : h,
                      ),
                    }
                  : prev,
              )
            }
          >
            Rename Zeta to AAA Household
          </button>
        </div>
      );
    }

    render(
      <AuthProvider
        value={{ user: makeUser(), setUser: () => {}, isLoading: false, sessionError: false }}
      >
        <ActiveHouseholdProvider>
          <Harness />
        </ActiveHouseholdProvider>
      </AuthProvider>,
    );

    // Alpha resolves first (alphabetically) and gets persisted.
    await screen.findByText('Alpha Household');
    await waitFor(() => expect(localStorage.getItem('serve:activeHouseholdId:1')).toBe('1'));

    // Renaming "Zeta" so it now sorts before "Alpha" must not un-seat it.
    fireEvent.click(screen.getByRole('button', { name: /rename/i }));

    expect(screen.getByText('Alpha Household')).toBeDefined();
  });
});

describe('useActiveHousehold outside provider', () => {
  it('throws when used outside an ActiveHouseholdProvider', () => {
    expect(() => renderHook(() => useActiveHousehold())).toThrow(
      'useActiveHousehold must be used within an ActiveHouseholdProvider',
    );
  });
});
