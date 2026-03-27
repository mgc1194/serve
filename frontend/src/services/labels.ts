// services/labels.ts — Typed fetch functions for label endpoints.

import type { Label } from '@serve/types/global';
import { apiFetch, ApiError } from '@services/api-client';

export { ApiError };

export async function listLabels(householdId: number): Promise<Label[]> {
  return apiFetch<Label[]>(`/labels/?household_id=${householdId}`);
}

export async function createLabel(payload: {
  name: string;
  color: string;
  category: string;
  household_id: number;
}): Promise<Label> {
  return apiFetch<Label>('/labels/', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updateLabel(
  id: number,
  payload: { name?: string; color?: string; category?: string },
): Promise<Label> {
  return apiFetch<Label>(`/labels/${id}/`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export async function deleteLabel(id: number): Promise<void> {
  return apiFetch<void>(`/labels/${id}/`, { method: 'DELETE' });
}
