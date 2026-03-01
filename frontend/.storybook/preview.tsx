// .storybook/preview.tsx — Minimal global Storybook configuration.

import type { Preview } from '@storybook/react';
import { withTheme } from '@storybook-decorators';


const preview: Preview = {
  decorators: [withTheme],
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