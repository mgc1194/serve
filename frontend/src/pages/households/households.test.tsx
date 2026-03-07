// pages/households/index.test.tsx — Unit tests for the HouseholdsPage.

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { HouseholdsPage } from '@pages/households';
import * as accountsService from '@services/accounts';
import * as service from '@services/households';

vi.mock('@context/auth-context', () => ({
  useAuth: () => ({
    user: { id: 1, email: 'test@example.com', first_name: 'Test', last_name: 'User', username: 'test', households: [] },
    setUser: vi.fn(),
  }),
}));
vi.mock('@layout/app-header', () => ({ AppHeader: () => <header /> }));

// CreateAccountDialog is a multi-step dialog that fetches banks — stub it out
// so HouseholdsPage tests stay focused on page-level concerns.
// The stub exposes both onClose and onCreated so dialog lifecycle can be tested.
vi.mock('@pages/accounts/create-account-dialog', () => ({
  CreateAccountDialog: ({
    open,
    onClose,
    onCreated,
  }: {
    open: boolean;
    onClose: () => void;
    onCreated: () => void;
  }) =>
    open ? (
      <div role="dialog">
        <button type="button" onClick={onClose}>Close dialog</button>
        <button type="button" onClick={onCreated}>Create account</button>
      </div>
    ) : null,
}));

const mockNavigate = vi.fn();
vi.mock('react-router', async () => {
  const actual = await vi.importActual('react-router');
  return { ...actual, useNavigate: () => mockNavigate };
});

const household = {
  id: 1,
  name: 'Test Household',
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
  members: [
    { id: 1, email: 'test@example.com', first_name: 'Test', last_name: 'User' },
  ],
};

const account = {
  id: 1,
  name: "Alice's Savings",
  handler_key: 'co-savings',
  account_type_id: 1,
  account_type: '360 Performance Savings',
  bank_id: 1,
  bank_name: 'Capital One',
  household_id: 1,
  household_name: 'Test Household',
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
};

function renderPage() {
  return render(
    <MemoryRouter>
      <HouseholdsPage />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.spyOn(service, 'listHouseholds').mockResolvedValue([household]);
  vi.spyOn(accountsService, 'listAccounts').mockResolvedValue([account]);
  mockNavigate.mockReset();
});

// ── Loading and rendering ─────────────────────────────────────────────────────

describe('HouseholdsPage', () => {
  it('renders skeletons while loading', () => {
    vi.spyOn(service, 'listHouseholds').mockReturnValue(new Promise(() => {}));
    renderPage();
    expect(document.querySelectorAll('.MuiSkeleton-root').length).toBeGreaterThan(0);
  });

  it('renders household name after loading', async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText('Test Household')).toBeDefined());
  });

  it('shows empty state when no households', async () => {
    vi.spyOn(service, 'listHouseholds').mockResolvedValue([]);
    renderPage();
    await waitFor(() => expect(screen.getByText(/No households yet/)).toBeDefined());
  });

  it('shows error alert when load fails', async () => {
    vi.spyOn(service, 'listHouseholds').mockRejectedValue(new Error('Network error'));
    renderPage();
    await waitFor(() =>
      expect(screen.getByText(/could not load households/i)).toBeDefined(),
    );
  });

  it('retries and recovers after error', async () => {
    vi.spyOn(service, 'listHouseholds')
      .mockRejectedValueOnce(new Error('Network error'))
      .mockResolvedValueOnce([household]);
    renderPage();
    await waitFor(() => screen.getByText(/could not load households/i));
    await userEvent.click(screen.getByRole('button', { name: /retry/i }));
    await waitFor(() => expect(screen.getByText('Test Household')).toBeDefined());
  });

  it('renders member initials and email', async () => {
    renderPage();
    await waitFor(() => screen.getByText('Test Household'));
    expect(screen.getByText('TU')).toBeDefined();
    expect(screen.getByText('test@example.com')).toBeDefined();
  });
});

