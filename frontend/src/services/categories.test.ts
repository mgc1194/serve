// services/categories.test.ts — Unit tests for category service endpoints.
//
// apiFetch, CSRF, and ApiError behaviour is covered in api-client.test.ts.
// These tests focus on the correct HTTP method, URL, and request body for
// each category endpoint.

import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  createCategory,
  deleteCategory,
  listCategories,
  updateCategory,
} from '@services/categories';

function mockFetch(status: number, body?: unknown) {
  return vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
    new Response(body != null ? JSON.stringify(body) : null, {
      status,
      headers: { 'Content-Type': 'application/json' },
    }),
  );
}

const CATEGORY = {
  id: 1,
  name: 'Utilities',
  type: 'spending',
  is_active: true,
  household_id: 1,
};

afterEach(() => vi.restoreAllMocks());

// ── listCategories ───────────────────────────────────────────────────────────

describe('listCategories', () => {
  it('returns a list of categories on 200', async () => {
    mockFetch(200, [CATEGORY]);
    const result = await listCategories(1);
    expect(result).toEqual([CATEGORY]);
  });

  it('always includes household_id in the query string', async () => {
    const spy = mockFetch(200, []);
    await listCategories(7);
    const url = (spy.mock.calls[0] as [string])[0];
    expect(url).toContain('household_id=7');
  });

  it('omits include_inactive by default', async () => {
    const spy = mockFetch(200, []);
    await listCategories(1);
    const url = (spy.mock.calls[0] as [string])[0];
    expect(url).not.toContain('include_inactive');
  });

  it('includes include_inactive=true when requested', async () => {
    const spy = mockFetch(200, []);
    await listCategories(1, true);
    const url = (spy.mock.calls[0] as [string])[0];
    expect(url).toContain('include_inactive=true');
  });

  it('uses GET', async () => {
    const spy = mockFetch(200, []);
    await listCategories(1);
    const [, options] = spy.mock.calls[0] as [string, RequestInit];
    expect((options.method ?? 'GET').toUpperCase()).toBe('GET');
  });

  it('throws ApiError on 403', async () => {
    mockFetch(403, { detail: 'You are not a member of this household.' });
    await expect(listCategories(99)).rejects.toMatchObject({
      status: 403,
      message: 'You are not a member of this household.',
    });
  });
});

// ── createCategory ───────────────────────────────────────────────────────────

describe('createCategory', () => {
  it('returns the created category on 200', async () => {
    mockFetch(200, CATEGORY);
    const result = await createCategory({
      name: 'Utilities',
      type: 'spending',
      household_id: 1,
    });
    expect(result).toEqual(CATEGORY);
  });

  it('sends POST to /categories/ with the payload', async () => {
    const spy = mockFetch(200, CATEGORY);
    await createCategory({ name: 'Utilities', type: 'spending', household_id: 1 });
    const [url, options] = spy.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/categories/');
    expect(options.method).toBe('POST');
    expect(JSON.parse(options.body as string)).toEqual({
      name: 'Utilities',
      type: 'spending',
      household_id: 1,
    });
  });

  it('throws ApiError on 400', async () => {
    mockFetch(400, { detail: 'A category named "Utilities" already exists in this household.' });
    await expect(
      createCategory({ name: 'Utilities', type: 'spending', household_id: 1 }),
    ).rejects.toMatchObject({ status: 400 });
  });
});

// ── updateCategory ───────────────────────────────────────────────────────────

describe('updateCategory', () => {
  it('returns the updated category on 200', async () => {
    const updated = { ...CATEGORY, name: 'Bills' };
    mockFetch(200, updated);
    const result = await updateCategory(1, { name: 'Bills' });
    expect(result).toEqual(updated);
  });

  it('sends PATCH to /categories/{id}/ with the payload', async () => {
    const spy = mockFetch(200, CATEGORY);
    await updateCategory(1, { is_active: false });
    const [url, options] = spy.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/categories/1/');
    expect(options.method).toBe('PATCH');
    expect(JSON.parse(options.body as string)).toEqual({ is_active: false });
  });

  it('throws ApiError on 404', async () => {
    mockFetch(404, { detail: 'Not found.' });
    await expect(updateCategory(9999, { name: 'X' })).rejects.toMatchObject({ status: 404 });
  });
});

// ── deleteCategory ───────────────────────────────────────────────────────────

describe('deleteCategory', () => {
  it('sends DELETE to /categories/{id}/', async () => {
    const spy = mockFetch(204);
    await deleteCategory(1);
    const [url, options] = spy.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/categories/1/');
    expect(options.method).toBe('DELETE');
  });

  it('throws ApiError on 403', async () => {
    mockFetch(403, { detail: 'You are not a member of this household.' });
    await expect(deleteCategory(1)).rejects.toMatchObject({ status: 403 });
  });
});
