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

export const mockHousehold = {
  id: 1,
  name: 'Test Household',
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
  members: [
    { id: 1, email: 'test@example.com', first_name: 'Test', last_name: 'User' },
  ],
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

  http.get(`${API}/households/`, () => HttpResponse.json([mockHousehold])),

  http.post(`${API}/households/`, async ({ request }) => {
    const body = await request.json() as { name: string };
    const name = body.name.trim();
    const normalized = name.charAt(0).toUpperCase() + name.slice(1);
    return HttpResponse.json({ ...mockHousehold, id: 99, name: normalized });
  }),

  http.patch(`${API}/households/:id/`, async ({ params, request }) => {
    const body = await request.json() as { name: string };
    const name = body.name.trim();
    const normalized = name.charAt(0).toUpperCase() + name.slice(1);
    return HttpResponse.json({ ...mockHousehold, id: Number(params.id), name: normalized });
  }),

  http.delete(`${API}/households/:id/`, () => new HttpResponse(null, { status: 204 })),

  http.post(`${API}/households/:id/members/`, async ({ params, request }) => {
    const body = await request.json() as { email: string };
    const newMember = { id: 99, email: body.email, first_name: 'New', last_name: 'Member' };
    return HttpResponse.json({
      ...mockHousehold,
      id: Number(params.id),
      members: [...mockHousehold.members, newMember],
    });
  }),
];

export const server = setupServer(...handlers);
