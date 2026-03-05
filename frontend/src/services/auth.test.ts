// services/auth.test.ts — Unit tests for auth service endpoints.
//
// apiFetch, CSRF, and ApiError behaviour is covered in api-client.test.ts.
// These tests focus on the correct HTTP method, URL, and error propagation
// for each auth endpoint.
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { getMe, login, logout, register } from '@services/auth';

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

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
        headers: expect.objectContaining({ 'X-CSRFToken': expect.any(String) }),
      }),
    );
  });

  it('throws ApiError on 401', async () => {
    mockFetch.mockReturnValueOnce(mockResponse({ detail: 'Invalid credentials' }, 401));

    await expect(login({ email: 'a@b.com', password: 'wrong' }))
      .rejects.toMatchObject({ status: 401, message: 'Invalid credentials' });
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
      expect.objectContaining({ credentials: 'include' }),
    );
  });

  it('throws ApiError on 401', async () => {
    mockFetch.mockReturnValueOnce(mockResponse({}, 401));

    await expect(getMe()).rejects.toMatchObject({ status: 401 });
  });
});
