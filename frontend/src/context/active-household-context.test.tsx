// context/active-household-context.test.tsx

import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it } from 'vitest';

import { ActiveHouseholdProvider, useActiveHousehold } from '@context/active-household-context';
import { AuthProvider } from '@context/auth-context';
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
});

describe('useActiveHousehold fallback', () => {
  it('falls back to the alphabetical-first household when the stored id no longer matches a household', async () => {
    localStorage.setItem('serve:activeHouseholdId:1', '999');
    const { result } = renderHook(() => useActiveHousehold(), { wrapper: wrapperFor(makeUser()) });
    await waitFor(() => expect(result.current.activeHousehold?.id).toBe(1));
  });
});

describe('useActiveHousehold outside provider', () => {
  it('throws when used outside an ActiveHouseholdProvider', () => {
    expect(() => renderHook(() => useActiveHousehold())).toThrow(
      'useActiveHousehold must be used within an ActiveHouseholdProvider',
    );
  });
});
