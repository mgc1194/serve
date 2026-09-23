// services/budgets.ts — Typed fetch functions for budget endpoints.

import type { Budget } from '@serve/types/global';
import { apiFetch, ApiError } from '@services/api-client';

export { ApiError };

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
