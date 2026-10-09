// pages/households/household-detailed-card/household-categories-section.test.tsx

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { HouseholdCategoriesSection } from '@pages/households/household-detailed-card/household-categories-section';
import { makeCategory } from '@serve/mocks';
import { listCategories } from '@services/categories';

vi.mock('@services/categories', async importOriginal => {
  const actual = await importOriginal<typeof import('@services/categories')>();
  return { ...actual, listCategories: vi.fn() };
});

const mockListCategories = vi.mocked(listCategories);

function setup(overrides: Partial<React.ComponentProps<typeof HouseholdCategoriesSection>> = {}) {
  const onCategoriesChanged = vi.fn();
  render(
    <HouseholdCategoriesSection
      householdId={1}
      householdName="Smith Household"
      categories={[]}
      onCategoriesChanged={onCategoriesChanged}
      {...overrides}
    />,
  );
  return { onCategoriesChanged };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockListCategories.mockResolvedValue([]);
});

describe('HouseholdCategoriesSection rendering', () => {
  it('shows an empty message when there are no categories', () => {
    setup();
    expect(screen.getByText('No categories yet.')).toBeDefined();
  });

  it('renders a row per category with its name and type', () => {
    setup({
      categories: [
        makeCategory({ id: 1, name: 'Groceries', type: 'spending' }),
        makeCategory({ id: 2, name: 'Salary', type: 'earning' }),
      ],
    });
    expect(screen.getByText('Groceries')).toBeDefined();
    expect(screen.getByText('Salary')).toBeDefined();
    expect(screen.getByText('Spending')).toBeDefined();
    expect(screen.getByText('Earning')).toBeDefined();
  });

  it('orders categories by type then name', () => {
    setup({
      categories: [
        makeCategory({ id: 1, name: 'Zebra', type: 'spending' }),
        makeCategory({ id: 2, name: 'Apple', type: 'earning' }),
        makeCategory({ id: 3, name: 'Mango', type: 'spending' }),
      ],
    });
    const names = screen.getAllByRole('cell', { name: /zebra|apple|mango/i }).map(c => c.textContent);
    // earning ("Apple") sorts before spending ("Mango", "Zebra");
    // within spending, "Mango" before "Zebra".
    expect(names).toEqual(['Apple', 'Mango', 'Zebra']);
  });
});

describe('HouseholdCategoriesSection rows are view-only', () => {
  it('does not open the dialog when a row is clicked', () => {
    setup({ categories: [makeCategory({ id: 1, name: 'Groceries', type: 'spending' })] });
    fireEvent.click(screen.getByText('Groceries'));
    expect(mockListCategories).not.toHaveBeenCalled();
    expect(screen.queryByRole('dialog')).toBeNull();
  });
});

describe('HouseholdCategoriesSection manage button', () => {
  it('opens the dialog when "Manage categories" is clicked', async () => {
    setup({ categories: [makeCategory({ id: 1, name: 'Groceries', type: 'spending' })] });
    fireEvent.click(screen.getByRole('button', { name: /manage categories/i }));
    await waitFor(() => expect(mockListCategories).toHaveBeenCalledWith(1));
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

  it('does not show pagination controls at exactly 5 categories', () => {
    setup({ categories: FIVE_CATEGORIES });
    expect(screen.queryByLabelText('next page')).toBeNull();
  });

  it('shows only the first 5 categories and a next-page control beyond that', () => {
    setup({ categories: SEVEN_CATEGORIES });
    expect(screen.getByText('Category 5')).toBeDefined();
    expect(screen.queryByText('Category 6')).toBeNull();
    expect(screen.getByLabelText('next page')).toBeDefined();
  });

  it('advances to the next page and back', () => {
    setup({ categories: SEVEN_CATEGORIES });

    fireEvent.click(screen.getByLabelText('next page'));
    expect(screen.queryByText('Category 1')).toBeNull();
    expect(screen.getByText('Category 6')).toBeDefined();
    expect(screen.getByText('Category 7')).toBeDefined();

    fireEvent.click(screen.getByLabelText('previous page'));
    expect(screen.getByText('Category 1')).toBeDefined();
    expect(screen.queryByText('Category 6')).toBeNull();
  });

  it('disables previous/first on the first page and next/last on the last page', () => {
    setup({ categories: SEVEN_CATEGORIES });
    expect(screen.getByLabelText('previous page')).toHaveProperty('disabled', true);
    expect(screen.getByLabelText('first page')).toHaveProperty('disabled', true);

    fireEvent.click(screen.getByLabelText('last page'));
    expect(screen.getByLabelText('next page')).toHaveProperty('disabled', true);
    expect(screen.getByLabelText('last page')).toHaveProperty('disabled', true);
  });
});
