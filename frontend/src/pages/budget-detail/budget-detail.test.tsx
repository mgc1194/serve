// pages/budget-detail/budget-detail.test.tsx

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ActiveHouseholdProvider } from '@context/active-household-context';
import { BudgetDetailPage } from '@pages/budget-detail';
import { makeBudget, makeBudgetLine, makeCategory } from '@serve/mocks';
import * as budgetsService from '@services/budgets';
import * as categoriesService from '@services/categories';

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

const LINES = [
  makeBudgetLine({
    id: 1,
    category_id: 1,
    category_name: 'Paycheck',
    category_type: 'earning',
    planned_amount: 12680,
    actual_amount: '10000.00',
  }),
  makeBudgetLine({
    id: 2,
    category_id: 2,
    category_name: 'Retirement',
    category_type: 'spending',
    planned_amount: 1170,
    actual_amount: '500.00',
  }),
];

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
  vi.spyOn(budgetsService, 'listBudgetLines').mockResolvedValue(LINES);
  vi.spyOn(categoriesService, 'listCategories').mockResolvedValue([]);
});

describe('BudgetDetailPage rendering', () => {
  it('renders the budget name and both sections', async () => {
    renderPage();
    await screen.findByText('Monthly Budget');
    expect(screen.getByText('Income')).toBeDefined();
    expect(screen.getByText('Expenses')).toBeDefined();
    expect(screen.getByText('Paycheck')).toBeDefined();
    expect(screen.getByText('Retirement')).toBeDefined();
  });

  it('shows the budget\'s period range', async () => {
    renderPage();
    await screen.findByText('Monthly Budget');
    expect(screen.getByText('2026-01-01 – 2026-01-31')).toBeDefined();
  });

  it('shows the "Saved this period" headline as actual income minus actual expenses', async () => {
    // 10000 (Paycheck actual) - 500 (Retirement actual) = 9500.
    renderPage();
    await screen.findByText('Monthly Budget');
    expect(screen.getByText('$9,500.00')).toBeDefined();
    expect(screen.getByText(/saved this period/i)).toBeDefined();
  });

  it('labels the headline "Saved this budget" for a project budget', async () => {
    vi.spyOn(budgetsService, 'listBudgets').mockResolvedValue([
      makeBudget({ id: 9, name: 'Iceland Trip', type: 'project', period_start: null, period_end: null }),
    ]);
    renderPage();
    await screen.findByText('Iceland Trip');
    expect(screen.getByText(/saved this budget/i)).toBeDefined();
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

describe('BudgetDetailPage planned amount editing', () => {
  it('calls updateBudgetLine when a planned amount is edited', async () => {
    vi.spyOn(budgetsService, 'updateBudgetLine').mockResolvedValue({
      ...LINES[1],
      planned_amount: 1500,
    });

    renderPage();
    await screen.findByText('Retirement');

    const inputs = screen.getAllByLabelText(/planned amount/i);
    const retirementInput = inputs.find(
      i => (i as HTMLInputElement).value === '1170',
    ) as HTMLInputElement;
    fireEvent.change(retirementInput, { target: { value: '1500' } });
    fireEvent.blur(retirementInput);

    await waitFor(() =>
      expect(budgetsService.updateBudgetLine).toHaveBeenCalledWith(2, {
        planned_amount: 1500,
      }),
    );
  });
});

describe('BudgetDetailPage remove category', () => {
  it('calls deleteBudgetLine and removes the row when a category is removed', async () => {
    vi.spyOn(budgetsService, 'deleteBudgetLine').mockResolvedValue(undefined);

    renderPage();
    await screen.findByText('Retirement');
    fireEvent.click(screen.getByRole('button', { name: /remove retirement/i }));

    await waitFor(() => expect(budgetsService.deleteBudgetLine).toHaveBeenCalledWith(2));
    await waitFor(() => expect(screen.queryByText('Retirement')).toBeNull());
  });
});

describe('BudgetDetailPage add category', () => {
  it('excludes already-added categories and adds the checked ones via createBudgetLine', async () => {
    vi.spyOn(categoriesService, 'listCategories').mockResolvedValue([
      makeCategory({ id: 1, name: 'Paycheck', type: 'earning' }),
      makeCategory({ id: 3, name: 'Utilities', type: 'spending' }),
    ]);
    vi.spyOn(budgetsService, 'createBudgetLine').mockResolvedValue(
      makeBudgetLine({
        id: 3,
        category_id: 3,
        category_name: 'Utilities',
        category_type: 'spending',
      }),
    );

    renderPage();
    await screen.findByText('Retirement');

    fireEvent.mouseDown(screen.getByLabelText(/^add categories$/i));
    expect(screen.queryByRole('option', { name: 'Paycheck' })).toBeNull();
    fireEvent.click(await screen.findByRole('option', { name: 'Utilities' }));
    fireEvent.keyDown(screen.getByRole('listbox'), { key: 'Escape' });
    fireEvent.click(screen.getByRole('button', { name: /^add$/i }));

    await waitFor(() =>
      expect(budgetsService.createBudgetLine).toHaveBeenCalledWith(9, {
        category_id: 3,
        planned_amount: 0,
      }),
    );
    await screen.findAllByText('Utilities');
  });
});
