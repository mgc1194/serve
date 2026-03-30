// pages/households/label-management-dialog/manage-label.story.tsx

import type { Meta, StoryObj } from '@storybook/react';

import { ManageLabel } from '@serve/pages/households/label-management-dialog/manage-label';

const LABEL = { id: 1, name: 'Groceries', color: '#16a34a', category: '', household_id: 1 };

const meta: Meta<typeof ManageLabel> = {
  title: 'Households/LabelManagementDialog/ManageLabel',
  component: ManageLabel,
  parameters: { layout: 'padded' },
  args: {
    mode: 'create',
    editingLabel: null,
    name: '',
    color: '#6B7280',
    isSaving: false,
    isDeleting: false,
    error: null,
    onNameChange: () => {},
    onColorChange: () => {},
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
