// pages/budgets/category-management-dialog/list-categories.story.tsx

import type { Meta, StoryObj } from '@storybook/react';

import { ListCategories } from '@pages/budgets/category-management-dialog/list-categories';

const CATEGORIES = [
  { id: 1, name: 'Groceries', type: 'spending' as const, is_active: true, household_id: 1 },
  { id: 2, name: 'Utilities', type: 'spending' as const, is_active: true, household_id: 1 },
  { id: 3, name: 'Salary', type: 'earning' as const, is_active: true, household_id: 1 },
];

const meta: Meta<typeof ListCategories> = {
  title: 'Budgets/CategoryManagementDialog/ListCategories',
  component: ListCategories,
  parameters: { layout: 'padded' },
  args: {
    categories: CATEGORIES,
    isLoading: false,
    error: null,
    showInactive: false,
    onToggleShowInactive: () => {},
    onEdit: () => {},
    onReactivate: () => {},
    onNewCategory: () => {},
    onClose: () => {},
  },
};

export default meta;
type Story = StoryObj<typeof ListCategories>;

export const WithCategories: Story = {};

export const Empty: Story = {
  args: { categories: [] },
};

export const Loading: Story = {
  args: { categories: [], isLoading: true },
};

export const LoadError: Story = {
  args: {
    categories: [],
    error: 'Could not load categories. Please try again.',
  },
};

export const WithInactive: Story = {
  args: {
    categories: [
      ...CATEGORIES,
      { id: 4, name: 'Old category', type: 'spending', is_active: false, household_id: 1 },
    ],
    showInactive: true,
  },
};

export const SpendingOnly: Story = {
  args: { categories: CATEGORIES.filter(c => c.type === 'spending') },
};