describe('HouseholdsPage account counts', () => {
  it('shows the correct account count on the card', async () => {
    vi.spyOn(accountsService, 'listAccounts').mockResolvedValue([account]);
    renderPage();
    await waitFor(() => expect(screen.getByText('1 account')).toBeDefined());
  });

  it('shows zero accounts when the household has none', async () => {
    vi.spyOn(accountsService, 'listAccounts').mockResolvedValue([]);
    renderPage();
    await waitFor(() => expect(screen.getByText('0 accounts')).toBeDefined());
  });

  it('shows fallback label when listAccounts fails', async () => {
    vi.spyOn(accountsService, 'listAccounts').mockRejectedValue(new Error('Network error'));
    renderPage();
    // Page still loads the household, count stays null → fallback label
    await waitFor(() => expect(screen.getByText('Test Household')).toBeDefined());
    expect(screen.getByText('Accounts')).toBeDefined();
  });

  it('resets count to zero when a new household is created', async () => {
    const newHousehold = { ...household, id: 2, name: 'New Household', members: [] };
    vi.spyOn(service, 'createHousehold').mockResolvedValue(newHousehold);
    renderPage();
    await waitFor(() => screen.getByText('Test Household'));

    await userEvent.type(screen.getByPlaceholderText('Household name'), 'New Household');
    await userEvent.click(screen.getByRole('button', { name: /create/i }));

    await waitFor(() => screen.getByText('New Household'));
    // The new card starts at 0 accounts
    expect(screen.getByText('0 accounts')).toBeDefined();
  });
});

