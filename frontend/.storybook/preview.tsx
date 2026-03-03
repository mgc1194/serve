import type { Preview } from '@storybook/react';
import { CssBaseline } from '@mui/material';
import { ThemeProvider } from '@mui/material/styles';
import { BrowserRouter } from 'react-router';

import theme from '../src/theme';

const preview: Preview = {
  decorators: [
    (Story, { parameters }) => {
      const {
        router = false,
      }: {
        router?: boolean;
      } = parameters;

      let content = <Story />;

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
  },
};

export default preview;
