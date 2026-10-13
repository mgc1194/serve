// pages/budget-detail/budget-column.story.tsx

import { Box } from '@mui/material';
import type { Meta, StoryObj } from '@storybook/react';

import { BudgetColumn } from '@pages/budget-detail/budget-column';
import { makeBudgetLine } from '@serve/mocks';

const EARNING_LINES = [
  makeBudgetLine({
    id: 1,
    category_name: 'Paycheck',
    category_type: 'earning',
    planned_amount: 4000,
    actual_amount: '4000.00',
  }),
  makeBudgetLine({
    id: 2,
    category_name: 'Freelance',
    category_type: 'earning',
    planned_amount: 500,
    actual_amount: '650.00',
  }),
];

const SPENDING_LINES = [
  makeBudgetLine({
    id: 3,
    category_name: 'Groceries',
    category_type: 'spending',
    planned_amount: 500,
    actual_amount: '420.00',
  }),
  makeBudgetLine({
    id: 4,
    category_name: 'Transport',
    category_type: 'spending',
    planned_amount: 200,
    actual_amount: '250.00',
  }),
  makeBudgetLine({
    id: 5,
    category_name: 'Subscriptions',
    category_type: 'spending',
    planned_amount: 45,
    actual_amount: '45.00',
  }),
];

const meta: Meta<typeof BudgetColumn> = {
  title: 'BudgetDetail/BudgetColumn',
  component: BudgetColumn,
  parameters: { layout: 'padded' },
};

export default meta;
type Story = StoryObj<typeof BudgetColumn>;

export const Earnings: Story = {
  args: { title: 'Earnings', type: 'earning', lines: EARNING_LINES },
};

export const Spending: Story = {
  args: { title: 'Spending', type: 'spending', lines: SPENDING_LINES },
};

export const EmptyEarnings: Story = {
  args: { title: 'Earnings', type: 'earning', lines: [] },
};

export const EmptySpendingWithCustomMessage: Story = {
  args: {
    title: 'Spending',
    type: 'spending',
    lines: [],
    emptyMessage: 'No spending categories added yet.',
  },
};

// Matches how the two columns will actually sit on the Budget detail page —
// side by side, right below the net-this-month figure.
export const SideBySide: Story = {
  render: () => (
    <Box sx={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
      <BudgetColumn title="Earnings" type="earning" lines={EARNING_LINES} />
      <BudgetColumn title="Spending" type="spending" lines={SPENDING_LINES} />
    </Box>
  ),
};
