// tests/integration/auth.integration.test.ts — Auth service integration tests.
//
// Tests the full request/response cycle of the auth service against MSW.
// No mocking of fetch or service internals — exercises the real service code
// with realistic API responses intercepted by MSW.

import { describe, expect, it } from 'vitest';
import { http, HttpResponse } from 'msw';

import { ApiError, getMe, login, logout, register } from '@serve/services/auth';

import { mockUser, server } from '../utils/msw';

// ── login ─────────────────────────────────────────────────────────────────────

describe('login', () => {
  it('returns the user on success', async () => {
    const user = await login({ email: 'test@example.com', password: 'secret' });
    expect(user).toMatchObject({ email: mockUser.email });
  });

  it('throws ApiError with status 401 on invalid credentials', async () => {
    server.use(
      http.post('/api/v1/auth/login', () =>
        HttpResponse.json({ detail: 'Invalid credentials' }, { status: 401 }),
      ),
    );

    await expect(login({ email: 'a@b.com', password: 'wrong' }))
      .rejects.toMatchObject({ status: 401, message: 'Invalid credentials' });
  });

  it('throws ApiError with status 500 on server error', async () => {
    server.use(
      http.post('/api/v1/auth/login', () =>
        HttpResponse.json({ detail: 'Internal server error' }, { status: 500 }),
      ),
    );

    await expect(login({ email: 'a@b.com', password: 'secret' }))
      .rejects.toBeInstanceOf(ApiError);
  });
});

// ── register ──────────────────────────────────────────────────────────────────

describe('register', () => {
  it('returns the created user on success', async () => {
    const user = await register({
      email: 'new@example.com',
      password: 'Secure-Password1!',
      confirm_password: 'Secure-Password1!',
    });
    expect(user).toMatchObject({ email: mockUser.email });
  });

  it('throws ApiError with status 400 on duplicate email', async () => {
    server.use(
      http.post('/api/v1/auth/register', () =>
        HttpResponse.json({ detail: 'Email already exists' }, { status: 400 }),
      ),
    );

    await expect(
      register({ email: 'dupe@example.com', password: 'Password1!', confirm_password: 'Password1!' }),
    ).rejects.toMatchObject({ status: 400, message: 'Email already exists' });
  });
});

// ── logout ────────────────────────────────────────────────────────────────────

describe('logout', () => {
  it('resolves on 204', async () => {
    await expect(logout()).resolves.toBeUndefined();
  });

  it('throws ApiError on unexpected error', async () => {
    server.use(
      http.post('/api/v1/auth/logout', () =>
        HttpResponse.json({ detail: 'Unexpected error' }, { status: 500 }),
      ),
    );

    await expect(logout()).rejects.toBeInstanceOf(ApiError);
  });
});

// ── getMe ─────────────────────────────────────────────────────────────────────

describe('getMe', () => {
  it('returns the current user on success', async () => {
    const user = await getMe();
    expect(user).toMatchObject({ email: mockUser.email, id: mockUser.id });
  });

  it('throws ApiError with status 401 when unauthenticated', async () => {
    server.use(
      http.get('/api/v1/auth/me', () => new HttpResponse(null, { status: 401 })),
    );

    await expect(getMe()).rejects.toMatchObject({ status: 401 });
  });

  it('throws ApiError with status 500 on server error', async () => {
    server.use(
      http.get('/api/v1/auth/me', () => new HttpResponse(null, { status: 500 })),
    );

    await expect(getMe()).rejects.toMatchObject({ status: 500 });
  });
});
