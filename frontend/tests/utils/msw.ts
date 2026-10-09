// tests/utils/msw.ts — MSW handlers for auth API endpoints.
//
// Provides realistic mock responses for all auth endpoints so
// integration tests never hit the real Django backend.

import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';

const API = '/api/v1';

// ── Mock data ─────────────────────────────────────────────────────────────────

export const mockHousehold = { id: 1, name: 'Test Household' };

export const mockDetailedHousehold = {
  id: 1,
  name: 'Test Household',
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
  members: [{ id: 1, email: 'test@example.com', first_name: 'Test', last_name: 'User' }],
};

export const mockLabel = { id: 1, name: 'Groceries', color: '#6B7280', category: 'Food', household_id: 1 };

export const mockTransaction = {
  id: 1, date: '2026-03-01', concept: 'TRADER JOES', amount: -42.57,
  label_id: null, label_name: null, label_color: null, category: null,
  additional_labels: null, source: 'import', account_id: 1,
  account_name: 'My Savings', bank_name: 'SoFi', imported_at: '2026-03-10T08:00:00Z',
};

export const mockUser = {
  id: 1, username: 'testuser', email: 'test@example.com',
  first_name: 'Test', last_name: 'User', households: [mockHousehold],
};

export const mockAccount = {
  id: 1, name: 'My Savings', handler_key: 'sofi-savings',
  account_type_id: 1, account_type: 'SoFi Savings', bank_id: 1,
  bank_name: 'SoFi', household_id: 1, household_name: 'Test Household',
  created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z',
};

// ── Handlers ──────────────────────────────────────────────────────────────────

export const handlers = [
  // ── Auth ──────────────────────────────────────────────────────────────────
  http.get(`${API}/auth/me`, () => HttpResponse.json(mockUser)),
  http.post(`${API}/auth/login`, () => HttpResponse.json(mockUser)),
  http.post(`${API}/auth/register`, () => HttpResponse.json(mockUser, { status: 201 })),
  http.post(`${API}/auth/logout`, () => new HttpResponse(null, { status: 204 })),
  http.patch(`${API}/auth/me`, async ({ request }) => {
    const body = await request.json() as Record<string, string>;
    return HttpResponse.json({ ...mockUser, ...body });
  }),
  http.post(`${API}/auth/me/password`, () => new HttpResponse(null, { status: 204 })),

  // ── Households ────────────────────────────────────────────────────────────
  http.get(`${API}/households/`, () => HttpResponse.json([mockDetailedHousehold])),
  http.post(`${API}/households/`, async ({ request }) => {
    const body = await request.json() as { name: string };
    const name = body.name.trim();
    const normalized = name.charAt(0).toUpperCase() + name.slice(1);
    return HttpResponse.json({ ...mockDetailedHousehold, id: 99, name: normalized });
  }),
  http.patch(`${API}/households/:id/`, async ({ params, request }) => {
    const body = await request.json() as { name: string };
    const name = body.name.trim();
    const normalized = name.charAt(0).toUpperCase() + name.slice(1);
    return HttpResponse.json({ ...mockDetailedHousehold, id: Number(params.id), name: normalized });
  }),
  http.delete(`${API}/households/:id/`, () => new HttpResponse(null, { status: 204 })),
  http.post(`${API}/households/:id/members/`, async ({ params, request }) => {
    const body = await request.json() as { email: string };
    return HttpResponse.json({
      ...mockDetailedHousehold,
      id: Number(params.id),
      members: [
        ...mockDetailedHousehold.members,
        { id: 99, email: body.email, first_name: '', last_name: '' },
      ],
    });
  }),
];

export const server = setupServer(...handlers);
