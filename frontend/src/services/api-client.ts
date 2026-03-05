// services/api-client.ts — Shared fetch wrapper and error class for all service modules.
//
// CSRF: Django Ninja enforces CSRF on cookie-authenticated endpoints.
// We read the csrftoken cookie and send it as X-CSRFToken on all
// mutating requests (POST, PUT, PATCH, DELETE).

import { API_V1 } from '@serve/config';

function getCsrfToken(): string {
  const match = document.cookie.match(/csrftoken=([^;]+)/);
  return match ? match[1] : '';
}

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }

  get isUnauthorized(): boolean {
    return this.status === 401 || this.status === 403;
  }

  get isServerError(): boolean {
    return this.status >= 500;
  }
}

const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

export async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
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
    const body = await response
      .json()
      .catch(() => ({ detail: 'An unexpected error occurred.' }));
    throw new ApiError(response.status, body.detail ?? 'An unexpected error occurred.');
  }

  if (response.status === 204) return undefined as T;

  return response.json() as Promise<T>;
}