describe('HouseholdsPage add account dialog', () => {
  it('opens the dialog when the Add account chip is clicked', async () => {
    renderPage();
    await waitFor(() => screen.getByText('Test Household'));
    await userEvent.click(screen.getByText('Add account'));
    expect(screen.getByRole('dialog')).toBeDefined();
  });

  it('closes the dialog when onClose is called', async () => {
    renderPage();
    await waitFor(() => screen.getByText('Test Household'));
    await userEvent.click(screen.getByText('Add account'));
    await userEvent.click(screen.getByRole('button', { name: /close dialog/i }));
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('increments the account count after an account is created', async () => {
    vi.spyOn(accountsService, 'listAccounts').mockResolvedValue([account]);
    renderPage();
    await waitFor(() => expect(screen.getByText('1 account')).toBeDefined());

    await userEvent.click(screen.getByText('Add account'));
    await userEvent.click(screen.getByRole('button', { name: /create account/i }));

    await waitFor(() => expect(screen.getByText('2 accounts')).toBeDefined());
  });
});

describe('CreateHouseholdForm', () => {
  it('creates household and appends to list', async () => {
    const newHousehold = { ...household, id: 2, name: 'New household', members: [] };
    vi.spyOn(service, 'createHousehold').mockResolvedValue(newHousehold);
    renderPage();
    await waitFor(() => screen.getByText('Test Household'));

    await userEvent.type(screen.getByPlaceholderText('Household name'), 'New household');
    await userEvent.click(screen.getByRole('button', { name: /create/i }));

    await waitFor(() => expect(screen.getByText('New household')).toBeDefined());
  });

  it('shows error when create fails', async () => {
    vi.spyOn(service, 'createHousehold').mockRejectedValue(
      new service.ApiError(400, 'You already have a household named "Test".'),
    );
    renderPage();
    await waitFor(() => screen.getByText('Test Household'));

    await userEvent.type(screen.getByPlaceholderText('Household name'), 'Test');
    await userEvent.click(screen.getByRole('button', { name: /create/i }));

    await waitFor(() =>
      expect(screen.getByText('You already have a household named "Test".')).toBeDefined(),
    );
  });
});

describe('HouseholdCard rename', () => {
  it('shows input with current name when edit is clicked', async () => {
    renderPage();
    await waitFor(() => screen.getByText('Test Household'));
    await userEvent.click(screen.getByRole('button', { name: /rename/i }));
    expect(screen.getByDisplayValue('Test Household')).toBeDefined();
  });

  it('updates household name on save', async () => {
    vi.spyOn(service, 'renameHousehold').mockResolvedValue({ ...household, name: 'Renamed' });
    renderPage();
    await waitFor(() => screen.getByText('Test Household'));
    await userEvent.click(screen.getByRole('button', { name: /rename/i }));
    const input = screen.getByDisplayValue('Test Household');
    await userEvent.clear(input);
    await userEvent.type(input, 'Renamed');
    await userEvent.click(screen.getByRole('button', { name: /save/i }));
    await waitFor(() => expect(screen.getByText('Renamed')).toBeDefined());
  });

  it('cancels editing without saving', async () => {
    renderPage();
    await waitFor(() => screen.getByText('Test Household'));
    await userEvent.click(screen.getByRole('button', { name: /rename/i }));
    await userEvent.click(screen.getByRole('button', { name: /cancel/i }));
    expect(screen.getByText('Test Household')).toBeDefined();
    expect(screen.queryByDisplayValue('Test Household')).toBeNull();
  });

  it('shows rename error on failure', async () => {
    vi.spyOn(service, 'renameHousehold').mockRejectedValue(
      new service.ApiError(400, 'You already have a household named "Other".'),
    );
    renderPage();
    await waitFor(() => screen.getByText('Test Household'));
    await userEvent.click(screen.getByRole('button', { name: /rename/i }));
    const input = screen.getByDisplayValue('Test Household');
    await userEvent.clear(input);
    await userEvent.type(input, 'Other');
    await userEvent.click(screen.getByRole('button', { name: /save/i }));
    await waitFor(() =>
      expect(screen.getByText('You already have a household named "Other".')).toBeDefined(),
    );
  });
});

describe('HouseholdCard add member', () => {
  it('adds member and updates the list', async () => {
    vi.spyOn(service, 'addMember').mockResolvedValue({
      ...household,
      members: [
        ...household.members,
        { id: 2, email: 'new@example.com', first_name: 'New', last_name: 'Person' },
      ],
    });
    renderPage();
    await waitFor(() => screen.getByText('Test Household'));
    await userEvent.type(
      screen.getByPlaceholderText('Add by email address'),
      'new@example.com',
    );
    await userEvent.click(screen.getByRole('button', { name: /add member/i }));
    await waitFor(() => expect(screen.getByText('new@example.com')).toBeDefined());
  });

  it('shows error when member email is not found', async () => {
    vi.spyOn(service, 'addMember').mockRejectedValue(
      new service.ApiError(400, 'No account found with that email address.'),
    );
    renderPage();
    await waitFor(() => screen.getByText('Test Household'));
    await userEvent.type(
      screen.getByPlaceholderText('Add by email address'),
      'unknown@example.com',
    );
    await userEvent.click(screen.getByRole('button', { name: /add member/i }));
    await waitFor(() =>
      expect(screen.getByText('No account found with that email address.')).toBeDefined(),
    );
  });
});

describe('HouseholdCard delete', () => {
  it('shows confirm buttons after clicking delete', async () => {
    renderPage();
    await waitFor(() => screen.getByText('Test Household'));
    await userEvent.click(screen.getByRole('button', { name: /delete household/i }));
    expect(screen.getByRole('button', { name: /yes, delete/i })).toBeDefined();
    expect(screen.getByRole('button', { name: /cancel/i })).toBeDefined();
  });

  it('cancels delete when cancel is clicked', async () => {
    renderPage();
    await waitFor(() => screen.getByText('Test Household'));
    await userEvent.click(screen.getByRole('button', { name: /delete household/i }));
    await userEvent.click(screen.getByRole('button', { name: /cancel/i }));
    expect(screen.queryByRole('button', { name: /yes, delete/i })).toBeNull();
  });

  it('removes card from list after successful delete', async () => {
    vi.spyOn(service, 'deleteHousehold').mockResolvedValue(undefined);
    renderPage();
    await waitFor(() => screen.getByText('Test Household'));
    await userEvent.click(screen.getByRole('button', { name: /delete household/i }));
    await userEvent.click(screen.getByRole('button', { name: /yes, delete/i }));
    await waitFor(() => expect(screen.queryByText('Test Household')).toBeNull());
  });

  it('shows delete error when delete fails', async () => {
    vi.spyOn(service, 'deleteHousehold').mockRejectedValue(
      new service.ApiError(409, 'This household still has accounts.'),
    );
    renderPage();
    await waitFor(() => screen.getByText('Test Household'));
    await userEvent.click(screen.getByRole('button', { name: /delete household/i }));
    await userEvent.click(screen.getByRole('button', { name: /yes, delete/i }));
    await waitFor(() =>
      expect(screen.getByText('This household still has accounts.')).toBeDefined(),
    );
  });
});
