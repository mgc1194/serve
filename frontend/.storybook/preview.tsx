import type { Preview } from '@storybook/react';

import { authDecorator, routerDecorator, themeDecorator } from './decorators';

const preview: Preview = {
  decorators: [themeDecorator, routerDecorator, authDecorator],

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