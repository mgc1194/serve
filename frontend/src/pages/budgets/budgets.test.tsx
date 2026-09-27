// pages/budgets/budgets.test.tsx — Unit tests for BudgetsPage.

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ActiveHouseholdProvider } from '@context/active-household-context';
import { useAuth } from '@context/auth-context';
import { BudgetsPage } from '@pages/budgets';
import { makeBudget } from '@serve/mocks';
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

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(budgetsService, 'listBudgets').mockResolvedValue([]);
});

describe('BudgetsPage rendering', () => {
  it('renders the Budgets title', async () => {
    mockUser([HOUSEHOLD]);
    renderPage();
    expect(screen.getByRole('heading', { name: 'Budgets' })).toBeDefined();
    await waitFor(() => expect(budgetsService.listBudgets).toHaveBeenCalled());
  });

  it('navigates to the dashboard when Dashboard is clicked', async () => {
    mockUser([HOUSEHOLD]);
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: /dashboard/i }));
    expect(screen.getByText('Dashboard page')).toBeDefined();
    await waitFor(() => expect(budgetsService.listBudgets).toHaveBeenCalled());
  });

  it('shows a Create budget button for the active household', async () => {
    mockUser([HOUSEHOLD]);
    renderPage();
    expect(screen.getByText('Showing budgets in Test Household')).toBeDefined();
    expect(screen.getByRole('button', { name: /^create budget$/i })).toBeDefined();
    await waitFor(() => expect(budgetsService.listBudgets).toHaveBeenCalled());
  });

  it('does not show a Create budget button when no household is selected', () => {
    mockUser([]);
    renderPage();
    expect(screen.getByText('No household selected.')).toBeDefined();
    expect(screen.queryByRole('button', { name: /^create budget$/i })).toBeNull();
  });
});

describe('BudgetsPage list', () => {
  it('fetches budgets for the active household', async () => {
    mockUser([HOUSEHOLD]);
    renderPage();
    await waitFor(() => expect(budgetsService.listBudgets).toHaveBeenCalledWith(1));
  });

  it('renders a card per budget', async () => {
    mockUser([HOUSEHOLD]);
    vi.spyOn(budgetsService, 'listBudgets').mockResolvedValue([
      makeBudget({ id: 1, name: 'January 2026' }),
      makeBudget({ id: 2, name: 'Iceland Trip', type: 'project', period_start: null, period_end: null }),
    ]);
    renderPage();
    await screen.findByText('January 2026');
    expect(screen.getByText('Iceland Trip')).toBeDefined();
  });

  it('shows an empty-state message when there are no budgets', async () => {
    mockUser([HOUSEHOLD]);
    renderPage();
    await screen.findByText(/no budgets yet/i);
  });

  it('shows an error message with a retry button on failure', async () => {
    mockUser([HOUSEHOLD]);
    vi.spyOn(budgetsService, 'listBudgets').mockRejectedValueOnce(new Error('boom'));
    renderPage();
    await screen.findByText('Could not load budgets.');
    expect(screen.getByRole('button', { name: /retry/i })).toBeDefined();
  });

  it('retries the fetch when Retry is clicked', async () => {
    mockUser([HOUSEHOLD]);
    vi.spyOn(budgetsService, 'listBudgets')
      .mockRejectedValueOnce(new Error('boom'))
      .mockResolvedValueOnce([makeBudget({ id: 1, name: 'January 2026' })]);

    renderPage();
    await screen.findByText('Could not load budgets.');
    fireEvent.click(screen.getByRole('button', { name: /retry/i }));

    await screen.findByText('January 2026');
  });
});

describe('BudgetsPage create budget', () => {
  it('opens CreateBudgetDialog for the active household when Create budget is clicked', async () => {
    mockUser([HOUSEHOLD]);
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: /^create budget$/i }));
    expect(screen.getByRole('dialog')).toBeDefined();
    expect(screen.getByText('New budget')).toBeDefined();
    await waitFor(() => expect(budgetsService.listBudgets).toHaveBeenCalled());
  });

  it('closes the dialog and adds the new budget to the list after a successful create', async () => {
    mockUser([HOUSEHOLD]);
    vi.spyOn(budgetsService, 'createBudget').mockResolvedValue(
      makeBudget({ id: 1, name: 'August 2026' }),
    );

    renderPage();
    await waitFor(() => expect(budgetsService.listBudgets).toHaveBeenCalled());
    fireEvent.click(screen.getByRole('button', { name: /^create budget$/i }));

    fireEvent.change(screen.getByLabelText('Month'), { target: { value: '2026-08' } });
    fireEvent.click(screen.getByRole('button', { name: /^create$/i }));

    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(screen.getByText('August 2026')).toBeDefined();
  });
});
