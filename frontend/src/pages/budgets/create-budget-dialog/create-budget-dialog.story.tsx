import type { Meta, StoryObj } from '@storybook/react';

import { CreateBudgetDialog } from '@pages/budgets/create-budget-dialog';

const meta: Meta<typeof CreateBudgetDialog> = {
  title: 'Budgets/CreateBudgetDialog',
  component: CreateBudgetDialog,
  parameters: { layout: 'centered' },
  args: {
    open: true,
    householdId: 1,
    onClose: () => {},
    onCreate: () => {},
  },
};

export default meta;
type Story = StoryObj<typeof CreateBudgetDialog>;

// Opens on Monthly, the default type.
export const Default: Story = {};
