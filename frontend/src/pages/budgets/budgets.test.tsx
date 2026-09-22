// pages/budgets/budgets.test.tsx — Unit tests for BudgetsPage.

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ActiveHouseholdProvider } from '@context/active-household-context';
import { BudgetsPage } from '@pages/budgets';
import { makeBudget } from '@serve/mocks';
import * as budgetsService from '@services/budgets';
import * as categoriesService from '@services/categories';
import * as labelsService from '@services/labels';

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

const BUDGETS = [
  makeBudget({ id: 1, name: 'January Budget', type: 'spending' }),
  makeBudget({
    id: 2,
    name: 'Iceland Trip',
    type: 'project',
    period_start: null,
    period_end: null,
  }),
];

function renderPage() {
  return render(
    <MemoryRouter>
      <ActiveHouseholdProvider>
        <BudgetsPage />
      </ActiveHouseholdProvider>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(budgetsService, 'listBudgets').mockResolvedValue(BUDGETS);
  vi.spyOn(budgetsService, 'listBudgetLines').mockResolvedValue([]);
  vi.spyOn(categoriesService, 'listCategories').mockResolvedValue([]);
  vi.spyOn(labelsService, 'listLabels').mockResolvedValue([]);
});

describe('BudgetsPage rendering', () => {
  it('fetches budgets for the active household', async () => {
    renderPage();
    await waitFor(() => expect(budgetsService.listBudgets).toHaveBeenCalledWith(1));
  });

  it('renders a card per budget, including a project budget with no period', async () => {
    renderPage();
    await screen.findByText('January Budget');
    expect(screen.getByText('Iceland Trip')).toBeDefined();
    expect(screen.getByText('No fixed period')).toBeDefined();
  });

  it('shows an empty-state message when there are no budgets', async () => {
    vi.spyOn(budgetsService, 'listBudgets').mockResolvedValue([]);
    renderPage();
    await screen.findByText(/no budgets yet/i);
  });

  it('shows an error message with a retry button on failure', async () => {
    vi.spyOn(budgetsService, 'listBudgets').mockRejectedValueOnce(new Error('boom'));
    renderPage();
    await screen.findByText('Could not load budgets.');
    expect(screen.getByRole('button', { name: /retry/i })).toBeDefined();
  });

  it('retries the fetch when Retry is clicked', async () => {
    vi.spyOn(budgetsService, 'listBudgets')
      .mockRejectedValueOnce(new Error('boom'))
      .mockResolvedValueOnce(BUDGETS);

    renderPage();
    await screen.findByText('Could not load budgets.');
    fireEvent.click(screen.getByRole('button', { name: /retry/i }));

    await screen.findByText('January Budget');
  });
});

describe('BudgetsPage create budget', () => {
  it('creates a spending budget with a period and adds it to the list', async () => {
    vi.spyOn(budgetsService, 'listBudgets').mockResolvedValue([]);
    vi.spyOn(budgetsService, 'createBudget').mockResolvedValue(
      makeBudget({ id: 3, name: 'February Budget' }),
    );

    renderPage();
    await screen.findByText(/no budgets yet/i);

    fireEvent.change(screen.getByLabelText(/budget name/i), {
      target: { value: 'February Budget' },
    });
    fireEvent.change(screen.getByLabelText('From'), { target: { value: '2026-02-01' } });
    fireEvent.change(screen.getByLabelText('To'), { target: { value: '2026-02-28' } });
    fireEvent.click(screen.getByRole('button', { name: /^create$/i }));

    await waitFor(() =>
      expect(budgetsService.createBudget).toHaveBeenCalledWith({
        name: 'February Budget',
        type: 'spending',
        household_id: 1,
        period_start: '2026-02-01',
        period_end: '2026-02-28',
      }),
    );
    await screen.findByText('February Budget');
  });

  it('does not require period dates for a project budget', async () => {
    vi.spyOn(budgetsService, 'listBudgets').mockResolvedValue([]);
    vi.spyOn(budgetsService, 'createBudget').mockResolvedValue(
      makeBudget({ id: 3, name: 'Trip', type: 'project', period_start: null, period_end: null }),
    );

    renderPage();
    await screen.findByText(/no budgets yet/i);

    fireEvent.change(screen.getByLabelText(/budget name/i), { target: { value: 'Trip' } });
    fireEvent.mouseDown(screen.getByLabelText(/^type$/i));
    fireEvent.click(await screen.findByRole('option', { name: 'Project' }));
    fireEvent.click(screen.getByRole('button', { name: /^create$/i }));

    await waitFor(() =>
      expect(budgetsService.createBudget).toHaveBeenCalledWith({
        name: 'Trip',
        type: 'project',
        household_id: 1,
        period_start: undefined,
        period_end: undefined,
      }),
    );
  });
});

describe('BudgetsPage deactivate budget', () => {
  it('removes the budget from the list after deactivating', async () => {
    vi.spyOn(budgetsService, 'listBudgets').mockResolvedValue([BUDGETS[0]]);
    vi.spyOn(budgetsService, 'deleteBudget').mockResolvedValue(undefined);

    renderPage();
    await screen.findByText('January Budget');

    fireEvent.click(screen.getByRole('button', { name: /deactivate budget/i }));
    fireEvent.click(screen.getByRole('button', { name: /yes, deactivate/i }));

    await waitFor(() => expect(budgetsService.deleteBudget).toHaveBeenCalledWith(1));
    await waitFor(() => expect(screen.queryByText('January Budget')).toBeNull());
  });
});

describe('BudgetsPage category management dialog', () => {
  it('opens the household-wide CategoryManagementDialog when Manage categories is clicked', async () => {
    renderPage();
    await screen.findByText('January Budget');
    fireEvent.click(screen.getByRole('button', { name: /manage categories/i }));
    expect(screen.getByRole('dialog')).toBeDefined();
    // Let the dialog's own category/label fetch settle before the test ends.
    await screen.findByRole('button', { name: /new category/i });
  });
});
