import { Box } from '@mui/material';
import type { Meta, StoryObj } from '@storybook/react';
import { withAuth, withRouter } from '@storybook-decorators';

import { LoginForm } from '@pages/login/login-form';

const meta: Meta<typeof LoginForm> = {
  title: 'Pages/Login/LoginForm',
  component: LoginForm,
  decorators: [
    withRouter,
    withAuth,
    (Story) => (
      <Box sx={{ width: 400, p: 3 }}>
        <Story />
      </Box>
    ),
  ],
  parameters: { layout: 'centered' },
};

export default meta;
type Story = StoryObj<typeof LoginForm>;

export const Default: Story = {};
