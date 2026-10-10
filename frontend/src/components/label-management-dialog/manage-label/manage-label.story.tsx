// components/label-management-dialog/manage-label/manage-label.story.tsx

import type { Meta, StoryObj } from '@storybook/react';

import { ManageLabel } from '@components/label-management-dialog/manage-label';
import { makeCategory } from '@serve/mocks';

const LABEL = { id: 1, name: 'Groceries', color: '#16a34a', category_id: null, household_id: 1 };

const CATEGORIES = [
  makeCategory({ id: 1, name: 'Food', type: 'spending' }),
  makeCategory({ id: 2, name: 'Transportation', type: 'spending' }),
  makeCategory({ id: 3, name: 'Salary', type: 'earning' }),
];

const meta: Meta<typeof ManageLabel> = {
  title: 'Components/LabelManagementDialog/ManageLabel',
  component: ManageLabel,
  parameters: { layout: 'padded' },
  args: {
    mode: 'create',
    editingLabel: null,
    name: '',
    color: '#6B7280',
    categories: CATEGORIES,
    categoryId: null,
    isSaving: false,
    isDeleting: false,
    error: null,
    onNameChange: () => {},
    onColorChange: () => {},
    onCategoryChange: () => {},
    onSave: () => {},
    onDelete: () => {},
    onBack: () => {},
    onDismissError: () => {},
  },
};

export default meta;
type Story = StoryObj<typeof ManageLabel>;

export const CreateEmpty: Story = {};

export const CreateWithName: Story = {
  args: { name: 'Groceries', color: '#16a34a' },
};

export const CreateSaving: Story = {
  args: { name: 'Groceries', isSaving: true },
};

export const CreateError: Story = {
  args: {
    name: 'Groceries',
    error: 'A label named "Groceries" already exists in this household.',
  },
};

export const EditMode: Story = {
  args: {
    mode: 'edit',
    editingLabel: LABEL,
    name: LABEL.name,
    color: LABEL.color,
  },
};

export const EditWithCategory: Story = {
  args: {
    mode: 'edit',
    editingLabel: { ...LABEL, category_id: 2 },
    name: LABEL.name,
    color: LABEL.color,
    categoryId: 2,
  },
};

export const EditDeleting: Story = {
  args: {
    mode: 'edit',
    editingLabel: LABEL,
    name: LABEL.name,
    color: LABEL.color,
    isDeleting: true,
  },
};

export const InvalidColor: Story = {
  args: {
    name: 'Transport',
    color: '#ZZZ',
  },
};
