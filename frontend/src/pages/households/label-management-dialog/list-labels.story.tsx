// pages/households/label-management-dialog/list-labels.story.tsx

import type { Meta, StoryObj } from '@storybook/react';

import { ListLabels } from '@pages/households/label-management-dialog/list-labels';

const LABELS = [
  { id: 1, name: 'Groceries', color: '#16a34a', category: '', household_id: 1 },
  { id: 2, name: 'Transport', color: '#2563eb', category: '', household_id: 1 },
  { id: 3, name: 'Subscriptions', color: '#9333ea', category: '', household_id: 1 },
];

const meta: Meta<typeof ListLabels> = {
  title: 'Households/LabelManagementDialog/ListLabels',
  component: ListLabels,
  parameters: { layout: 'padded' },
  args: {
    labels: LABELS,
    isLoading: false,
    error: null,
    onEdit: () => {},
    onNewLabel: () => {},
    onClose: () => {},
  },
};

export default meta;
type Story = StoryObj<typeof ListLabels>;

export const WithLabels: Story = {};

export const Empty: Story = {
  args: { labels: [] },
};

export const Loading: Story = {
  args: { labels: [], isLoading: true },
};

export const LoadError: Story = {
  args: {
    labels: [],
    error: 'Could not load labels. Please try again.',
  },
};

export const SingleLabel: Story = {
  args: { labels: [LABELS[0]] },
};
