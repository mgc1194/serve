import { Typography } from '@mui/material';
import type { Meta, StoryObj } from '@storybook/react';

import { ProtectedRoute } from '@serve/components/protected-route';

const meta: Meta<typeof ProtectedRoute> = {
  title: 'Components/ProtectedRoute',
  component: ProtectedRoute,
  parameters: { layout: 'centered' },
};

export default meta;
type Story = StoryObj<typeof ProtectedRoute>;

export const Authenticated: Story = {
  args: {
    children: <Typography>Protected content visible</Typography>,
  },
};

export const ServerError: Story = {
  args: {
    children: <Typography>Protected content</Typography>,
  },
};
