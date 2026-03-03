import { Box } from '@mui/material';
import type { Meta, StoryObj } from '@storybook/react';

import { RegisterForm } from '@pages/register/register-form';
import { AuthProvider } from '@serve/context/auth-context';
import type { User } from '@serve/types/global';

const meta: Meta<typeof RegisterForm> = {
  title: 'Pages/Register/RegisterForm',
  component: RegisterForm,
  parameters: { layout: 'centered' },
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
    (Story) => (
      <Box sx={{ width: 440, p: 3 }}>
        <Story />
      </Box>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof RegisterForm>;

export const Default: Story = {
  parameters: {
    router:  true,
  },
};
