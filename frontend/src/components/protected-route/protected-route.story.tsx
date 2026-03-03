import { Typography } from '@mui/material';
import type { Meta, StoryObj } from '@storybook/react';

import { ProtectedRoute } from '@components/protected-route';
import type { User } from '@serve/types/global';

const mockUser: User = {
  id: 1,
  username: 'testuser',
  email: 'test@example.com',
  first_name: 'Test',
  last_name: 'User',
  households: [],
};

const meta: Meta<typeof ProtectedRoute> = {
  title: 'Components/ProtectedRoute',
  component: ProtectedRoute,
  parameters: { layout: 'centered' },
};

export default meta;
type Story = StoryObj<typeof ProtectedRoute>;

export const Authenticated: Story = {
  parameters: {
    auth: { user: mockUser },
  },
  args: {
    children: <Typography>Protected content visible ✓</Typography>,
  },
};

export const ServerError: Story = {
  parameters: {
    auth: { user: null, sessionError: true },
  },
  args: {
    children: <Typography>Protected content</Typography>,
  },
};
