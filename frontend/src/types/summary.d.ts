// types/summary.d.ts — Summary aggregation types.

export interface LabelSummary {
  label_id: number;
  label_name: string;
  label_color: string;
  category: string;
  total: number;
}

export interface CategorySummary {
  category: string;
  total: number;
  labels: LabelSummary[];
}

export interface Summary {
  earnings: CategorySummary[];
  spending: CategorySummary[];
  total: number;
  balance: number;
  uncategorised_total: number;
  /** ISO date string "YYYY-MM-DD" of the oldest transaction in the household, or null. */
  earliest_transaction_date: string | null;
}
