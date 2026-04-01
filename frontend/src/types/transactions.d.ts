// types/transactions.d.ts — Transaction and CSV import types.

export interface Transaction {
  id: number;
  date: string;
  concept: string;
  amount: number;
  label_id: number | null;
  label_name: string | null;
  label_color: string | null;
  category: string | null;
  additional_labels: string | null;
  /** When true this transaction is omitted from all summary aggregations. */
  exclude_from_summary: boolean;
  source: string;
  account_id: number;
  account_name: string;
  bank_name: string;
  imported_at: string;
}

export type SortField = 'date' | 'concept' | 'amount' | 'account' | 'label' | 'category';
export type SortDir = 'asc' | 'desc';

export interface PaginatedTransactions {
  results: Transaction[];
  count: number;
  next_cursor: string | null;
  previous_cursor: string | null;
  sort: SortField;
  sort_dir: SortDir;
}

export interface FileImportResult {
  filename: string;
  inserted: number;
  skipped: number;
  total: number;
  error: string | null;
}
