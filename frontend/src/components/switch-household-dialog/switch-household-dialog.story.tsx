// components/switch-household-dialog/switch-household-dialog.story.tsx

import type { Meta, StoryObj } from '@storybook/react';

import { SwitchHouseholdDialog } from '@components/switch-household-dialog';

const meta: Meta<typeof SwitchHouseholdDialog> = {
  title: 'Components/SwitchHouseholdDialog',
  component: SwitchHouseholdDialog,
  parameters: { layout: 'padded' },
  args: {
    open: true,
    households: [
      { id: 1, name: 'Smith Household' },
      { id: 2, name: 'Johnson Household' },
    ],
    activeHouseholdId: 1,
    onSelect: () => {},
    onClose: () => {},
  },
};

export default meta;
type Story = StoryObj<typeof SwitchHouseholdDialog>;

export const Default: Story = {};

export const ManyHouseholds: Story = {
  args: {
    households: [
      { id: 1, name: 'Smith Household' },
      { id: 2, name: 'Johnson Household' },
      { id: 3, name: 'Individual — Mario' },
      { id: 4, name: 'Shared with Alex' },
    ],
    activeHouseholdId: 3,
  },
};
