// pages/transactions/transactions-table/use-sort.ts — Sort state for the
// transactions table header. Sorting is performed server-side; this hook
// manages the active sort key and direction and emits changes via onSortChange.

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
