import type { Meta, StoryObj } from '@storybook/react';

import { AddHouseholdMemberForm } from '@pages/households/household-detailed-card/add-household-member-form';

const meta: Meta<typeof AddHouseholdMemberForm> = {
  title: 'Households/AddHouseholdMemberForm',
  component: AddHouseholdMemberForm,
  parameters: { layout: 'padded' },
  args: {
    householdId: 1,
    onMemberAdded: () => {},
  },
};
export default meta;

type Story = StoryObj<typeof AddHouseholdMemberForm>;

export const Default: Story = {};

export const ApiFailure: Story = {};
