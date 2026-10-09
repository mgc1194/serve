import type { Preview } from '@storybook/react-vite';
import { mswLoader } from 'msw-storybook-addon/csf3';

import { activeHouseholdDecorator, authDecorator, routerDecorator, themeDecorator } from './decorators';

// Storybook's defaultDecorateStory composes this array with a plain
// left-to-right .reduce(): each later decorator wraps AROUND the result of
// all earlier ones, so the LAST entry ends up outermost, not the first.
// activeHouseholdDecorator must therefore come before authDecorator here —
// ActiveHouseholdProvider calls useAuth(), so it needs AuthProvider to be
// its ancestor (outer), not the reverse.
const preview: Preview = {
  decorators: [themeDecorator, routerDecorator, activeHouseholdDecorator, authDecorator],

  // Runs before each story renders; msw-storybook-addon's loader applies
  // that story's parameters.msw (a handler array) to the shared worker.
  loaders: [mswLoader()],

  parameters: {
    layout: 'fullscreen',
    // Default to no handlers — a story that doesn't set its own
    // parameters.msw gets every request bypassed (the addon's default
    // behavior), consistent with components already degrading gracefully
    // on a failed fetch (see e.g. HouseholdDetailCard's labels/categories
    // sections).
    msw: [],
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