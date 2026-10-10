// pages/households/household-detailed-card/household-categories-section.test.tsx

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render as rtlRender, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { HouseholdCategoriesSection } from '@pages/households/household-detailed-card/household-categories-section';
import { makeCategory } from '@serve/mocks';
import type { Category } from '@serve/types/global';
import { listCategories } from '@services/categories';

vi.mock('@services/categories', async importOriginal => {
  const actual = await importOriginal<typeof import('@services/categories')>();
  return { ...actual, listCategories: vi.fn() };
});

const mockListCategories = vi.mocked(listCategories);

// Needs its own QueryClient — the section reads categories via useCategories.
function render(ui: React.ReactElement) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return rtlRender(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

function setup(categories: Category[] = []) {
  mockListCategories.mockResolvedValue(categories);
  render(<HouseholdCategoriesSection householdId={1} householdName="Smith Household" />);
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('HouseholdCategoriesSection rendering', () => {
  it('shows an empty message when there are no categories', async () => {
    setup();
    expect(await screen.findByText('No categories yet.')).toBeDefined();
  });

  it('renders a row per category with its name and type', async () => {
    setup([
      makeCategory({ id: 1, name: 'Groceries', type: 'spending' }),
      makeCategory({ id: 2, name: 'Salary', type: 'earning' }),
    ]);
    expect(await screen.findByText('Groceries')).toBeDefined();
    expect(screen.getByText('Salary')).toBeDefined();
    expect(screen.getByText('Spending')).toBeDefined();
    expect(screen.getByText('Earning')).toBeDefined();
  });

  it('omits inactive categories — the shared query fetches both, for the label picker', async () => {
    setup([
      makeCategory({ id: 1, name: 'Groceries', type: 'spending' }),
      makeCategory({ id: 2, name: 'Old Rent', type: 'spending', is_active: false }),
    ]);
    expect(await screen.findByText('Groceries')).toBeDefined();
    expect(screen.queryByText('Old Rent')).toBeNull();
  });

  it('shows the empty message when only inactive categories exist', async () => {
    setup([makeCategory({ id: 1, name: 'Old Rent', is_active: false })]);
    expect(await screen.findByText('No categories yet.')).toBeDefined();
  });

  it('shows a Labels column header and a placeholder per row', async () => {
    // No way to link a label to a category yet — every row shows "—"
    // rather than real data. See the file-level comment for why.
    setup([
      makeCategory({ id: 1, name: 'Groceries', type: 'spending' }),
      makeCategory({ id: 2, name: 'Salary', type: 'earning' }),
    ]);
    expect(await screen.findByRole('columnheader', { name: 'Labels' })).toBeDefined();
    expect(screen.getAllByText('—')).toHaveLength(2);
  });

  it('orders categories by type then name', async () => {
    setup([
      makeCategory({ id: 1, name: 'Zebra', type: 'spending' }),
      makeCategory({ id: 2, name: 'Apple', type: 'earning' }),
      makeCategory({ id: 3, name: 'Mango', type: 'spending' }),
    ]);
    await screen.findByText('Zebra');
    const names = screen.getAllByRole('cell', { name: /zebra|apple|mango/i }).map(c => c.textContent);
    // earning ("Apple") sorts before spending ("Mango", "Zebra");
    // within spending, "Mango" before "Zebra".
    expect(names).toEqual(['Apple', 'Mango', 'Zebra']);
  });
});

describe('HouseholdCategoriesSection rows are view-only', () => {
  it('does not open the dialog when a row is clicked', async () => {
    setup([makeCategory({ id: 1, name: 'Groceries', type: 'spending' })]);
    await screen.findByText('Groceries');
    fireEvent.click(screen.getByText('Groceries'));
    expect(screen.queryByRole('dialog')).toBeNull();
  });
});

describe('HouseholdCategoriesSection manage button', () => {
  it('opens the dialog when "Manage categories" is clicked', async () => {
    setup([makeCategory({ id: 1, name: 'Groceries', type: 'spending' })]);
    await screen.findByText('Groceries');
    fireEvent.click(screen.getByRole('button', { name: /manage categories/i }));
    await waitFor(() => expect(mockListCategories).toHaveBeenCalledWith(1, true));
    expect(screen.getByRole('dialog')).toBeDefined();
  });
});

describe('HouseholdCategoriesSection pagination', () => {
  const FIVE_CATEGORIES = Array.from({ length: 5 }, (_, i) =>
    makeCategory({ id: i + 1, name: `Category ${i + 1}`, type: 'spending' }),
  );
  const SEVEN_CATEGORIES = [
    ...FIVE_CATEGORIES,
    makeCategory({ id: 6, name: 'Category 6', type: 'spending' }),
    makeCategory({ id: 7, name: 'Category 7', type: 'spending' }),
  ];

  it('does not show pagination controls at exactly 5 categories', async () => {
    setup(FIVE_CATEGORIES);
    await screen.findByText('Category 1');
    expect(screen.queryByLabelText('next page')).toBeNull();
  });

  it('shows only the first 5 categories and a next-page control beyond that', async () => {
    setup(SEVEN_CATEGORIES);
    expect(await screen.findByText('Category 5')).toBeDefined();
    expect(screen.queryByText('Category 6')).toBeNull();
    expect(screen.getByLabelText('next page')).toBeDefined();
  });

  it('advances to the next page and back', async () => {
    setup(SEVEN_CATEGORIES);
    await screen.findByText('Category 5');

    fireEvent.click(screen.getByLabelText('next page'));
    expect(screen.queryByText('Category 1')).toBeNull();
    expect(screen.getByText('Category 6')).toBeDefined();
    expect(screen.getByText('Category 7')).toBeDefined();

    fireEvent.click(screen.getByLabelText('previous page'));
    expect(screen.getByText('Category 1')).toBeDefined();
    expect(screen.queryByText('Category 6')).toBeNull();
  });

  it('disables previous/first on the first page and next/last on the last page', async () => {
    setup(SEVEN_CATEGORIES);
    await screen.findByText('Category 1');
    expect(screen.getByLabelText('previous page')).toHaveProperty('disabled', true);
    expect(screen.getByLabelText('first page')).toHaveProperty('disabled', true);

    fireEvent.click(screen.getByLabelText('last page'));
    expect(screen.getByLabelText('next page')).toHaveProperty('disabled', true);
    expect(screen.getByLabelText('last page')).toHaveProperty('disabled', true);
  });
});
