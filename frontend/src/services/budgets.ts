// services/budgets.ts — Typed fetch functions for budget and budget-line endpoints.

import type { Budget, BudgetLine } from '@serve/types/global';
import { apiFetch, ApiError } from '@services/api-client';

export { ApiError };

export async function listBudgets(householdId: number): Promise<Budget[]> {
  return apiFetch<Budget[]>(`/budgets/?household_id=${householdId}`);
}

export async function createBudget(payload: {
  name: string;
  type: 'period' | 'project';
  household_id: number;
  period_start?: string;
  period_end?: string;
}): Promise<Budget> {
  return apiFetch<Budget>('/budgets/', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updateBudget(id: number, payload: { name: string }): Promise<Budget> {
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
  payload: { category_id: number; planned_amount: number; notes?: string },
): Promise<BudgetLine> {
  return apiFetch<BudgetLine>(`/budgets/${budgetId}/lines`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updateBudgetLine(
  id: number,
  payload: { planned_amount?: number; notes?: string },
): Promise<BudgetLine> {
  return apiFetch<BudgetLine>(`/budget-lines/${id}/`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export async function deleteBudgetLine(id: number): Promise<void> {
  return apiFetch<void>(`/budget-lines/${id}/`, { method: 'DELETE' });
}
