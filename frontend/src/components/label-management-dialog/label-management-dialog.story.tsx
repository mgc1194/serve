// components/label-management-dialog/label-management-dialog.story.tsx

import type { Meta, StoryObj } from '@storybook/react';

import { LabelManagementDialog } from '@components/label-management-dialog';

const meta: Meta<typeof LabelManagementDialog> = {
  title: 'Components/LabelManagementDialog',
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

// No parameters.msw here, so GET /labels/ and GET /categories/ are both
// bypassed (see .storybook/preview.tsx) and fall through to a real,
// backend-less fetch — same graceful degradation as HouseholdDetailCard's
// own default story: the dialog opens in list mode with no labels, and the
// category picker in create/edit mode has no options.
export const Default: Story = {};
