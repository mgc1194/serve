// types/budgets.d.ts — Budget and BudgetLine types.

export interface Budget {
  id: number;
  name: string;
  type: 'period' | 'project';
  period_start: string | null;
  period_end: string | null;
  is_active: boolean;
  household_id: number;
}

export interface BudgetLine {
  id: number;
  budget_id: number;
  category_id: number;
  category_name: string;
  category_type: 'earning' | 'spending';
  // Whole dollars — cents aren't meaningful for a planning target.
  planned_amount: number;
  // A Decimal on the wire (as a string): computed from real transaction
  // amounts, which do carry cents.
  actual_amount: string;
  notes: string;
}
