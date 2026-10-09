// pages/households/household-detailed-card/household-categories-section.story.tsx
//
// Layout reference for HouseholdCategoriesSection's flat table (chosen
// over grouping rows under Spending/Earning subheaders) and its edge
// cases (Empty/SpendingOnly/ManyCategories/LongNames). Clicking a row or
// "Manage categories" opens the real CategoryManagementDialog, which has
// no backend to talk to here — same as HouseholdDetailCard's own story,
// it degrades to a loading/error state rather than crashing.

import { Box } from '@mui/material';
import type { Meta, StoryObj } from '@storybook/react';

import { HouseholdCategoriesSection } from '@pages/households/household-detailed-card/household-categories-section';
import { makeCategory } from '@serve/mocks';

const CATEGORIES = [
  makeCategory({ id: 1, name: 'Groceries', type: 'spending' }),
  makeCategory({ id: 2, name: 'Rent', type: 'spending' }),
  makeCategory({ id: 3, name: 'Utilities', type: 'spending' }),
  makeCategory({ id: 4, name: 'Salary', type: 'earning' }),
  makeCategory({ id: 5, name: 'Freelance', type: 'earning' }),
];

const meta: Meta<typeof HouseholdCategoriesSection> = {
  title: 'Households/HouseholdCategoriesSection',
  component: HouseholdCategoriesSection,
  parameters: { layout: 'padded' },
  decorators: [
    Story => (
      <Box sx={{ maxWidth: 420, border: 1, borderColor: 'divider', borderRadius: 2, p: 3 }}>
        <Story />
      </Box>
    ),
  ],
  args: {
    householdId: 1,
    householdName: 'Smith Household',
    categories: CATEGORIES,
    onCategoriesChanged: () => {},
  },
};

export default meta;
type Story = StoryObj<typeof HouseholdCategoriesSection>;

export const Default: Story = {};

export const Empty: Story = {
  args: { categories: [] },
};

export const SpendingOnly: Story = {
  args: { categories: CATEGORIES.filter(c => c.type === 'spending') },
};

export const ManyCategories: Story = {
  args: {
    categories: [
      ...CATEGORIES,
      makeCategory({ id: 6, name: 'Dining Out', type: 'spending' }),
      makeCategory({ id: 7, name: 'Entertainment', type: 'spending' }),
      makeCategory({ id: 8, name: 'Transportation', type: 'spending' }),
      makeCategory({ id: 9, name: 'Healthcare', type: 'spending' }),
      makeCategory({ id: 10, name: 'Insurance', type: 'spending' }),
      makeCategory({ id: 11, name: 'Dividends', type: 'earning' }),
      makeCategory({ id: 12, name: 'Rental Income', type: 'earning' }),
    ],
  },
};

export const LongNames: Story = {
  args: {
    categories: [
      makeCategory({ id: 1, name: 'Home Maintenance & Repairs', type: 'spending' }),
      makeCategory({ id: 2, name: 'Subscriptions and Memberships', type: 'spending' }),
      makeCategory({ id: 3, name: 'Side Business Consulting Income', type: 'earning' }),
    ],
  },
};
