// pages/transactions/columns.ts — Shared column definitions for the
// transactions table and row components.
//
// Kept in a separate file so that transactions-table.tsx and
// transaction-row.tsx only export components, satisfying Vite's fast-refresh
// constraint.

export type ColumnKey = 'date' | 'concept' | 'amount' | 'account' | 'label' | 'category';

export const COLUMN_LABELS: Record<ColumnKey, string> = {
  date: 'Date',
  concept: 'Description',
  amount: 'Amount',
  account: 'Account',
  label: 'Label',
  category: 'Category',
};

export const DEFAULT_COLUMN_ORDER: ColumnKey[] = [
  'date',
  'concept',
  'amount',
  'account',
  'label',
  'category',
];

// category is derived client-side (from the transaction's label's
// category_id, looked up against the household's categories — both
// already fetched for other reasons) rather than sorted/filtered
// server-side, so it's reorderable like every other column but excluded
// from the sort system: there's no backend SortField for it yet.
export const SORTABLE_COLUMNS: ReadonlySet<ColumnKey> = new Set([
  'date',
  'concept',
  'amount',
  'account',
  'label',
]);
