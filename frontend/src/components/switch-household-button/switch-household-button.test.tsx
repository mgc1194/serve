// components/switch-household-button/switch-household-button.test.tsx

import { Typography } from '@mui/material';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
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

function setup(
  households: Household[] = HOUSEHOLDS,
  props: Partial<React.ComponentProps<typeof SwitchHouseholdButton>> = {},
) {
  return render(
    <AuthProvider
      value={{ user: makeUser(households), setUser: () => {}, isLoading: false, sessionError: false }}
    >
      <ActiveHouseholdProvider>
        <SwitchHouseholdButton {...props} />
      </ActiveHouseholdProvider>
    </AuthProvider>,
  );
}

function setupNestedInHeading(households: Household[] = HOUSEHOLDS) {
  return render(
    <AuthProvider
      value={{ user: makeUser(households), setUser: () => {}, isLoading: false, sessionError: false }}
    >
      <ActiveHouseholdProvider>
        <Typography variant="h4">
          <SwitchHouseholdButton sx={{ font: 'inherit' }} />
        </Typography>
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

  it('updates the button label after selecting a different household', async () => {
    setup();
    fireEvent.click(screen.getByRole('button', { name: /alpha household/i }));
    fireEvent.click(screen.getByText('Beta Household'));
    // The dialog's own list item is also named "Beta Household" and briefly
    // overlaps with the (closing) trigger button during the exit transition
    // — wait for the dialog to fully close so this only matches the trigger.
    await waitFor(() => expect(screen.queryByText('Switch household')).toBeNull());
    expect(screen.getByRole('button', { name: /beta household/i })).toBeDefined();
  });
});

describe('SwitchHouseholdButton nested inside a heading', () => {
  it('keeps the heading in the accessibility tree, with the button as its content', () => {
    setupNestedInHeading();
    const heading = screen.getByRole('heading', { level: 4, name: /alpha household/i });
    expect(heading).toBeDefined();
    expect(
      screen.getByRole('button', { name: /alpha household/i }).closest('h4'),
    ).toBe(heading);
  });

  it('still opens the switch dialog on click', () => {
    setupNestedInHeading();
    fireEvent.click(screen.getByRole('button', { name: /alpha household/i }));
    expect(screen.getByText('Switch household')).toBeDefined();
    expect(screen.getByText('Beta Household')).toBeDefined();
  });
});
