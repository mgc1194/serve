import { Box } from '@mui/material';
import type { Meta, StoryObj } from '@storybook/react';

import { RegisterForm } from '@pages/register/register-form';
import { withAuth, withRouter } from '@storybook-decorators';


const meta: Meta<typeof RegisterForm> = {
  title: 'Pages/Register/RegisterForm',
  component: RegisterForm,
  decorators: [
    withRouter,
    withAuth,
    (Story) => (
      <Box sx={{ width: 440, p: 3 }}>
        <Story />
      </Box>
    ),
  ],
  parameters: { layout: 'centered' },
};

export default meta;
type Story = StoryObj<typeof RegisterForm>;

export const Default: Story = {};
