// services/transactions.test.ts — Unit tests for transaction service endpoints.
//
// apiFetch, CSRF, and ApiError behaviour is covered in api-client.test.ts.
// These tests focus on the correct HTTP method, URL, request body, and error
// propagation for each transaction endpoint.
//
// importTransactionsCsv bypasses apiFetch and calls fetch directly, so its
// tests also verify the FormData body, CSRF header, and credentials flag.

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  deleteTransaction,
  importTransactionsCsv,
  listTransactions,
  toggleTransactionExclusion,
  updateTransactionConcept,
  updateTransactionLabel,
} from '@services/transactions';

// ── Helpers ───────────────────────────────────────────────────────────────────

function mockFetch(status: number, body?: unknown) {
  return vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
    new Response(body != null ? JSON.stringify(body) : null, {
      status,
      headers: { 'Content-Type': 'application/json' },
    }),
  );
}

const TX = {
  id: 1,
  date: '2026-03-01',
  concept: 'TRADER JOES',
  amount: -42.57,
  label_id: null,
  label_name: null,
  label_color: null,
  category: null,
  additional_labels: null,
  exclude_from_summary: false,
  source: 'csv',
  account_id: 1,
  account_name: "Alice's Savings",
  bank_name: 'Capital One',
  imported_at: '2026-03-10T08:00:00Z',
};

beforeEach(() => {
  Object.defineProperty(document, 'cookie', {
    writable: true,
    configurable: true,
    value: 'csrftoken=test-csrf-token',
  });
});

afterEach(() => vi.restoreAllMocks());

// ── listTransactions ──────────────────────────────────────────────────────────

describe('listTransactions', () => {
  it('returns a list of transactions on 200', async () => {
    mockFetch(200, [TX]);
    const result = await listTransactions({ household_id: 1 });
    expect(result).toEqual([TX]);
  });

  it('always includes household_id in the query string', async () => {
    const spy = mockFetch(200, []);
    await listTransactions({ household_id: 7 });
    const url = (spy.mock.calls[0] as [string])[0];
    expect(url).toContain('household_id=7');
  });

  it('includes account_id when provided', async () => {
    const spy = mockFetch(200, []);
    await listTransactions({ household_id: 1, account_id: 3 });
    const url = (spy.mock.calls[0] as [string])[0];
    expect(url).toContain('account_id=3');
  });

  it('omits account_id when not provided', async () => {
    const spy = mockFetch(200, []);
    await listTransactions({ household_id: 1 });
    const url = (spy.mock.calls[0] as [string])[0];
    expect(url).not.toContain('account_id');
  });

  it('uses GET', async () => {
    const spy = mockFetch(200, []);
    await listTransactions({ household_id: 1 });
    const [, options] = spy.mock.calls[0] as [string, RequestInit];
    // apiFetch defaults to GET when no method is provided
    expect((options.method ?? 'GET').toUpperCase()).toBe('GET');
  });

  it('throws ApiError on 403', async () => {
    mockFetch(403, { detail: 'You are not a member of this household.' });
    await expect(listTransactions({ household_id: 99 })).rejects.toMatchObject({
      status: 403,
      message: 'You are not a member of this household.',
    });
  });

  it('throws ApiError on 404', async () => {
    mockFetch(404, { detail: 'Not found.' });
    await expect(listTransactions({ household_id: 99 })).rejects.toMatchObject({
      status: 404,
    });
  });
});

// ── updateTransactionConcept ──────────────────────────────────────────────────

describe('updateTransactionConcept', () => {
  it('returns the updated transaction on 200', async () => {
    const updated = { ...TX, concept: 'WHOLE FOODS' };
    mockFetch(200, updated);
    const result = await updateTransactionConcept(1, 'WHOLE FOODS');
    expect(result).toEqual(updated);
  });

  it('sends PATCH to /transactions/{id}/', async () => {
    const spy = mockFetch(200, TX);
    await updateTransactionConcept(1, 'WHOLE FOODS');
    const [url, options] = spy.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/transactions/1/');
    expect(options.method).toBe('PATCH');
  });

  it('sends the concept in the request body', async () => {
    const spy = mockFetch(200, TX);
    await updateTransactionConcept(1, 'WHOLE FOODS');
    const [, options] = spy.mock.calls[0] as [string, RequestInit];
    expect(JSON.parse(options.body as string)).toEqual({ concept: 'WHOLE FOODS' });
  });

  it('does not include label_id in the body', async () => {
    const spy = mockFetch(200, TX);
    await updateTransactionConcept(1, 'WHOLE FOODS');
    const [, options] = spy.mock.calls[0] as [string, RequestInit];
    expect(JSON.parse(options.body as string)).not.toHaveProperty('label_id');
  });

  it('throws ApiError on 400 when concept is blank', async () => {
    mockFetch(400, { detail: 'Transaction concept cannot be blank.' });
    await expect(updateTransactionConcept(1, '')).rejects.toMatchObject({
      status: 400,
      message: 'Transaction concept cannot be blank.',
    });
  });

  it('throws ApiError on 403 when not a household member', async () => {
    mockFetch(403, { detail: 'You are not a member of this household.' });
    await expect(updateTransactionConcept(1, 'WHOLE FOODS')).rejects.toMatchObject({
      status: 403,
    });
  });

  it('throws ApiError on 404 when transaction does not exist', async () => {
    mockFetch(404, { detail: 'Not found.' });
    await expect(updateTransactionConcept(9999, 'WHOLE FOODS')).rejects.toMatchObject({
      status: 404,
    });
  });
});

