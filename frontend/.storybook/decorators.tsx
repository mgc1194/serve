import { useState } from 'react';
import type { Decorator } from '@storybook/react-vite';
import { CssBaseline } from '@mui/material';
import { ThemeProvider } from '@mui/material/styles';
import { BrowserRouter } from 'react-router';

import { ActiveHouseholdProvider } from '@context/active-household-context';
import { AuthProvider } from '@context/auth-context';
import theme from '@serve/theme';
import type { User } from '@serve/types/global';

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

// Nests inside authDecorator — useActiveHousehold() reads user.households via
// useAuth(), so stories set the active household through the same
// `parameters.auth.user` config as authDecorator rather than a separate knob.
export const activeHouseholdDecorator: Decorator = (Story) => (
  <ActiveHouseholdProvider>
    <Story />
  </ActiveHouseholdProvider>
);
