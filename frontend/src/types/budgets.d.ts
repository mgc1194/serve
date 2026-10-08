// types/budgets.d.ts — Budget and BudgetLine types.

export interface Budget {
  id: number;
  name: string;
  type: 'period' | 'project';
  period_start: string | null;
  period_end: string | null;
  is_active: boolean;
  household_id: number;
  // When this budget's lines' actual_amount was last calculated
  // (POST /budgets/{id}/sync/), or null if never. The API reports only
  // this raw timestamp — whether that counts as "stale" and whether to
  // warn about it is a client-side concern (see backend Budget docstring).
  synced_at: string | null;
}

export interface BudgetLine {
  id: number;
  budget_id: number;
  category_id: number;
  // Denormalized from the related Category so callers don't need a
  // second fetch to resolve them.
  category_name: string;
  category_type: 'earning' | 'spending';
  planned_amount: number;
  // A cached figure, not computed on read — only POST
  // /budgets/{id}/sync/ changes it. A Decimal on the backend, so it
  // arrives as a numeric string (e.g. "50.00"), not a number.
  actual_amount: string;
  notes: string;
}
