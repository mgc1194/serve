// services/auth.test.ts — Unit tests for auth service.
//
// Tests apiFetch, CSRF handling, ApiError, and all service functions
// in isolation. Mocks fetch globally — no browser or MSW needed.
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiError, getMe, login, logout, register } from '@serve/services/auth';

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

describe('login', () => {
  it('calls POST /api/v1/auth/login with credentials', async () => {
    mockFetch.mockReturnValueOnce(mockResponse({ id: 1, email: 'a@b.com' }));

    await login({ email: 'a@b.com', password: 'secret' });

    expect(mockFetch).toHaveBeenCalledWith(
      '/api/v1/auth/login',
      expect.objectContaining({
        method: 'POST',
        credentials: 'include',
        headers: expect.objectContaining({ 'X-CSRFToken': 'test-csrf-token' }),
      }),
    );
  });

  it('throws ApiError on 401', async () => {
    mockFetch.mockReturnValueOnce(mockResponse({ detail: 'Invalid credentials' }, 401));

    await expect(login({ email: 'a@b.com', password: 'wrong' }))
      .rejects.toMatchObject({ status: 401, message: 'Invalid credentials' });
  });

  it('throws ApiError on 500', async () => {
    mockFetch.mockReturnValueOnce(mockResponse({ detail: 'Server error' }, 500));

    await expect(login({ email: 'a@b.com', password: 'secret' }))
      .rejects.toMatchObject({ status: 500 });
  });
});

describe('register', () => {
  it('calls POST /api/v1/auth/register', async () => {
    mockFetch.mockReturnValueOnce(mockResponse({ id: 2 }, 201));

    await register({ email: 'new@b.com', password: 'Password1!', confirm_password: 'Password1!' });

    expect(mockFetch).toHaveBeenCalledWith(
      '/api/v1/auth/register',
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('throws ApiError on 400', async () => {
    mockFetch.mockReturnValueOnce(mockResponse({ detail: 'Email already exists' }, 400));

    await expect(register({ email: 'dupe@b.com', password: 'Password1!', confirm_password: 'Password1!' }))
      .rejects.toMatchObject({ status: 400, message: 'Email already exists' });
  });
});

describe('logout', () => {
  it('calls POST /api/v1/auth/logout and resolves on 204', async () => {
    mockFetch.mockReturnValueOnce(Promise.resolve({ ok: true, status: 204 } as Response));

    await expect(logout()).resolves.toBeUndefined();
  });
});

describe('getMe', () => {
  it('calls GET /api/v1/auth/me', async () => {
    mockFetch.mockReturnValueOnce(mockResponse({ id: 1 }));

    await getMe();

    expect(mockFetch).toHaveBeenCalledWith(
      '/api/v1/auth/me',
      expect.objectContaining({
        credentials: 'include',
      }),
    );
  });

  it('does not send X-CSRFToken on GET', async () => {
    mockFetch.mockReturnValueOnce(mockResponse({ id: 1 }));

    await getMe();

    const [, options] = mockFetch.mock.calls[0] as [string, RequestInit & { headers: Record<string, string> }];
    expect(options.headers['X-CSRFToken']).toBeUndefined();
  });

  it('throws ApiError on 401', async () => {
    mockFetch.mockReturnValueOnce(mockResponse({}, 401));

    await expect(getMe()).rejects.toMatchObject({ status: 401 });
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
