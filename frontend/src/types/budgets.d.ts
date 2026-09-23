// types/budgets.d.ts — Budget types.

export interface Budget {
  id: number;
  name: string;
  type: 'period' | 'project';
  period_start: string | null;
  period_end: string | null;
  is_active: boolean;
  household_id: number;
}
