// pages/budget-detail/budget-line-row.story.tsx

import { Table, TableBody } from '@mui/material';
import type { Decorator, Meta, StoryObj } from '@storybook/react';

import { BudgetLineRow } from '@pages/budget-detail/budget-line-row';
import { makeBudgetLine } from '@serve/mocks';

const tableDecorator: Decorator = Story => (
  <Table size="small">
    <TableBody>
      <Story />
    </TableBody>
  </Table>
);

const meta: Meta<typeof BudgetLineRow> = {
  title: 'BudgetDetail/BudgetLineRow',
  component: BudgetLineRow,
  decorators: [tableDecorator],
  parameters: { layout: 'padded' },
};

export default meta;
type Story = StoryObj<typeof BudgetLineRow>;

// Earning category, ahead of plan — "+$200.00"
export const EarningAheadOfPlan: Story = {
  args: {
    line: makeBudgetLine({
      category_name: 'Paycheck',
      category_type: 'earning',
      planned_amount: 2000,
      actual_amount: '2200.00',
    }),
  },
};

// Earning category, behind plan — "−$200.00"
export const EarningBehindPlan: Story = {
  args: {
    line: makeBudgetLine({
      category_name: 'Freelance',
      category_type: 'earning',
      planned_amount: 500,
      actual_amount: '300.00',
    }),
  },
};

// Spending category, under budget — "+$80.00"
export const SpendingUnderBudget: Story = {
  args: {
    line: makeBudgetLine({
      category_name: 'Groceries',
      category_type: 'spending',
      planned_amount: 500,
      actual_amount: '420.00',
    }),
  },
};

// Spending category, over budget — "−$50.00"
export const SpendingOverBudget: Story = {
  args: {
    line: makeBudgetLine({
      category_name: 'Transport',
      category_type: 'spending',
      planned_amount: 200,
      actual_amount: '250.00',
    }),
  },
};

// Exactly on plan — no sign
export const RightOnPlan: Story = {
  args: {
    line: makeBudgetLine({
      category_name: 'Subscriptions',
      category_type: 'spending',
      planned_amount: 45,
      actual_amount: '45.00',
    }),
  },
};
