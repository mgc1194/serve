// pages/budget-detail/budget-progress-bar.story.tsx

import { Box } from '@mui/material';
import type { Meta, StoryObj } from '@storybook/react';

import { BudgetProgressBar } from '@pages/budget-detail/budget-progress-bar';

const meta: Meta<typeof BudgetProgressBar> = {
  title: 'BudgetDetail/BudgetProgressBar',
  component: BudgetProgressBar,
  parameters: { layout: 'padded' },
  decorators: [
    Story => (
      <Box sx={{ width: 320 }}>
        <Story />
      </Box>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof BudgetProgressBar>;

export const UnderBudgetSpending: Story = {
  args: { type: 'spending', totalPlanned: 700, totalActual: 420 },
};

// The bar's color follows the same "positive is good" convention as each
// row's own Diff — over budget reads as an error here, same as under an
// earning goal would. The bar itself caps at 100% rather than overflowing;
// the dollar labels above it are what show the true, uncapped figures.
export const OverBudgetSpending: Story = {
  args: { type: 'spending', totalPlanned: 400, totalActual: 550 },
};

export const BelowEarningGoal: Story = {
  args: { type: 'earning', totalPlanned: 4500, totalActual: 4000 },
};

export const ExceedingEarningGoal: Story = {
  args: { type: 'earning', totalPlanned: 4500, totalActual: 4650 },
};

export const NothingPlannedYet: Story = {
  args: { type: 'spending', totalPlanned: 0, totalActual: 0 },
};
