import { Box } from '@mui/material';
import type { Meta, StoryObj } from '@storybook/react';

import { LoginForm } from '@serve/pages/login/login-form';

const meta: Meta<typeof LoginForm> = {
  title: 'Pages/Login/LoginForm',
  component: LoginForm,
  parameters: { layout: 'centered' },
  decorators: [
    (Story) => (
      <Box sx={{ width: 400, p: 3 }}>
        <Story />
      </Box>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof LoginForm>;

export const Default: Story = {};

export const Submitting: Story = {};
