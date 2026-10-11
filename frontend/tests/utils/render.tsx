// tests/utils/render.tsx — Custom render with all providers.
//
// Wraps RTL's render with MUI ThemeProvider, QueryClientProvider,
// AuthProvider, ActiveHouseholdProvider, and BrowserRouter so components
// render in a realistic context without boilerplate in every test.
//
// AuthProvider is given an injected value (a default test user) rather
// than left to its own default behavior — with none, it calls the real
// getMe() on mount, which has no server to answer it in a unit test and
// just fails noisily. A test that needs a specific user/session state
// still wraps the component itself rather than using this helper.

import { CssBaseline } from '@mui/material';
import { ThemeProvider } from '@mui/material/styles';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render as rtlRender } from '@testing-library/react';
import type { RenderOptions, RenderResult } from '@testing-library/react';
import type { ReactNode } from 'react';
import { BrowserRouter } from 'react-router';

import { ActiveHouseholdProvider } from '@context/active-household-context';
import { AuthProvider } from '@context/auth-context';
import { makeUser } from '@serve/mocks';
import theme from '@serve/theme';

const testUser = makeUser();

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
}

function AllProviders({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={makeQueryClient()}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <AuthProvider value={{ user: testUser, setUser: () => {}, isLoading: false, sessionError: false }}>
          <ActiveHouseholdProvider>
            <BrowserRouter>
              {children}
            </BrowserRouter>
          </ActiveHouseholdProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export function render(
  ui: React.ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>,
): RenderResult {
  return rtlRender(ui, { wrapper: AllProviders, ...options });
}

// Re-export everything from RTL so tests only need one import.
export * from '@testing-library/react';
