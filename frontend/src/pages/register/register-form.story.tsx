import { Box } from '@mui/material';
import type { Meta, StoryObj } from '@storybook/react';

import { RegisterForm } from '@serve/pages/register/register-form';

const meta: Meta<typeof RegisterForm> = {
  title: 'Pages/Register/RegisterForm',
  component: RegisterForm,
  parameters: { layout: 'centered' },
  decorators: [
    (Story) => (
      <Box sx={{ width: 440, p: 3 }}>
        <Story />
      </Box>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof RegisterForm>;

export const Default: Story = {};
