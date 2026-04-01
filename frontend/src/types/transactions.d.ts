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
  exclude_from_summary: boolean;
  source: string;
  account_id: number;
  account_name: string;
  bank_name: string;
  imported_at: string;
}

export interface FileImportResult {
  filename: string;
  inserted: number;
  skipped: number;
  total: number;
  error: string | null;
}
