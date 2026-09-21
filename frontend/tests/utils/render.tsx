// tests/utils/render.tsx — Custom render with all providers.
//
// Wraps RTL's render with MUI ThemeProvider, QueryClientProvider,
// AuthProvider, ActiveHouseholdProvider, and BrowserRouter so components
// render in a realistic context without boilerplate in every test.

import { CssBaseline } from '@mui/material';
import { ThemeProvider } from '@mui/material/styles';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render as rtlRender } from '@testing-library/react';
import type { RenderOptions, RenderResult } from '@testing-library/react';
import type { ReactNode } from 'react';
import { BrowserRouter } from 'react-router';

import { ActiveHouseholdProvider } from '../../src/context/active-household-context';
import { AuthProvider } from '../../src/context/auth-context';
import theme from '../../src/theme';

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
        <AuthProvider>
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
