import type { Meta, StoryObj } from '@storybook/react';

import { CreateHouseholdForm } from '@pages/households/create-household-form';

const meta: Meta<typeof CreateHouseholdForm> = {
  title: 'Households/CreateHouseholdForm',
  component: CreateHouseholdForm,
  parameters: { layout: 'padded' },
  args: {
    onCreate: () => {},
  },
};

export default meta;
type Story = StoryObj<typeof CreateHouseholdForm>;

export const Default: Story = {};
