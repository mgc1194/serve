import type { Meta, StoryObj } from '@storybook/react';

import { BudgetTypeField } from '@pages/budgets/create-budget-dialog/budget-type-field';

const meta: Meta<typeof BudgetTypeField> = {
  title: 'Budgets/CreateBudgetDialog/BudgetTypeField',
  component: BudgetTypeField,
  parameters: { layout: 'padded' },
  args: {
    value: 'monthly',
    onChange: () => {},
  },
};

export default meta;
type Story = StoryObj<typeof BudgetTypeField>;

export const Default: Story = {};

export const Disabled: Story = {
  args: { disabled: true },
};
