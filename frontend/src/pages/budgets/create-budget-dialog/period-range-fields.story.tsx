import type { Meta, StoryObj } from '@storybook/react';

import { PeriodRangeFields } from '@pages/budgets/create-budget-dialog/period-range-fields';

const meta: Meta<typeof PeriodRangeFields> = {
  title: 'Budgets/CreateBudgetDialog/PeriodRangeFields',
  component: PeriodRangeFields,
  parameters: { layout: 'padded' },
  args: {
    periodStart: undefined,
    periodEnd: undefined,
    onChangeStart: () => {},
    onChangeEnd: () => {},
  },
};

export default meta;
type Story = StoryObj<typeof PeriodRangeFields>;

export const Empty: Story = {};

export const WithRangePicked: Story = {
  args: { periodStart: '2026-08-15', periodEnd: '2026-09-15' },
};
