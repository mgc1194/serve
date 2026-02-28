// .storybook/preview.tsx — Global decorators and parameters for all stories.
//
// Every story is wrapped with:
//   - MUI ThemeProvider (SERVE theme)
//   - CssBaseline
//   - QueryClientProvider
//   - BrowserRouter

import { CssBaseline } from '@mui/material';
import { ThemeProvider } from '@mui/material/styles';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router';

import theme from '@serve/theme';

import type { Decorator, Preview } from '@storybook/react';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false },
    mutations: { retry: false },
  },
});

const withProviders: Decorator = (Story) => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <BrowserRouter>
        <Story />
      </BrowserRouter>
    </ThemeProvider>
  </QueryClientProvider>
);

const preview: Preview = {
  decorators: [withProviders],
  parameters: {
    layout: 'fullscreen',
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /date$/i,
      },
    },
    a11y: {
      element: '#storybook-root',
    },
  },
};

export default preview;
