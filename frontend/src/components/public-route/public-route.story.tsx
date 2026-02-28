// components/public-route/public-route.story.tsx

import { Typography } from '@mui/material';
import type { Meta, StoryObj } from '@storybook/react';

import { PublicRoute } from '@serve/components/public-route';

const meta: Meta<typeof PublicRoute> = {
  title: 'Components/PublicRoute',
  component: PublicRoute,
  parameters: { layout: 'centered' },
};

export default meta;
type Story = StoryObj<typeof PublicRoute>;

export const Unauthenticated: Story = {
  args: {
    children: <Typography>Public content visible </Typography>,
  },
};

export const ServerError: Story = {
  args: {
    children: <Typography>Public content</Typography>,
  },
};