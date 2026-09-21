// components/switch-household-button/switch-household-button.test.tsx

import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';

import { SwitchHouseholdButton } from '@components/switch-household-button';
import { ActiveHouseholdProvider } from '@context/active-household-context';
import { AuthProvider } from '@context/auth-context';
import type { Household, User } from '@serve/types/global';

const HOUSEHOLDS: Household[] = [
  { id: 1, name: 'Alpha Household' },
  { id: 2, name: 'Beta Household' },
];

function makeUser(households: Household[]): User {
  return {
    id: 1,
    email: 'a@b.com',
    first_name: 'A',
    last_name: 'B',
    username: 'ab',
    households,
  };
}

function setup(households: Household[] = HOUSEHOLDS) {
  return render(
    <AuthProvider
      value={{ user: makeUser(households), setUser: () => {}, isLoading: false, sessionError: false }}
    >
      <ActiveHouseholdProvider>
        <SwitchHouseholdButton />
      </ActiveHouseholdProvider>
    </AuthProvider>,
  );
}

beforeEach(() => localStorage.clear());

describe('SwitchHouseholdButton rendering', () => {
  it('shows the alphabetically-first household name by default', () => {
    setup();
    expect(screen.getByRole('button', { name: /alpha household/i })).toBeDefined();
  });

  it('is disabled when the user has no households', () => {
    setup([]);
    expect(screen.getByRole('button').hasAttribute('disabled')).toBe(true);
  });
});

describe('SwitchHouseholdButton interactions', () => {
  it('opens the switch dialog on click', () => {
    setup();
    fireEvent.click(screen.getByRole('button', { name: /alpha household/i }));
    expect(screen.getByText('Switch household')).toBeDefined();
    expect(screen.getByText('Beta Household')).toBeDefined();
  });

  it('updates the button label after selecting a different household', () => {
    setup();
    fireEvent.click(screen.getByRole('button', { name: /alpha household/i }));
    fireEvent.click(screen.getByText('Beta Household'));
    expect(screen.getByRole('button', { name: /beta household/i })).toBeDefined();
  });
});
