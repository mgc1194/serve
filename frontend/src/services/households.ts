// services/households.ts — Typed fetch functions for household endpoints.

import type { HouseholdDetail } from '@serve/types/global';
import { apiFetch, ApiError } from '@services/api-client';

export { ApiError };

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
