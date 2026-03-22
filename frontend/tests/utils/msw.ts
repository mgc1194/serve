// tests/utils/msw.ts — MSW handlers for auth API endpoints.
//
// Provides realistic mock responses for all auth endpoints so
// integration tests never hit the real Django backend.

import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';

const API = '/api/v1';

export const mockHousehold = {
  id: 1,
  name: 'Test Household',
};

export const mockDetailedHousehold = {
  id: 1,
  name: 'Test Household',
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
  members: [
    { id: 1, email: 'test@example.com', first_name: 'Test', last_name: 'User' },
  ],
};

export const mockLabel = {
  id: 1,
  name: 'Groceries',
  color: '#6B7280',
  category: 'Food',
  household_id: 1,
};
 
export const mockTransaction = {
  id: 1,
  date: '2026-03-01',
  concept: 'TRADER JOES',
  amount: -42.57,
  label_id: null,
  label_name: null,
  category: null,
  additional_labels: null,
  source: 'import',
  account_id: 1,
  account_name: 'My Savings',
  bank_name: 'SoFi',
  imported_at: '2026-03-10T08:00:00Z',
};

export const mockUser = {
  id: 1,
  username: 'testuser',
  email: 'test@example.com',
  first_name: 'Test',
  last_name: 'User',
  households: [mockHousehold],
};

export const mockAccount = {
  id: 1,
  name: 'My Savings',
  handler_key: 'sofi-savings',
  account_type_id: 1,
  account_type: 'SoFi Savings',
  bank_id: 1,
  bank_name: 'SoFi',
  household_id: 1,
  household_name: 'Test Household',
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
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
    const newMember = { id: 99, email: body.email, first_name: 'New', last_name: 'Member' };
    return HttpResponse.json({
      ...mockDetailedHousehold,
      id: Number(params.id),
      members: [...mockDetailedHousehold.members, newMember],
    });
  }),

  http.get(`${API}/accounts/`, () => HttpResponse.json([mockAccount])),

  http.post(`${API}/accounts/`, async ({ request }) => {
    const body = await request.json() as { household_id: number; account_type_id: number; name: string };
    const name = body.name.trim();
    const normalized = name.charAt(0).toUpperCase() + name.slice(1);
    return HttpResponse.json({ ...mockAccount, id: 99, name: normalized });
  }),

  http.patch(`${API}/accounts/:id/`, async ({ params, request }) => {
    const body = await request.json() as { name: string };
    const name = body.name.trim();
    const normalized = name.charAt(0).toUpperCase() + name.slice(1);
    return HttpResponse.json({ ...mockAccount, id: Number(params.id), name: normalized });
  }),

  http.delete(`${API}/accounts/:id/`, () => new HttpResponse(null, { status: 204 })),
  
  http.get(`${API}/labels/`, ({ request }) => {
    const url = new URL(request.url);
    const householdId = url.searchParams.get('household_id');
    if (!householdId) return HttpResponse.json([], { status: 400 });
    return HttpResponse.json([mockLabel]);
  }),
 
  http.post(`${API}/labels/`, async ({ request }) => {
    const body = await request.json() as {
      name: string;
      color: string;
      category: string;
      household_ids: number[];
    };
    const created = body.household_ids.map((hid, i) => ({
      id: 99 + i,
      name: body.name,
      color: body.color,
      category: body.category,
      household_id: hid,
    }));
    return HttpResponse.json({ created, failed: [] });
  }),
 
  http.patch(`${API}/labels/:id/`, async ({ params, request }) => {
    const body = await request.json() as Partial<{ name: string; color: string; category: string }>;
    return HttpResponse.json({
      ...mockLabel,
      id: Number(params.id),
      ...body,
    });
  }),
 
  http.delete(`${API}/labels/:id/`, () => new HttpResponse(null, { status: 204 })),
];

export const server = setupServer(...handlers);
