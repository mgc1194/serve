import type { Meta, StoryObj } from '@storybook/react';

import { AccountsNavCard } from '@pages/dashboard/accounts-nav-card';

const meta: Meta<typeof AccountsNavCard> = {
  title: 'Dashboard/AccountsNavCard',
  component: AccountsNavCard,
  parameters: {
    layout: 'padded',
    router: true,
  },
};

export default meta;
type Story = StoryObj<typeof AccountsNavCard>;

export const Default: Story = {};
