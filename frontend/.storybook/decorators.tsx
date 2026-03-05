import { useState } from 'react';
import type { Decorator } from '@storybook/react';
import { CssBaseline } from '@mui/material';
import { ThemeProvider } from '@mui/material/styles';
import { BrowserRouter } from 'react-router';

import { AuthProvider } from '../src/context/auth-context';
import theme from '../src/theme';
import type { User } from '../src/types/global';

export const themeDecorator: Decorator = (Story) => (
  <ThemeProvider theme={theme}>
    <CssBaseline />
    <Story />
  </ThemeProvider>
);

export const routerDecorator: Decorator = (Story, { parameters }) => {
  if (!parameters.router) return <Story />;
  return (
    <BrowserRouter>
      <Story />
    </BrowserRouter>
  );
};

export const authDecorator: Decorator = (Story, { parameters }) => {
  const {
    user: initialUser = null,
    isLoading = false,
    sessionError = false,
  }: {
    user?: User | null;
    isLoading?: boolean;
    sessionError?: boolean;
  } = parameters.auth ?? {};

  function AuthDecorator() {
    const [user, setUser] = useState<User | null>(initialUser);
    return (
      <AuthProvider value={{ user, setUser, isLoading, sessionError }}>
        <Story />
      </AuthProvider>
    );
  }

  return <AuthDecorator />;
};
