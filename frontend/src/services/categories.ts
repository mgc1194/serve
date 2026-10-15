// services/categories.ts — Typed fetch functions for category endpoints.

import type { Category } from '@serve/types/global';
import { apiFetch, ApiError } from '@services/api-client';

export { ApiError };

export async function listCategories(
  householdId: number,
  includeInactive = false,
): Promise<Category[]> {
  const query = new URLSearchParams({ household_id: String(householdId) });
  if (includeInactive) query.set('include_inactive', 'true');
  return apiFetch<Category[]>(`/categories/?${query.toString()}`);
}

export async function createCategory(payload: {
  name: string;
  type: 'earning' | 'spending';
  household_id: number;
}): Promise<Category> {
  return apiFetch<Category>('/categories/', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updateCategory(
  id: number,
  payload: { name?: string; is_active?: boolean },
): Promise<Category> {
  return apiFetch<Category>(`/categories/${id}/`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export async function deleteCategory(id: number): Promise<void> {
  return apiFetch<void>(`/categories/${id}/`, { method: 'DELETE' });
}
