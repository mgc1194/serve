import type { Meta, StoryObj } from '@storybook/react';

import { MonthlyPeriodField } from '@pages/budgets/create-budget-dialog/monthly-period-field';

const meta: Meta<typeof MonthlyPeriodField> = {
  title: 'Budgets/CreateBudgetDialog/MonthlyPeriodField',
  component: MonthlyPeriodField,
  parameters: { layout: 'padded' },
  args: {
    periodStart: undefined,
    onChange: () => {},
  },
};

export default meta;
type Story = StoryObj<typeof MonthlyPeriodField>;

export const Empty: Story = {};

export const WithMonthPicked: Story = {
  args: { periodStart: '2026-08-01' },
};
