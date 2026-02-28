import { Typography } from '@mui/material';
import type { Meta, StoryObj } from '@storybook/react';
import { withRouter, withAuth } from '@storybook-decorators';

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
  decorators: [withRouter, withAuth],
  parameters: { layout: 'centered' },
};

export default meta;
type Story = StoryObj<typeof ProtectedRoute>;

export const Authenticated: Story = {
  parameters: { authContext: { user: mockUser } },
  args: { children: <Typography>Protected content visible ✓</Typography> },
};

export const ServerError: Story = {
  parameters: { authContext: { user: null, sessionError: true } },
  args: { children: <Typography>Protected content</Typography> },
};
