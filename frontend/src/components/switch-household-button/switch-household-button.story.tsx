// components/switch-household-button/switch-household-button.story.tsx

import type { Meta, StoryObj } from '@storybook/react';

import { SwitchHouseholdButton } from '@components/switch-household-button';
import { makeHousehold, makeUser } from '@serve/mocks';

const meta: Meta<typeof SwitchHouseholdButton> = {
  title: 'Components/SwitchHouseholdButton',
  component: SwitchHouseholdButton,
  parameters: {
    layout: 'padded',
    auth: {
      user: makeUser({
        households: [
          makeHousehold({ id: 1, name: 'Smith Household' }),
          makeHousehold({ id: 2, name: 'Johnson Household' }),
        ],
      }),
    },
  },
};

export default meta;
type Story = StoryObj<typeof SwitchHouseholdButton>;

export const Default: Story = {};

export const AsPageTitle: Story = {
  args: { sx: { typography: 'h4' } },
};
