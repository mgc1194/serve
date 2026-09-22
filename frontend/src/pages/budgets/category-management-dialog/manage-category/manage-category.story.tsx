// pages/budgets/category-management-dialog/manage-category/manage-category.story.tsx

import type { Meta, StoryObj } from '@storybook/react';

import { ManageCategory } from '@pages/budgets/category-management-dialog/manage-category';

const CATEGORY = {
  id: 1,
  name: 'Groceries',
  type: 'spending' as const,
  is_active: true,
  household_id: 1,
};

const LABELS = [
  { id: 1, name: 'Trader Joes', color: '#16a34a', category_id: 1, household_id: 1 },
  { id: 2, name: 'Whole Foods', color: '#2563eb', category_id: null, household_id: 1 },
];

const meta: Meta<typeof ManageCategory> = {
  title: 'Budgets/CategoryManagementDialog/ManageCategory',
  component: ManageCategory,
  parameters: { layout: 'padded' },
  args: {
    mode: 'create',
    editingCategory: null,
    name: '',
    type: 'spending',
    labels: [],
    isSaving: false,
    isDeleting: false,
    error: null,
    onNameChange: () => {},
    onTypeChange: () => {},
    onSave: () => {},
    onDeactivate: () => {},
    onToggleLabel: () => {},
    onBack: () => {},
    onDismissError: () => {},
  },
};

export default meta;
type Story = StoryObj<typeof ManageCategory>;

export const CreateEmpty: Story = {};

export const CreateWithName: Story = {
  args: { name: 'Utilities' },
};

export const CreateSaving: Story = {
  args: { name: 'Utilities', isSaving: true },
};

export const CreateError: Story = {
  args: {
    name: 'Groceries',
    error: 'A category named "Groceries" already exists in this household.',
  },
};

export const EditMode: Story = {
  args: {
    mode: 'edit',
    editingCategory: CATEGORY,
    name: CATEGORY.name,
    type: CATEGORY.type,
    labels: LABELS,
  },
};

export const EditNoLabels: Story = {
  args: {
    mode: 'edit',
    editingCategory: CATEGORY,
    name: CATEGORY.name,
    type: CATEGORY.type,
    labels: [],
  },
};

export const EditDeleting: Story = {
  args: {
    mode: 'edit',
    editingCategory: CATEGORY,
    name: CATEGORY.name,
    type: CATEGORY.type,
    labels: LABELS,
    isDeleting: true,
  },
};
