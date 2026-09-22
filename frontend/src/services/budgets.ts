// services/budgets.ts — Typed fetch functions for budget and budget-line
// endpoints.

import type { Budget, BudgetLine } from '@serve/types/global';
import { apiFetch, ApiError } from '@services/api-client';

export { ApiError };

export async function listBudgets(
  householdId: number,
  includeInactive = false,
): Promise<Budget[]> {
  const query = new URLSearchParams({ household_id: String(householdId) });
  if (includeInactive) query.set('include_inactive', 'true');
  return apiFetch<Budget[]>(`/budgets/?${query.toString()}`);
}

export async function createBudget(payload: {
  name: string;
  type: 'spending' | 'earning' | 'project';
  household_id: number;
  period_start?: string;
  period_end?: string;
}): Promise<Budget> {
  return apiFetch<Budget>('/budgets/', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updateBudget(
  id: number,
  payload: {
    name?: string;
    is_active?: boolean;
    period_start?: string | null;
    period_end?: string | null;
  },
): Promise<Budget> {
  return apiFetch<Budget>(`/budgets/${id}/`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export async function deleteBudget(id: number): Promise<void> {
  return apiFetch<void>(`/budgets/${id}/`, { method: 'DELETE' });
}

export async function listBudgetLines(budgetId: number): Promise<BudgetLine[]> {
  return apiFetch<BudgetLine[]>(`/budgets/${budgetId}/lines`);
}

export async function createBudgetLine(
  budgetId: number,
  payload: { category_id: number },
): Promise<BudgetLine> {
  return apiFetch<BudgetLine>(`/budgets/${budgetId}/lines`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function deleteBudgetLine(id: number): Promise<void> {
  return apiFetch<void>(`/budget-lines/${id}/`, { method: 'DELETE' });
}
