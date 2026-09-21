import type { Preview } from '@storybook/react-vite';

import { activeHouseholdDecorator, authDecorator, routerDecorator, themeDecorator } from './decorators';

// Storybook's defaultDecorateStory composes this array with a plain
// left-to-right .reduce(): each later decorator wraps AROUND the result of
// all earlier ones, so the LAST entry ends up outermost, not the first.
// activeHouseholdDecorator must therefore come before authDecorator here —
// ActiveHouseholdProvider calls useAuth(), so it needs AuthProvider to be
// its ancestor (outer), not the reverse.
const preview: Preview = {
  decorators: [themeDecorator, routerDecorator, activeHouseholdDecorator, authDecorator],

  parameters: {
    layout: 'fullscreen',
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /date$/i,
      },
    },
    a11y: {
      context: '#storybook-root',
    },
  },
};

export default preview;