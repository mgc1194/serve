// This file has been automatically migrated to valid ESM format by Storybook.
import { fileURLToPath } from "node:url";
import type { StorybookConfig } from '@storybook/react-vite';
import path, { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const config: StorybookConfig = {
  stories: ['../src/**/*.story.tsx'],
  addons: ['@storybook/addon-a11y', '@storybook/addon-docs', 'msw-storybook-addon'],
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
    };
    return config;
  },
};

export default config;