// ── updateTransactionLabel ────────────────────────────────────────────────────

describe('updateTransactionLabel', () => {
  it('returns the updated transaction on 200', async () => {
    const updated = { ...TX, label_id: 5, label_name: 'Groceries', label_color: '#16a34a' };
    mockFetch(200, updated);
    const result = await updateTransactionLabel(1, 5);
    expect(result).toEqual(updated);
  });

  it('sends PATCH to /transactions/{id}/', async () => {
    const spy = mockFetch(200, TX);
    await updateTransactionLabel(1, 5);
    const [url, options] = spy.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/transactions/1/');
    expect(options.method).toBe('PATCH');
  });

  it('sends label_id in the request body when assigning a label', async () => {
    const spy = mockFetch(200, TX);
    await updateTransactionLabel(1, 5);
    const [, options] = spy.mock.calls[0] as [string, RequestInit];
    expect(JSON.parse(options.body as string)).toEqual({ label_id: 5 });
  });

  it('sends label_id: null in the request body when removing a label', async () => {
    const spy = mockFetch(200, TX);
    await updateTransactionLabel(1, null);
    const [, options] = spy.mock.calls[0] as [string, RequestInit];
    expect(JSON.parse(options.body as string)).toEqual({ label_id: null });
  });

  it('does not include concept in the body', async () => {
    const spy = mockFetch(200, TX);
    await updateTransactionLabel(1, 5);
    const [, options] = spy.mock.calls[0] as [string, RequestInit];
    expect(JSON.parse(options.body as string)).not.toHaveProperty('concept');
  });

  it('throws ApiError on 400 when label is from a different household', async () => {
    mockFetch(400, { detail: 'Label does not belong to the same household as this transaction.' });
    await expect(updateTransactionLabel(1, 99)).rejects.toMatchObject({
      status: 400,
      message: 'Label does not belong to the same household as this transaction.',
    });
  });

  it('throws ApiError on 403 when not a household member', async () => {
    mockFetch(403, { detail: 'You are not a member of this household.' });
    await expect(updateTransactionLabel(1, 5)).rejects.toMatchObject({ status: 403 });
  });

  it('throws ApiError on 404 when transaction does not exist', async () => {
    mockFetch(404, { detail: 'Not found.' });
    await expect(updateTransactionLabel(9999, 5)).rejects.toMatchObject({ status: 404 });
  });

  it('throws ApiError on 404 when label does not exist', async () => {
    mockFetch(404, { detail: 'Not found.' });
    await expect(updateTransactionLabel(1, 9999)).rejects.toMatchObject({ status: 404 });
  });
});

// ── toggleTransactionExclusion ────────────────────────────────────────────────
 
describe('toggleTransactionExclusion', () => {
  it('returns the updated transaction on 200', async () => {
    const updated = { ...TX, exclude_from_summary: true };
    mockFetch(200, updated);
    const result = await toggleTransactionExclusion(1, true);
    expect(result).toEqual(updated);
  });
 
  it('sends PATCH to /transactions/{id}/', async () => {
    const spy = mockFetch(200, TX);
    await toggleTransactionExclusion(1, true);
    const [url, options] = spy.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/transactions/1/');
    expect(options.method).toBe('PATCH');
  });
 
  it('sends exclude_from_summary: true in the request body when excluding', async () => {
    const spy = mockFetch(200, TX);
    await toggleTransactionExclusion(1, true);
    const [, options] = spy.mock.calls[0] as [string, RequestInit];
    expect(JSON.parse(options.body as string)).toEqual({ exclude_from_summary: true });
  });
 
  it('sends exclude_from_summary: false in the request body when including', async () => {
    const spy = mockFetch(200, TX);
    await toggleTransactionExclusion(1, false);
    const [, options] = spy.mock.calls[0] as [string, RequestInit];
    expect(JSON.parse(options.body as string)).toEqual({ exclude_from_summary: false });
  });
 
  it('throws ApiError on 403', async () => {
    mockFetch(403, { detail: 'You are not a member of this household.' });
    await expect(toggleTransactionExclusion(1, true)).rejects.toMatchObject({ status: 403 });
  });
 
  it('throws ApiError on 404', async () => {
    mockFetch(404, { detail: 'Not found.' });
    await expect(toggleTransactionExclusion(9999, true)).rejects.toMatchObject({ status: 404 });
  });
});

