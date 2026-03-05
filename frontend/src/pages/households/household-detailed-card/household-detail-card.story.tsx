import type { Meta, StoryObj } from '@storybook/react';

import { HouseholdDetailCard } from '@pages/households/household-detailed-card';

const meta: Meta<typeof HouseholdDetailCard> = {
  title: 'Households/HouseholdDetailCard',
  component: HouseholdDetailCard,
  parameters: { layout: 'padded' },
  args: {
    onUpdated: () => {},
    onDeleted: () => {},
  },
};

export default meta;
type Story = StoryObj<typeof HouseholdDetailCard>;

const baseHousehold = {
  id: 1,
  name: 'Smith Household',
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
};

export const WithMembers: Story = {
  args: {
    household: {
      ...baseHousehold,
      members: [
        { id: 1, email: 'alice@example.com', first_name: 'Alice', last_name: 'Smith' },
        { id: 2, email: 'bob@example.com', first_name: 'Bob', last_name: 'Smith' },
      ],
    },
  },
};

export const NoMembers: Story = {
  args: {
    household: {
      ...baseHousehold,
      members: [],
    },
  },
};
