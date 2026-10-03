// services/budgets.test.ts — Unit tests for budget service endpoints.
//
// apiFetch, CSRF, and ApiError behaviour is covered in api-client.test.ts.
// These tests focus on the correct HTTP method, URL, and error propagation.

import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  createBudget,
  createBudgetLine,
  deleteBudget,
  deleteBudgetLine,
  listBudgets,
  listBudgetLines,
  updateBudget,
  updateBudgetLine,
} from '@services/budgets';

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

describe('listBudgets', () => {
  it('scopes the request to the household and returns the list', async () => {
    const spy = mockFetch(200, [budget]);
    const result = await listBudgets(1);
    expect(result).toEqual([budget]);
    expect(spy).toHaveBeenCalledWith(
      expect.stringContaining('/budgets/?household_id=1'),
      expect.anything(),
    );
  });

  it('throws ApiError on 403', async () => {
    mockFetch(403, { detail: 'You are not a member of this household.' });
    await expect(listBudgets(1)).rejects.toMatchObject({ status: 403 });
  });
});

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

describe('updateBudget', () => {
  it('sends PATCH with the new name and returns the updated budget', async () => {
    const spy = mockFetch(200, { ...budget, name: 'Renamed' });
    const result = await updateBudget(1, { name: 'Renamed' });
    expect(result.name).toBe('Renamed');
    expect(spy).toHaveBeenCalledWith(
      expect.stringContaining('/budgets/1/'),
      expect.objectContaining({ method: 'PATCH' }),
    );
  });

  it('throws ApiError with the server message on 400', async () => {
    mockFetch(400, { detail: 'A budget named "Renamed" already exists in this household.' });
    await expect(updateBudget(1, { name: 'Renamed' })).rejects.toMatchObject({
      message: 'A budget named "Renamed" already exists in this household.',
    });
  });
});

describe('deleteBudget', () => {
  it('sends DELETE and returns undefined on 204', async () => {
    const spy = mockFetch(204);
    expect(await deleteBudget(1)).toBeUndefined();
    expect(spy).toHaveBeenCalledWith(
      expect.stringContaining('/budgets/1/'),
      expect.objectContaining({ method: 'DELETE' }),
    );
  });

  it('throws ApiError on 403', async () => {
    mockFetch(403, { detail: 'You are not a member of this household.' });
    await expect(deleteBudget(1)).rejects.toMatchObject({ status: 403 });
  });
});

const line = {
  id: 1,
  budget_id: 1,
  category_id: 2,
  category_name: 'Groceries',
  category_type: 'spending',
  planned_amount: '250.00',
  actual_amount: '0.00',
  notes: '',
};

describe('listBudgetLines', () => {
  it('scopes the request to the budget and returns the list', async () => {
    const spy = mockFetch(200, [line]);
    const result = await listBudgetLines(1);
    expect(result).toEqual([line]);
    expect(spy).toHaveBeenCalledWith(
      expect.stringContaining('/budgets/1/lines'),
      expect.anything(),
    );
  });

  it('throws ApiError on 404', async () => {
    mockFetch(404, { detail: 'Not Found' });
    await expect(listBudgetLines(1)).rejects.toMatchObject({ status: 404 });
  });
});

describe('createBudgetLine', () => {
  it('sends POST with the payload and returns the created line', async () => {
    const spy = mockFetch(200, line);
    const result = await createBudgetLine(1, { category_id: 2 });
    expect(result).toEqual(line);
    expect(spy).toHaveBeenCalledWith(
      expect.stringContaining('/budgets/1/lines'),
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('throws ApiError with the server message on 400', async () => {
    mockFetch(400, { detail: '"Groceries" is already part of this budget.' });
    await expect(createBudgetLine(1, { category_id: 2 })).rejects.toMatchObject({
      message: '"Groceries" is already part of this budget.',
    });
  });
});

describe('updateBudgetLine', () => {
  it('sends PATCH with the payload and returns the updated line', async () => {
    const spy = mockFetch(200, { ...line, planned_amount: '500.00' });
    const result = await updateBudgetLine(1, { planned_amount: '500.00' });
    expect(result.planned_amount).toBe('500.00');
    expect(spy).toHaveBeenCalledWith(
      expect.stringContaining('/budget-lines/1/'),
      expect.objectContaining({ method: 'PATCH' }),
    );
  });

  it('throws ApiError on 404', async () => {
    mockFetch(404, { detail: 'Not Found' });
    await expect(updateBudgetLine(1, { planned_amount: '500.00' })).rejects.toMatchObject({
      status: 404,
    });
  });
});

describe('deleteBudgetLine', () => {
  it('sends DELETE and returns undefined on 204', async () => {
    const spy = mockFetch(204);
    expect(await deleteBudgetLine(1)).toBeUndefined();
    expect(spy).toHaveBeenCalledWith(
      expect.stringContaining('/budget-lines/1/'),
      expect.objectContaining({ method: 'DELETE' }),
    );
  });

  it('throws ApiError on 403', async () => {
    mockFetch(403, { detail: 'You are not a member of this household.' });
    await expect(deleteBudgetLine(1)).rejects.toMatchObject({ status: 403 });
  });
});
