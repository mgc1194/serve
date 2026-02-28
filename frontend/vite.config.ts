import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vitest/config';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
        '@serve': path.resolve(__dirname, 'src'),
        '@components': path.resolve(__dirname, 'src/components'),
        '@pages': path.resolve(__dirname, 'src/pages'),
        '@layout': path.resolve(__dirname, 'src/layout'),
        '@context': path.resolve(__dirname, 'src/context'),
        '@services': path.resolve(__dirname, 'src/services'),
        '@tests': path.resolve(__dirname, 'tests'),
        '@storybook-decorators': path.resolve(__dirname, '.storybook/decorators'),
    },
  },
  server: {
    proxy: {
      // Proxy all /api requests to Django in development.
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
  test: {
    globals: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'src/main.tsx',
        'src/**/*.story.tsx',
        'src/**/*.d.ts',
      ],
    },
    projects: [
      {
        extends: true,
        test: {
          name: 'unit',
          include: ['src/**/*.test.{ts,tsx}'],
          environment: 'jsdom',
          server: {
            deps: {
              external: ['msw', '@mswjs/interceptors'],
            },
          },
        },
      },
      {
        extends: true,
        test: {
          name: 'integration',
          include: ['tests/integration/**/*.test.{ts,tsx}'],
          environment: 'jsdom',
          server: {
            deps: {
              external: ['msw', '@mswjs/interceptors'],
            },
          },
          setupFiles: ['tests/utils/setup.ts']
        },
      },
    ],
  },
});
