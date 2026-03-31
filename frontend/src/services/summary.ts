// services/summary.ts — Typed fetch functions for the summary endpoint.

import type { Summary } from '@serve/types/global';
import { apiFetch, ApiError } from '@services/api-client';

export { ApiError };

export interface GetSummaryParams {
  household_id: number;
  /** ISO month string "YYYY-MM". When omitted, all-time totals are returned. */
  month?: string;
}

export async function getSummary(params: GetSummaryParams): Promise<Summary> {
  const query = new URLSearchParams();
  query.set('household_id', String(params.household_id));
  if (params.month != null) query.set('month', params.month);
  return apiFetch<Summary>(`/summary/?${query.toString()}`);
}
