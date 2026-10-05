// pages/budgets/category-management-dialog/list-categories/list-categories.test.tsx

import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ListCategories } from '@pages/budgets/category-management-dialog/list-categories';
import type { Category } from '@serve/types/global';

const CATEGORIES: Category[] = [
  { id: 1, name: 'Groceries', type: 'spending', is_active: true, household_id: 1 },
  { id: 2, name: 'Utilities', type: 'spending', is_active: true, household_id: 1 },
  { id: 3, name: 'Salary', type: 'earning', is_active: true, household_id: 1 },
];

function setup(overrides: Partial<React.ComponentProps<typeof ListCategories>> = {}) {
  const onEdit = vi.fn();
  const onNewCategory = vi.fn();
  const onClose = vi.fn();

  render(
    <ListCategories
      categories={CATEGORIES}
      isLoading={false}
      error={null}
      onEdit={onEdit}
      onNewCategory={onNewCategory}
      onClose={onClose}
      {...overrides}
    />,
  );

  return { onEdit, onNewCategory, onClose };
}

beforeEach(() => vi.clearAllMocks());

describe('ListCategories rendering', () => {
  it('renders each category name', () => {
    setup();
    expect(screen.getByText('Groceries')).toBeDefined();
    expect(screen.getByText('Utilities')).toBeDefined();
    expect(screen.getByText('Salary')).toBeDefined();
  });

  it('groups categories under Spending and Earning headers', () => {
    setup();
    expect(screen.getByText('Spending')).toBeDefined();
    expect(screen.getByText('Earning')).toBeDefined();
  });

  it('renders an edit button for each category', () => {
    setup();
    expect(screen.getByRole('button', { name: /edit groceries/i })).toBeDefined();
    expect(screen.getByRole('button', { name: /edit utilities/i })).toBeDefined();
    expect(screen.getByRole('button', { name: /edit salary/i })).toBeDefined();
  });

  it('renders the New category button', () => {
    setup();
    expect(screen.getByRole('button', { name: /new category/i })).toBeDefined();
  });

  it('renders the Close button', () => {
    setup();
    expect(screen.getByRole('button', { name: /close/i })).toBeDefined();
  });

  it('shows empty message when there are no categories', () => {
    setup({ categories: [] });
    expect(screen.getByText(/no categories yet/i)).toBeDefined();
  });

  it('shows loading spinner when isLoading', () => {
    setup({ categories: [], isLoading: true });
    expect(document.querySelector('.MuiCircularProgress-root')).toBeTruthy();
  });

  it('shows error alert when error is set', () => {
    setup({ categories: [], error: 'Could not load categories. Please try again.' });
    expect(screen.getByText('Could not load categories. Please try again.')).toBeDefined();
  });
});

describe('ListCategories interactions', () => {
  it('calls onEdit with the category when its edit button is clicked', () => {
    const { onEdit } = setup();
    fireEvent.click(screen.getByRole('button', { name: /edit groceries/i }));
    expect(onEdit).toHaveBeenCalledWith(CATEGORIES[0]);
  });

  it('calls onNewCategory when New category is clicked', () => {
    const { onNewCategory } = setup();
    fireEvent.click(screen.getByRole('button', { name: /new category/i }));
    expect(onNewCategory).toHaveBeenCalledOnce();
  });

  it('calls onClose when Close is clicked', () => {
    const { onClose } = setup();
    fireEvent.click(screen.getByRole('button', { name: /close/i }));
    expect(onClose).toHaveBeenCalledOnce();
  });
});
