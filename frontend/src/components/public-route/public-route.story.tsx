import { Typography } from '@mui/material';
import type { Meta, StoryObj } from '@storybook/react';
import { withRouter, withAuth } from '@storybook-decorators';

import { PublicRoute } from '@serve/components/public-route';

const meta: Meta<typeof PublicRoute> = {
  title: 'Components/PublicRoute',
  component: PublicRoute,
  decorators: [withRouter, withAuth],
  parameters: { layout: 'centered' },
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
