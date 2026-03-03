import { Typography } from '@mui/material';
import type { Meta, StoryObj } from '@storybook/react';

import { PublicRoute } from '@serve/components/public-route';
import { AuthProvider } from '@serve/context/auth-context';
import type { User } from '@serve/types/global';

const meta: Meta<typeof PublicRoute> = {
  title: 'Components/PublicRoute',
  component: PublicRoute,
  parameters: { layout: 'centered' },
  decorators: [
    (Story, context) => {
      const {
        user = null,
        isLoading = false,
        sessionError = false,
      } = context.parameters.authContext ?? {};

      const mockSetUser = (_user: User | null) => {};

      return (
        <AuthProvider
          value={{ user, setUser: mockSetUser, isLoading, sessionError }}
        >
          <Story />
        </AuthProvider>
      );
    },
  ],
};

export default meta;
type Story = StoryObj<typeof PublicRoute>;

export const Unauthenticated: Story = {
  parameters: { authContext: { user: null } },
  args: { children: <Typography>Public content visible ✓</Typography> },
};

export const ServerError: Story = {
  parameters: { authContext: { user: null, sessionError: true } },
  args: { children: <Typography>Public content</Typography> },
};
