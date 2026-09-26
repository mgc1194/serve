// pages/budgets/budgets.test.tsx — Unit tests for BudgetsPage.

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ActiveHouseholdProvider } from '@context/active-household-context';
import { useAuth } from '@context/auth-context';
import { BudgetsPage } from '@pages/budgets';
import * as budgetsService from '@services/budgets';

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

beforeEach(() => vi.clearAllMocks());

describe('BudgetsPage rendering', () => {
  it('renders the Budgets title', () => {
    mockUser([HOUSEHOLD]);
    renderPage();
    expect(screen.getByRole('heading', { name: 'Budgets' })).toBeDefined();
  });

  it('navigates to the dashboard when Dashboard is clicked', () => {
    mockUser([HOUSEHOLD]);
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: /dashboard/i }));
    expect(screen.getByText('Dashboard page')).toBeDefined();
  });

  it('shows a Create budget button for the active household', () => {
    mockUser([HOUSEHOLD]);
    renderPage();
    expect(screen.getByText('Showing budgets in Test Household')).toBeDefined();
    expect(screen.getByRole('button', { name: /^create budget$/i })).toBeDefined();
  });

  it('does not show a Create budget button when no household is selected', () => {
    mockUser([]);
    renderPage();
    expect(screen.getByText('No household selected.')).toBeDefined();
    expect(screen.queryByRole('button', { name: /^create budget$/i })).toBeNull();
  });
});

describe('BudgetsPage create budget', () => {
  it('opens CreateBudgetDialog for the active household when Create budget is clicked', () => {
    mockUser([HOUSEHOLD]);
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: /^create budget$/i }));
    expect(screen.getByRole('dialog')).toBeDefined();
    expect(screen.getByText('New budget')).toBeDefined();
  });

  it('closes the dialog after a successful create', async () => {
    mockUser([HOUSEHOLD]);
    vi.spyOn(budgetsService, 'createBudget').mockResolvedValue({
      id: 1,
      name: 'August 2026',
      type: 'period',
      period_start: '2026-08-01',
      period_end: '2026-08-31',
      is_active: true,
      household_id: 1,
    });

    renderPage();
    fireEvent.click(screen.getByRole('button', { name: /^create budget$/i }));

    fireEvent.change(screen.getByLabelText('Month'), { target: { value: '2026-08' } });
    fireEvent.click(screen.getByRole('button', { name: /^create$/i }));

    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  });
});
