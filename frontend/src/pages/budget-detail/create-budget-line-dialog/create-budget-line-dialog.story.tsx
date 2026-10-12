// pages/budget-detail/create-budget-line-dialog/create-budget-line-dialog.story.tsx

import type { Meta, StoryObj } from '@storybook/react';

import { CreateBudgetLineDialog } from '@pages/budget-detail/create-budget-line-dialog';

const meta: Meta<typeof CreateBudgetLineDialog> = {
  title: 'BudgetDetail/CreateBudgetLineDialog',
  component: CreateBudgetLineDialog,
  parameters: { layout: 'centered' },
  args: {
    open: true,
    budgetId: 1,
    householdId: 1,
    onClose: () => {},
    onCreate: () => {},
  },
};

export default meta;
type Story = StoryObj<typeof CreateBudgetLineDialog>;

// No parameters.msw here, so GET /categories/ is bypassed (see
// .storybook/preview.tsx) and falls through to a real, backend-less
// fetch — same graceful degradation as LabelManagementDialog's own
// default story: the category picker has no options to choose from.
export const Default: Story = {};
