// pages/households/household-detailed-card/household-categories-section.story.tsx
//
// Layout reference for HouseholdCategoriesSection's flat, read-only table
// (chosen over grouping rows under Spending/Earning subheaders) and its
// edge cases (Empty/SpendingOnly/ManyCategories/LongNames) — ManyCategories
// has 12 rows, so it also demonstrates the 5-per-page pagination footer.
// The Labels column is a placeholder ("—" for every row) until a label
// can actually be linked to a category — see the component's own comment.
// "Manage categories" opens the real CategoryManagementDialog.
//
// The component reads its categories from the shared useCategories query
// (see queries/categories.ts) rather than a prop, so every story mocks
// GET /categories/ via MSW instead of passing args.

import { Box } from '@mui/material';
import type { Meta, StoryObj } from '@storybook/react';
import { http, HttpResponse } from 'msw';

import { HouseholdCategoriesSection } from '@pages/households/household-detailed-card/household-categories-section';
import { API_V1 } from '@serve/config';
import { makeCategory } from '@serve/mocks';
import type { Category } from '@serve/types/global';

function handlersFor(categories: Category[]) {
  return [http.get(`${API_V1}/categories/`, () => HttpResponse.json(categories))];
}

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
  parameters: { layout: 'padded', msw: handlersFor(CATEGORIES) },
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
  },
};

export default meta;
type Story = StoryObj<typeof HouseholdCategoriesSection>;

export const Default: Story = {};

export const Empty: Story = {
  parameters: { msw: handlersFor([]) },
};

export const SpendingOnly: Story = {
  parameters: { msw: handlersFor(CATEGORIES.filter(c => c.type === 'spending')) },
};

export const ManyCategories: Story = {
  parameters: {
    msw: handlersFor([
      ...CATEGORIES,
      makeCategory({ id: 6, name: 'Dining Out', type: 'spending' }),
      makeCategory({ id: 7, name: 'Entertainment', type: 'spending' }),
      makeCategory({ id: 8, name: 'Transportation', type: 'spending' }),
      makeCategory({ id: 9, name: 'Healthcare', type: 'spending' }),
      makeCategory({ id: 10, name: 'Insurance', type: 'spending' }),
      makeCategory({ id: 11, name: 'Dividends', type: 'earning' }),
      makeCategory({ id: 12, name: 'Rental Income', type: 'earning' }),
    ]),
  },
};

export const LongNames: Story = {
  parameters: {
    msw: handlersFor([
      makeCategory({ id: 1, name: 'Home Maintenance & Repairs', type: 'spending' }),
      makeCategory({ id: 2, name: 'Subscriptions and Memberships', type: 'spending' }),
      makeCategory({ id: 3, name: 'Side Business Consulting Income', type: 'earning' }),
    ]),
  },
};
