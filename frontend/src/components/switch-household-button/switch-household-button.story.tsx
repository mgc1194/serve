// components/switch-household-button/switch-household-button.story.tsx

import type { Meta, StoryObj } from '@storybook/react';

import { SwitchHouseholdButton } from '@components/switch-household-button';
import { ActiveHouseholdProvider } from '@context/active-household-context';
import { AuthProvider } from '@context/auth-context';

const meta: Meta<typeof SwitchHouseholdButton> = {
  title: 'Components/SwitchHouseholdButton',
  component: SwitchHouseholdButton,
  parameters: { layout: 'padded' },
  decorators: [
    Story => (
      <AuthProvider
        value={{
          user: {
            id: 1,
            email: 'a@b.com',
            first_name: 'A',
            last_name: 'B',
            username: 'ab',
            households: [
              { id: 1, name: 'Smith Household' },
              { id: 2, name: 'Johnson Household' },
            ],
          },
          setUser: () => {},
          isLoading: false,
          sessionError: false,
        }}
      >
        <ActiveHouseholdProvider>
          <Story />
        </ActiveHouseholdProvider>
      </AuthProvider>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof SwitchHouseholdButton>;

export const Default: Story = {};

export const AsPageTitle: Story = {
  args: { sx: { typography: 'h4' } },
};
