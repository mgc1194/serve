// pages/households/label-management-dialog/label-management-dialog.story.tsx

import type { Meta, StoryObj } from '@storybook/react';

import { LabelManagementDialog } from '@pages/households/label-management-dialog';

const meta: Meta<typeof LabelManagementDialog> = {
  title: 'Households/LabelManagementDialog',
  component: LabelManagementDialog,
  parameters: { layout: 'centered' },
  args: {
    open: true,
    householdId: 1,
    householdName: 'Smith Household',
    onClose: () => {},
    onLabelsChanged: () => {},
  },
};

export default meta;
type Story = StoryObj<typeof LabelManagementDialog>;

// MSW provides the GET /labels/?household_id=1 response (see msw.ts handlers).
// The dialog opens in list mode and loads labels automatically.
export const Default: Story = {};
