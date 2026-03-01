// .storybook/decorators.tsx — Opt-in decorators for individual stories.
//
// Import via the @storybook-decorators alias:
//
//   import { withAuth, withRouter, withQuery } from '@storybook-decorators';

import { AuthProvider } from '@context/auth-context';
import { CssBaseline } from '@mui/material';
import { ThemeProvider } from '@mui/material/styles';
import type { Decorator } from '@storybook/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router';

import theme from '@serve/theme';
import type { User } from '@serve/types/global';

// ── withTheme ─────────────────────────────────────────────────────────────────

export const withTheme: Decorator = (Story) => (
  <ThemeProvider theme={theme}>
    <CssBaseline />
    <Story />
  </ThemeProvider>
);

// ── withRouter ────────────────────────────────────────────────────────────────

export const withRouter: Decorator = (Story) => (
  <BrowserRouter>
    <Story />
  </BrowserRouter>
);

// ── withQuery ─────────────────────────────────────────────────────────────────

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false },
    mutations: { retry: false },
  },
});

export const withQuery: Decorator = (Story) => (
  <QueryClientProvider client={queryClient}>
    <Story />
  </QueryClientProvider>
);

// ── withAuth ──────────────────────────────────────────────────────────────────
//
// Wraps the story in AuthProvider.Provider without calling getMe().
// Control auth state per-variant via parameters.authContext:
//
//   parameters: { authContext: { user: mockUser } }      // authenticated
//   parameters: { authContext: { user: null } }          // unauthenticated
//   parameters: { authContext: { isLoading: true } }     // loading
//   parameters: { authContext: { sessionError: true } }  // server error

export const withAuth: Decorator = (Story, context) => {
  const {
    user = null,
    isLoading = false,
    sessionError = false,
  } = (context.parameters.authContext ?? {}) as {
    user?: User | null;
    isLoading?: boolean;
    sessionError?: boolean;
  };

  return (
    <AuthProvider value={{ user, setUser: () => {}, isLoading, sessionError }}>
      <Story />
    </AuthProvider>
  );
};
