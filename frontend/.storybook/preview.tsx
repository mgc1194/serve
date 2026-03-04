import { useState } from 'react';
import type { Preview } from '@storybook/react';
import { CssBaseline } from '@mui/material';
import { ThemeProvider } from '@mui/material/styles';
import { BrowserRouter } from 'react-router';

import { AuthProvider } from '../src/context/auth-context';
import theme from '../src/theme';
import type { User } from '../src/types/global';


const preview: Preview = {
  decorators: [
    (Story, { parameters }) => {
      const {
        router = false,
        auth,
      }: {
        router?: boolean;
        auth?: {
          user?: User | null;
          isLoading?: boolean;
          sessionError?: boolean;
        };
      } = parameters;

      // Auth always wraps every story so useAuth() never throws.
      // When parameters.auth is absent, defaults to unauthenticated + not loading.
      const {
        user: initialUser = null,
        isLoading = false,
        sessionError = false,
      } = auth ?? {};

      // useState here keeps setUser functional so components that call it
      // (e.g. logout) actually trigger a re-render in Storybook.
      const [user, setUser] = useState<User | null>(initialUser);

      let content = (
        <AuthProvider value={{ user, setUser, isLoading, sessionError }}>
          <Story />
        </AuthProvider>
      );

      if (router) {
        content = <BrowserRouter>{content}</BrowserRouter>;
      }

      return (
        <ThemeProvider theme={theme}>
          <CssBaseline />
          {content}
        </ThemeProvider>
      );
    },
  ],

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
