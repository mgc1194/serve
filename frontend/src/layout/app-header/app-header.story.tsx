import type { Meta, StoryObj } from '@storybook/react';

import { AppHeader } from '@layout/app-header';
import { AuthProvider } from '@serve/context/auth-context';
import type { User } from '@serve/types/global';

const mockUser: User = {
  id: 1,
  username: 'testuser',
  email: 'test@example.com',
  first_name: 'Test',
  last_name: 'User',
  households: [],
};

const meta: Meta<typeof AppHeader> = {
  title: 'Layout/AppHeader',
  component: AppHeader,
  parameters: { layout: 'fullscreen' },
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
type Story = StoryObj<typeof AppHeader>;

export const Authenticated: Story = {
  parameters: {
    router: true,
    authContext: { user: mockUser } 
  },
};

export const Unauthenticated: Story = {
  parameters: {
    router: true,
    authContext: { user: null }
  },
};
