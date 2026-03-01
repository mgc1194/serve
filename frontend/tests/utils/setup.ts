import '@testing-library/jest-dom';

import { server } from '@tests/utils/msw';

// The auth service uses relative URLs (e.g. '/api/v1/auth/me') via the
// API_V1 constant. Vitest's Node runtime uses Undici as its fetch
// implementation, which rejects relative URLs with a TypeError before MSW
// can intercept them. This shim resolves relative URLs against a base so
// Undici is happy and MSW intercepts as expected.

const BASE = 'http://localhost';
const originalFetch = globalThis.fetch;

// Provide a CSRF token for all requests that need it.
Object.defineProperty(document, 'cookie', {
  writable: true,
  configurable: true,
  value: 'csrftoken=test-csrf-token',
});

beforeAll(() => {
  globalThis.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
    if (typeof input === 'string' && input.startsWith('/')) {
      return originalFetch(`${BASE}${input}`, init);
    }
  return originalFetch(input, init);
  };
  server.listen({ onUnhandledRequest: 'error' })
});
afterEach(() => server.resetHandlers());
afterAll(() => {
  globalThis.fetch = originalFetch;
  server.close();
});

export {};
