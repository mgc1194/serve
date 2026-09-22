// services/budgets.test.ts — Unit tests for budget/budget-line service
// endpoints.
//
// apiFetch, CSRF, and ApiError behaviour is covered in api-client.test.ts.
// These tests focus on the correct HTTP method, URL, and request body for
// each endpoint.

import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  createBudget,
  createBudgetLine,
  deleteBudget,
  deleteBudgetLine,
  listBudgetLines,
  listBudgets,
  updateBudget,
} from '@services/budgets';

function mockFetch(status: number, body?: unknown) {
  return vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
    new Response(body != null ? JSON.stringify(body) : null, {
      status,
      headers: { 'Content-Type': 'application/json' },
    }),
  );
}

const BUDGET = {
  id: 1,
  name: 'January Budget',
  type: 'spending',
  period_start: '2026-01-01',
  period_end: '2026-01-31',
  is_active: true,
  household_id: 1,
};

const BUDGET_LINE = {
  id: 1,
  budget_id: 1,
  category_id: 1,
  category_name: 'Groceries',
  category_type: 'spending',
  planned_amount: '0.00',
  notes: '',
};

afterEach(() => vi.restoreAllMocks());

// ── listBudgets ──────────────────────────────────────────────────────────────

describe('listBudgets', () => {
  it('returns a list of budgets on 200', async () => {
    mockFetch(200, [BUDGET]);
    const result = await listBudgets(1);
    expect(result).toEqual([BUDGET]);
  });

  it('always includes household_id in the query string', async () => {
    const spy = mockFetch(200, []);
    await listBudgets(7);
    const url = (spy.mock.calls[0] as [string])[0];
    expect(url).toContain('household_id=7');
  });

  it('omits include_inactive by default', async () => {
    const spy = mockFetch(200, []);
    await listBudgets(1);
    const url = (spy.mock.calls[0] as [string])[0];
    expect(url).not.toContain('include_inactive');
  });

  it('includes include_inactive=true when requested', async () => {
    const spy = mockFetch(200, []);
    await listBudgets(1, true);
    const url = (spy.mock.calls[0] as [string])[0];
    expect(url).toContain('include_inactive=true');
  });

  it('throws ApiError on 403', async () => {
    mockFetch(403, { detail: 'You are not a member of this household.' });
    await expect(listBudgets(99)).rejects.toMatchObject({ status: 403 });
  });
});

// ── createBudget ─────────────────────────────────────────────────────────────

describe('createBudget', () => {
  it('returns the created budget on 200', async () => {
    mockFetch(200, BUDGET);
    const result = await createBudget({
      name: 'January Budget',
      type: 'spending',
      household_id: 1,
      period_start: '2026-01-01',
      period_end: '2026-01-31',
    });
    expect(result).toEqual(BUDGET);
  });

  it('sends POST to /budgets/ with the payload', async () => {
    const spy = mockFetch(200, BUDGET);
    await createBudget({ name: 'Iceland Trip', type: 'project', household_id: 1 });
    const [url, options] = spy.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/budgets/');
    expect(options.method).toBe('POST');
    expect(JSON.parse(options.body as string)).toEqual({
      name: 'Iceland Trip',
      type: 'project',
      household_id: 1,
    });
  });

  it('throws ApiError on 400', async () => {
    mockFetch(400, { detail: "'period_start' and 'period_end' are required." });
    await expect(
      createBudget({ name: 'X', type: 'spending', household_id: 1 }),
    ).rejects.toMatchObject({ status: 400 });
  });
});

// ── updateBudget ─────────────────────────────────────────────────────────────

describe('updateBudget', () => {
  it('returns the updated budget on 200', async () => {
    const updated = { ...BUDGET, name: 'Renamed' };
    mockFetch(200, updated);
    const result = await updateBudget(1, { name: 'Renamed' });
    expect(result).toEqual(updated);
  });

  it('sends PATCH to /budgets/{id}/ with the payload', async () => {
    const spy = mockFetch(200, BUDGET);
    await updateBudget(1, { is_active: false });
    const [url, options] = spy.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/budgets/1/');
    expect(options.method).toBe('PATCH');
    expect(JSON.parse(options.body as string)).toEqual({ is_active: false });
  });

  it('throws ApiError on 404', async () => {
    mockFetch(404, { detail: 'Not found.' });
    await expect(updateBudget(9999, { name: 'X' })).rejects.toMatchObject({ status: 404 });
  });
});

// ── deleteBudget ─────────────────────────────────────────────────────────────

describe('deleteBudget', () => {
  it('sends DELETE to /budgets/{id}/', async () => {
    const spy = mockFetch(204);
    await deleteBudget(1);
    const [url, options] = spy.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/budgets/1/');
    expect(options.method).toBe('DELETE');
  });

  it('throws ApiError on 403', async () => {
    mockFetch(403, { detail: 'You are not a member of this household.' });
    await expect(deleteBudget(1)).rejects.toMatchObject({ status: 403 });
  });
});

// ── listBudgetLines ──────────────────────────────────────────────────────────

describe('listBudgetLines', () => {
  it('returns a list of lines on 200', async () => {
    mockFetch(200, [BUDGET_LINE]);
    const result = await listBudgetLines(1);
    expect(result).toEqual([BUDGET_LINE]);
  });

  it('sends GET to /budgets/{id}/lines', async () => {
    const spy = mockFetch(200, []);
    await listBudgetLines(1);
    const [url, options] = spy.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/budgets/1/lines');
    expect((options.method ?? 'GET').toUpperCase()).toBe('GET');
  });
});

// ── createBudgetLine ─────────────────────────────────────────────────────────

describe('createBudgetLine', () => {
  it('returns the created line on 200', async () => {
    mockFetch(200, BUDGET_LINE);
    const result = await createBudgetLine(1, { category_id: 1 });
    expect(result).toEqual(BUDGET_LINE);
  });

  it('sends POST to /budgets/{id}/lines with the payload', async () => {
    const spy = mockFetch(200, BUDGET_LINE);
    await createBudgetLine(1, { category_id: 5 });
    const [url, options] = spy.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/budgets/1/lines');
    expect(options.method).toBe('POST');
    expect(JSON.parse(options.body as string)).toEqual({ category_id: 5 });
  });

  it('throws ApiError on 400', async () => {
    mockFetch(400, { detail: 'already part of this budget' });
    await expect(createBudgetLine(1, { category_id: 5 })).rejects.toMatchObject({ status: 400 });
  });
});

// ── deleteBudgetLine ─────────────────────────────────────────────────────────

describe('deleteBudgetLine', () => {
  it('sends DELETE to /budget-lines/{id}/', async () => {
    const spy = mockFetch(204);
    await deleteBudgetLine(1);
    const [url, options] = spy.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/budget-lines/1/');
    expect(options.method).toBe('DELETE');
  });

  it('throws ApiError on 403', async () => {
    mockFetch(403, { detail: 'You are not a member of this household.' });
    await expect(deleteBudgetLine(1)).rejects.toMatchObject({ status: 403 });
  });
});
