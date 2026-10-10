// components/label-management-dialog/label-management-dialog.story.tsx

import type { Meta, StoryObj } from '@storybook/react';

import { LabelManagementDialog } from '@components/label-management-dialog';
import { makeCategory } from '@serve/mocks';

const meta: Meta<typeof LabelManagementDialog> = {
  title: 'Components/LabelManagementDialog',
  component: LabelManagementDialog,
  parameters: { layout: 'centered' },
  args: {
    open: true,
    householdId: 1,
    householdName: 'Smith Household',
    categories: [
      makeCategory({ id: 1, name: 'Food', type: 'spending' }),
      makeCategory({ id: 2, name: 'Transportation', type: 'spending' }),
      makeCategory({ id: 3, name: 'Salary', type: 'earning' }),
    ],
    onClose: () => {},
    onLabelsChanged: () => {},
  },
};

export default meta;
type Story = StoryObj<typeof LabelManagementDialog>;

// MSW provides the GET /labels/?household_id=1 response (see msw.ts handlers).
// The dialog opens in list mode and loads labels automatically.
export const Default: Story = {};
