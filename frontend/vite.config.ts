import path from 'path';

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
        '@serve': path.resolve(__dirname, 'src'),
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
    workspace: [
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
