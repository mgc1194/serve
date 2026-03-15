import type { Meta, StoryObj } from '@storybook/react';

import { TransactionsNavCard } from '@pages/dashboard/transactions-nav-card';

const meta: Meta<typeof TransactionsNavCard> = {
  title: 'Dashboard/TransactionsNavCard',
  component: TransactionsNavCard,
  parameters: {
    layout: 'padded',
    router: true,
  },
};

export default meta;
type Story = StoryObj<typeof TransactionsNavCard>;

export const Default: Story = {};
