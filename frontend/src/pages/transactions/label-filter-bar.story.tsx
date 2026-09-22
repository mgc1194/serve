// pages/transactions/label-filter-bar.story.tsx

import type { Meta, StoryObj } from '@storybook/react';

import { LabelFilterBar } from '@pages/transactions/label-filter-bar';
import { makeLabel } from '@serve/mocks';

const LABELS = [
  makeLabel({ id: 1, name: 'Groceries', color: '#22c55e' }),
  makeLabel({ id: 2, name: 'Rent', color: '#3b82f6' }),
  makeLabel({ id: 3, name: 'Dining Out', color: '#f97316' }),
  makeLabel({ id: 4, name: 'Utilities', color: '#a855f7' }),
  makeLabel({ id: 5, name: 'Subscriptions', color: '#ef4444' }),
];

const meta: Meta<typeof LabelFilterBar> = {
  title: 'Transactions/LabelFilterBar',
  component: LabelFilterBar,
  parameters: { layout: 'padded' },
  args: {
    labels: LABELS,
    labelId: undefined,
    onLabelChange: () => {},
  },
};

export default meta;
type Story = StoryObj<typeof LabelFilterBar>;

export const AllLabels: Story = {};

export const LabelActive: Story = {
  args: { labelId: 1 },
};

export const Unlabeled: Story = {
  args: { labelId: -1 },
};

export const NoLabels: Story = {
  args: { labels: [] },
};
