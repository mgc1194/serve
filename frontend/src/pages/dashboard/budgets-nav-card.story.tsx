import type { Meta, StoryObj } from '@storybook/react';

import { BudgetsNavCard } from '@pages/dashboard/budgets-nav-card';

const meta: Meta<typeof BudgetsNavCard> = {
  title: 'Dashboard/BudgetsNavCard',
  component: BudgetsNavCard,
  parameters: {
    layout: 'padded',
    router: true,
  },
};

export default meta;
type Story = StoryObj<typeof BudgetsNavCard>;

export const Default: Story = {};
