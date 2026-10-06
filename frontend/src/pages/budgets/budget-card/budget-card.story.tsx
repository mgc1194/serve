import type { Meta, StoryObj } from '@storybook/react';

import { BudgetCard } from '@pages/budgets/budget-card';
import { makeBudget } from '@serve/mocks';

const meta: Meta<typeof BudgetCard> = {
  title: 'Budgets/BudgetCard',
  component: BudgetCard,
  parameters: { layout: 'padded' },
  args: {
    onUpdated: () => {},
    onDeactivated: () => {},
  },
};

export default meta;
type Story = StoryObj<typeof BudgetCard>;

export const Period: Story = {
  args: {
    budget: makeBudget({
      name: 'January 2026',
      type: 'period',
      period_start: '2026-01-01',
      period_end: '2026-01-31',
    }),
  },
};

export const Project: Story = {
  args: {
    budget: makeBudget({
      name: 'Iceland Trip',
      type: 'project',
      period_start: null,
      period_end: null,
    }),
  },
};
