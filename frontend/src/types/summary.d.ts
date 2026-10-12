// types/summary.d.ts — Summary aggregation types.

export interface LabelSummary {
  label_id: number;
  label_name: string;
  label_color: string;
  category_id: number | null;
  /** Empty string when the label has no category. */
  category_name: string;
  total: number;
}

export interface CategorySummary {
  category_id: number | null;
  /** Empty string for the "Uncategorised" bucket. */
  category_name: string;
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
