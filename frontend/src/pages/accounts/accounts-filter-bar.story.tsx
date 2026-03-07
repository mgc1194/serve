// pages/accounts/accounts-filter-bar.story.tsx

import type { Meta, StoryObj } from '@storybook/react';

import { AccountsFilterBar } from '@pages/accounts/accounts-filter-bar';

const HOUSEHOLDS = [
  { id: 1, name: 'Smith Household' },
  { id: 2, name: 'Johnson Household' },
];

const meta: Meta<typeof AccountsFilterBar> = {
  title: 'Accounts/AccountsFilterBar',
  component: AccountsFilterBar,
  parameters: { layout: 'padded' },
  args: {
    households: HOUSEHOLDS,
    householdId: undefined,
    onHouseholdChange: () => {},
  },
};

export default meta;
type Story = StoryObj<typeof AccountsFilterBar>;

export const NoFilter: Story = {};

export const HouseholdFiltered: Story = {
  args: { householdId: 1 },
};

export const NoHouseholds: Story = {
  args: { households: [] },
};
