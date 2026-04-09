// pages/transactions/transactions-table/use-sort.ts — Pure sort helpers for
// the transactions table. Sorting is performed server-side; sort state lives
// in the URL and is owned by TransactionsPage. This module exports two
// stateless utility functions used by TransactionsTable to compute sort changes.

import { type ColumnKey } from '@pages/transactions/transactions-table/columns';
import type { SortDir, SortField } from '@serve/types/global';

export type { SortDir };

/** Maps ColumnKey to the SortField the server understands. */
export function columnKeyToSortField(key: ColumnKey): SortField {
  return key as SortField;
}

/** Returns the toggled sort direction for a column click. */
export function nextSortDir(
  currentKey: ColumnKey,
  clickedKey: ColumnKey,
  currentDir: SortDir,
): SortDir {
  if (currentKey !== clickedKey) return 'asc';
  return currentDir === 'asc' ? 'desc' : 'asc';
}
