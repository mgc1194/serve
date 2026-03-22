// services/labels.ts — Typed fetch functions for label endpoints.

import type { Label, LabelCreateResult } from '@serve/types/global';
import { apiFetch, ApiError } from '@services/api-client';

export { ApiError };

export async function listLabels(householdId: number): Promise<Label[]> {
  return apiFetch<Label[]>(`/labels/?household_id=${householdId}`);
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

export async function createLabels(payload: {
  name: string;
  color: string;
  category: string;
  household_ids: number[];
}): Promise<LabelCreateResult> {
  return apiFetch<LabelCreateResult>('/labels/', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}
