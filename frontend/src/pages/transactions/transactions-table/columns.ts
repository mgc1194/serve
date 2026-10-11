// pages/transactions/columns.ts — Shared column definitions for the
// transactions table and row components.
//
// Kept in a separate file so that transactions-table.tsx and
// transaction-row.tsx only export components, satisfying Vite's fast-refresh
// constraint.

export type ColumnKey = 'date' | 'concept' | 'amount' | 'account' | 'label';

export const COLUMN_LABELS: Record<ColumnKey, string> = {
  date: 'Date',
  concept: 'Description',
  amount: 'Amount',
  account: 'Account',
  label: 'Label',
};

export const DEFAULT_COLUMN_ORDER: ColumnKey[] = [
  'date',
  'concept',
  'amount',
  'account',
  'label',
];
