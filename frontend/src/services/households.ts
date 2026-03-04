import { API_V1 } from '@serve/config';
import type { HouseholdDetail } from '@serve/types/global';

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
    const body = await response
      .json()
      .catch(() => ({ detail: 'An unexpected error occurred.' }));
    throw new ApiError(response.status, body.detail ?? 'An unexpected error occurred.');
  }

  if (response.status === 204) return undefined as T;

  return response.json() as Promise<T>;
}

// ── Endpoints ───────────────────────────────────────────────────────

export async function listHouseholds(): Promise<HouseholdDetail[]> {
  return apiFetch<HouseholdDetail[]>('/households/');
}

export async function createHousehold(name: string): Promise<HouseholdDetail> {
  return apiFetch<HouseholdDetail>('/households/', {
    method: 'POST',
    body: JSON.stringify({ name }),
  });
}

export async function renameHousehold(id: number, name: string): Promise<HouseholdDetail> {
  return apiFetch<HouseholdDetail>(`/households/${id}/`, {
    method: 'PATCH',
    body: JSON.stringify({ name }),
  });
}

export async function deleteHousehold(id: number): Promise<void> {
  return apiFetch<void>(`/households/${id}/`, { method: 'DELETE' });
}

export async function addMember(householdId: number, email: string): Promise<HouseholdDetail> {
  return apiFetch<HouseholdDetail>(`/households/${householdId}/members/`, {
    method: 'POST',
    body: JSON.stringify({ email }),
  });
}