// ── deleteTransaction ─────────────────────────────────────────────────────────

describe('deleteTransaction', () => {
  it('resolves to undefined on 204', async () => {
    mockFetch(204);
    await expect(deleteTransaction(1)).resolves.toBeUndefined();
  });

  it('sends DELETE to /transactions/{id}/', async () => {
    const spy = mockFetch(204);
    await deleteTransaction(1);
    const [url, options] = spy.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/transactions/1/');
    expect(options.method).toBe('DELETE');
  });

  it('throws ApiError on 403', async () => {
    mockFetch(403, { detail: 'You are not a member of this household.' });
    await expect(deleteTransaction(1)).rejects.toMatchObject({ status: 403 });
  });

  it('throws ApiError on 404', async () => {
    mockFetch(404, { detail: 'Not found.' });
    await expect(deleteTransaction(9999)).rejects.toMatchObject({ status: 404 });
  });
});

// ── importTransactionsCsv ─────────────────────────────────────────────────────

describe('importTransactionsCsv', () => {
  const importResult = {
    filename: 'transactions.csv',
    inserted: 5,
    skipped: 1,
    total: 6,
    error: null,
  };

  it('returns a FileImportResult on 200', async () => {
    mockFetch(200, importResult);
    const file = new File(['date,concept,amount'], 'transactions.csv', { type: 'text/csv' });
    const result = await importTransactionsCsv(1, file);
    expect(result).toEqual(importResult);
  });

  it('sends POST to /transactions/import with account_id in the URL', async () => {
    const spy = mockFetch(200, importResult);
    const file = new File(['date,concept,amount'], 'transactions.csv', { type: 'text/csv' });
    await importTransactionsCsv(42, file);
    const [url, options] = spy.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/transactions/import');
    expect(url).toContain('account_id=42');
    expect(options.method).toBe('POST');
  });

  it('sends credentials: include', async () => {
    const spy = mockFetch(200, importResult);
    const file = new File([''], 'transactions.csv', { type: 'text/csv' });
    await importTransactionsCsv(1, file);
    const [, options] = spy.mock.calls[0] as [string, RequestInit];
    expect(options.credentials).toBe('include');
  });

  it('sends X-CSRFToken from the cookie', async () => {
    const spy = mockFetch(200, importResult);
    const file = new File([''], 'transactions.csv', { type: 'text/csv' });
    await importTransactionsCsv(1, file);
    const [, options] = spy.mock.calls[0] as [string, RequestInit & { headers: Record<string, string> }];
    expect(options.headers['X-CSRFToken']).toBe('test-csrf-token');
  });

  it('sends a FormData body containing the file', async () => {
    const spy = mockFetch(200, importResult);
    const file = new File(['date,concept,amount'], 'transactions.csv', { type: 'text/csv' });
    await importTransactionsCsv(1, file);
    const [, options] = spy.mock.calls[0] as [string, RequestInit];
    expect(options.body).toBeInstanceOf(FormData);
    expect((options.body as FormData).get('file')).toBe(file);
  });

  it('does not send Content-Type: application/json (lets browser set multipart boundary)', async () => {
    const spy = mockFetch(200, importResult);
    const file = new File([''], 'transactions.csv', { type: 'text/csv' });
    await importTransactionsCsv(1, file);
    const [, options] = spy.mock.calls[0] as [string, RequestInit & { headers: Record<string, string> }];
    expect(options.headers['Content-Type']).toBeUndefined();
  });

  it('throws ApiError with server message on non-2xx', async () => {
    mockFetch(403, { detail: 'You are not a member of this household.' });
    const file = new File([''], 'transactions.csv', { type: 'text/csv' });
    await expect(importTransactionsCsv(1, file)).rejects.toMatchObject({
      status: 403,
      message: 'You are not a member of this household.',
    });
  });

  it('throws ApiError with fallback message when error body has no detail', async () => {
    mockFetch(500, {});
    const file = new File([''], 'transactions.csv', { type: 'text/csv' });
    await expect(importTransactionsCsv(1, file)).rejects.toMatchObject({
      status: 500,
      message: 'An unexpected error occurred.',
    });
  });

  it('returns a result with error field when the import itself fails (200 with error)', async () => {
    const failedResult = { filename: 'bad.csv', inserted: 0, skipped: 0, total: 0, error: 'No handler found.' };
    mockFetch(200, failedResult);
    const file = new File([''], 'bad.csv', { type: 'text/csv' });
    const result = await importTransactionsCsv(1, file);
    expect(result.error).toBe('No handler found.');
    expect(result.inserted).toBe(0);
  });
});
