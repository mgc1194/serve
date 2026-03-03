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

      let content = <Story />;

      if (auth) {
        const {
          user = null,
          isLoading = false,
          sessionError = false,
        } = auth;

        const mockSetUser = (_user: User | null) => {};

        content = (
          <AuthProvider
            value={{ user, setUser: mockSetUser, isLoading, sessionError }}
          >
            {content}
          </AuthProvider>
        );
      }

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
