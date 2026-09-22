// types/budgets.d.ts — Budget and BudgetLine types.

export interface Budget {
  id: number;
  name: string;
  type: 'spending' | 'earning' | 'project';
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
  planned_amount: string;
  notes: string;
}
