// services/budgets.test.ts — Unit tests for budget service endpoints.
//
// apiFetch, CSRF, and ApiError behaviour is covered in api-client.test.ts.
// These tests focus on the correct HTTP method, URL, and error propagation.

import { afterEach, describe, expect, it, vi } from 'vitest';

import { createBudget } from '@services/budgets';

function mockFetch(status: number, body?: unknown) {
  return vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
    new Response(body != null ? JSON.stringify(body) : null, {
      status,
      headers: { 'Content-Type': 'application/json' },
    }),
  );
}

const budget = {
  id: 1,
  name: 'August 2026',
  type: 'period',
  period_start: '2026-08-01',
  period_end: '2026-08-31',
  is_active: true,
  household_id: 1,
};

afterEach(() => vi.restoreAllMocks());

describe('createBudget', () => {
  it('sends POST with the payload and returns the created budget', async () => {
    const spy = mockFetch(200, budget);
    const result = await createBudget({
      name: 'August 2026',
      type: 'period',
      household_id: 1,
      period_start: '2026-08-01',
      period_end: '2026-08-31',
    });
    expect(result).toEqual(budget);
    expect(spy).toHaveBeenCalledWith(
      expect.stringContaining('/budgets/'),
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('throws ApiError with the server message on 400', async () => {
    mockFetch(400, { detail: 'A budget named "August 2026" already exists in this household.' });
    await expect(
      createBudget({ name: 'August 2026', type: 'period', household_id: 1 }),
    ).rejects.toMatchObject({
      message: 'A budget named "August 2026" already exists in this household.',
    });
  });
});
