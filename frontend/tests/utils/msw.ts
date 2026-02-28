// tests/utils/msw.ts — MSW handlers for auth API endpoints.
//
// Provides realistic mock responses for all auth endpoints so
// integration tests never hit the real Django backend.

import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';

const API = '/api/v1';

export const mockUser = {
  id: 1,
  username: 'testuser',
  email: 'test@example.com',
  first_name: 'Test',
  last_name: 'User',
  households: [],
};

export const handlers = [
  http.get(`${API}/auth/me`, () => {
    return HttpResponse.json(mockUser);
  }),

  http.post(`${API}/auth/login`, () => {
    return HttpResponse.json(mockUser);
  }),

  http.post(`${API}/auth/register`, () => {
    return HttpResponse.json(mockUser, { status: 201 });
  }),

  http.post(`${API}/auth/logout`, () => {
    return new HttpResponse(null, { status: 204 });
  }),
];

export const server = setupServer(...handlers);
