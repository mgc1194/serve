// services/api-client.test.ts — Unit tests for the shared apiFetch wrapper and ApiError.
//
// Mocks fetch globally — no browser or MSW needed.
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { apiFetch, ApiError } from '@services/api-client';

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

Object.defineProperty(document, 'cookie', {
  writable: true,
  configurable: true,
  value: 'csrftoken=test-csrf-token',
});

function mockResponse(body: unknown, status = 200) {
  return Promise.resolve({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
  } as Response);
}

beforeEach(() => mockFetch.mockReset());

describe('apiFetch', () => {
  it('sends X-CSRFToken on POST', async () => {
    mockFetch.mockReturnValueOnce(mockResponse({ id: 1 }, 201));

    await apiFetch('/test/', { method: 'POST', body: JSON.stringify({}) });

    expect(mockFetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        headers: expect.objectContaining({ 'X-CSRFToken': 'test-csrf-token' }),
      }),
    );
  });

  it('does not send X-CSRFToken on GET', async () => {
    mockFetch.mockReturnValueOnce(mockResponse({ id: 1 }));

    await apiFetch('/test/');

    const [, options] = mockFetch.mock.calls[0] as [string, RequestInit & { headers: Record<string, string> }];
    expect(options.headers['X-CSRFToken']).toBeUndefined();
  });

  it('sends X-CSRFToken on PATCH, PUT, and DELETE', async () => {
    for (const method of ['PATCH', 'PUT', 'DELETE']) {
      mockFetch.mockReturnValueOnce(mockResponse({}, 200));
      await apiFetch('/test/', { method });
      const [, options] = mockFetch.mock.calls.at(-1) as [string, RequestInit & { headers: Record<string, string> }];
      expect(options.headers['X-CSRFToken']).toBe('test-csrf-token');
    }
  });

  it('always sends credentials: include', async () => {
    mockFetch.mockReturnValueOnce(mockResponse({}));

    await apiFetch('/test/');

    expect(mockFetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ credentials: 'include' }),
    );
  });

  it('returns undefined on 204', async () => {
    mockFetch.mockReturnValueOnce(Promise.resolve({ ok: true, status: 204 } as Response));

    await expect(apiFetch('/test/', { method: 'DELETE' })).resolves.toBeUndefined();
  });

  it('throws ApiError with server detail message on non-2xx', async () => {
    mockFetch.mockReturnValueOnce(mockResponse({ detail: 'Not found.' }, 404));

    await expect(apiFetch('/test/')).rejects.toMatchObject({
      status: 404,
      message: 'Not found.',
    });
  });

  it('throws ApiError with fallback message when body has no detail', async () => {
    mockFetch.mockReturnValueOnce(mockResponse({}, 500));

    await expect(apiFetch('/test/')).rejects.toMatchObject({
      status: 500,
      message: 'An unexpected error occurred.',
    });
  });

  it('throws ApiError with fallback message when body is not JSON', async () => {
    mockFetch.mockReturnValueOnce(Promise.resolve({
      ok: false,
      status: 502,
      json: () => Promise.reject(new Error('not json')),
    } as Response));

    await expect(apiFetch('/test/')).rejects.toMatchObject({
      status: 502,
      message: 'An unexpected error occurred.',
    });
  });
});

describe('ApiError', () => {
  it('isUnauthorized is true for 401', () => {
    expect(new ApiError(401, 'Unauthorized').isUnauthorized).toBe(true);
  });

  it('isUnauthorized is true for 403', () => {
    expect(new ApiError(403, 'Forbidden').isUnauthorized).toBe(true);
  });

  it('isUnauthorized is false for 500', () => {
    expect(new ApiError(500, 'Server error').isUnauthorized).toBe(false);
  });

  it('isServerError is true for 500', () => {
    expect(new ApiError(500, 'Server error').isServerError).toBe(true);
  });

  it('isServerError is false for 400', () => {
    expect(new ApiError(400, 'Bad request').isServerError).toBe(false);
  });
});
