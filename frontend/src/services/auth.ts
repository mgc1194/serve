// services/auth.ts — Typed fetch functions for authentication endpoints.
//
// CSRF: Django Ninja enforces CSRF on cookie-authenticated endpoints.
// We read the csrftoken cookie and send it as X-CSRFToken on all
// mutating requests (POST, PUT, PATCH, DELETE).

import { API_V1 } from '@serve/config';
import type { LoginRequest, RegisterRequest, User } from '@serve/types/global';


function getCsrfToken(): string {
  const match = document.cookie.match(/csrftoken=([^;]+)/);
  return match ? match[1] : '';
}

const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const method = (options.method ?? 'GET').toUpperCase();

  const response = await fetch(`${API_V1}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(MUTATING_METHODS.has(method) ? { 'X-CSRFToken': getCsrfToken() } : {}),
      ...options.headers,
    },
    credentials: 'include',
  });

  if (!response.ok) {
    const error = await response
      .json()
      .catch(() => ({ detail: 'An unexpected error occurred.' }));
    throw new Error(error.detail ?? 'An unexpected error occurred.');
  }

  if (response.status === 204) return undefined as T;

  return response.json() as Promise<T>;
}

export async function register(payload: RegisterRequest): Promise<User> {
  return apiFetch<User>('/auth/register', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function login(payload: LoginRequest): Promise<User> {
  return apiFetch<User>('/auth/login', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function logout(): Promise<void> {
  return apiFetch<void>('/auth/logout', { method: 'POST' });
}

export async function getMe(): Promise<User> {
  return apiFetch<User>('/auth/me');
}
