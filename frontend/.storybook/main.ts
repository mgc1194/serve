// .storybook/main.ts — Storybook configuration for SERVE frontend.

import type { StorybookConfig } from '@storybook/react-vite';
import path from 'path';

const config: StorybookConfig = {
  stories: ['../src/**/*.story.tsx'],
  addons: [
    '@storybook/addon-essentials',
    '@storybook/addon-interactions',
    '@storybook/addon-a11y',
  ],
  framework: {
    name: '@storybook/react-vite',
    options: {},
  },
  viteFinal: async (config) => {
    config.resolve = config.resolve ?? {};
    config.resolve.alias = {
      ...config.resolve.alias,
      '@serve': path.resolve(__dirname, '../src'),
      '@components': path.resolve(__dirname, '../src/components'),
      '@pages': path.resolve(__dirname, '../src/pages'),
      '@layout': path.resolve(__dirname, '../src/layout'),
      '@context': path.resolve(__dirname, '../src/context'),
      '@services': path.resolve(__dirname, '../src/services'),
      '@tests': path.resolve(__dirname, '../tests'),
      '@storybook-decorators': path.resolve(__dirname, 'decorators.tsx'),
    };
    return config;
  },
};

export default config;
