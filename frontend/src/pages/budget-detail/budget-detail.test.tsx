// pages/budget-detail/budget-detail.test.tsx

import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ActiveHouseholdProvider } from '@context/active-household-context';
import { BudgetDetailPage } from '@pages/budget-detail';
import { makeBudget } from '@serve/mocks';
import * as budgetsService from '@services/budgets';

vi.mock('@context/auth-context', () => ({
  useAuth: () => ({
    user: {
      id: 1,
      email: 'test@example.com',
      first_name: 'Test',
      last_name: 'User',
      username: 'test',
      households: [{ id: 1, name: 'Test Household' }],
    },
    setUser: vi.fn(),
  }),
}));
vi.mock('@layout/app-header', () => ({ AppHeader: () => <header /> }));

const BUDGET = makeBudget({ id: 9, name: 'Monthly Budget' });

function renderPage(id = '9') {
  return render(
    <MemoryRouter initialEntries={[`/budgets/${id}`]}>
      <ActiveHouseholdProvider>
        <Routes>
          <Route path="/budgets/:id" element={<BudgetDetailPage />} />
        </Routes>
      </ActiveHouseholdProvider>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(budgetsService, 'listBudgets').mockResolvedValue([BUDGET]);
});

describe('BudgetDetailPage rendering', () => {
  it('renders the budget name', async () => {
    renderPage();
    await screen.findByText('Monthly Budget');
  });

  it("shows the budget's period range", async () => {
    renderPage();
    await screen.findByText('Monthly Budget');
    expect(screen.getByText('01/01/2026 – 01/31/2026')).toBeDefined();
  });

  it('shows "No fixed period" for a project budget', async () => {
    vi.spyOn(budgetsService, 'listBudgets').mockResolvedValue([
      makeBudget({ id: 9, name: 'Iceland Trip', type: 'project', period_start: null, period_end: null }),
    ]);
    renderPage();
    await screen.findByText('Iceland Trip');
    expect(screen.getByText('No fixed period')).toBeDefined();
  });

  it('shows "Budget not found." when no budget matches the id', async () => {
    renderPage('999');
    await screen.findByText('Budget not found.');
  });

  it('shows an error message with a retry button on failure', async () => {
    vi.spyOn(budgetsService, 'listBudgets').mockRejectedValueOnce(new Error('boom'));
    renderPage();
    await screen.findByText('Could not load budget.');
    expect(screen.getByRole('button', { name: /retry/i })).toBeDefined();
  });
});
