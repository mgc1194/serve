import type { Meta, StoryObj } from '@storybook/react';

import { AppHeader } from '@layout/app-header';
import type { User } from '@serve/types/global';

const mockUser: User = {
  id: 1,
  username: 'testuser',
  email: 'test@example.com',
  first_name: 'Test',
  last_name: 'User',
  households: [],
};

const meta: Meta<typeof AppHeader> = {
  title: 'Layout/AppHeader',
  component: AppHeader,
  parameters: { 
    layout: 'fullscreen',
    router: true,
   },
};

export default meta;
type Story = StoryObj<typeof AppHeader>;

export const Authenticated: Story = {
  parameters: { auth: { user: mockUser } },
};

export const Unauthenticated: Story = {
  parameters: { auth: { user: null } },
};
