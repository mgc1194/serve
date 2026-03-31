// services/summary.test.ts — Unit tests for the summary service.

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { getSummary } from '@services/summary';

function mockFetch(status: number, body?: unknown) {
  return vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
    new Response(body != null ? JSON.stringify(body) : null, {
      status,
      headers: { 'Content-Type': 'application/json' },
    }),
  );
}

const SUMMARY = {
  earnings: [],
  spending: [],
  total: 0,
  balance: 0,
  uncategorised_total: 0,
  earliest_transaction_date: null,
};

beforeEach(() => {
  Object.defineProperty(document, 'cookie', {
    writable: true,
    configurable: true,
    value: 'csrftoken=test-csrf-token',
  });
});

afterEach(() => vi.restoreAllMocks());

describe('getSummary', () => {
  it('returns a summary on 200', async () => {
    mockFetch(200, SUMMARY);
    const result = await getSummary({ household_id: 1 });
    expect(result).toEqual(SUMMARY);
  });

  it('always includes household_id in the query string', async () => {
    const spy = mockFetch(200, SUMMARY);
    await getSummary({ household_id: 7 });
    const url = (spy.mock.calls[0] as [string])[0];
    expect(url).toContain('household_id=7');
  });

  it('includes month when provided', async () => {
    const spy = mockFetch(200, SUMMARY);
    await getSummary({ household_id: 1, month: '2026-03' });
    const url = (spy.mock.calls[0] as [string])[0];
    expect(url).toContain('month=2026-03');
  });

  it('omits month when not provided', async () => {
    const spy = mockFetch(200, SUMMARY);
    await getSummary({ household_id: 1 });
    const url = (spy.mock.calls[0] as [string])[0];
    expect(url).not.toContain('month=');
  });

  it('uses GET', async () => {
    const spy = mockFetch(200, SUMMARY);
    await getSummary({ household_id: 1 });
    const [, options] = spy.mock.calls[0] as [string, RequestInit];
    expect((options.method ?? 'GET').toUpperCase()).toBe('GET');
  });

  it('throws ApiError on 403', async () => {
    mockFetch(403, { detail: 'You are not a member of this household.' });
    await expect(getSummary({ household_id: 99 })).rejects.toMatchObject({
      status: 403,
    });
  });
});
