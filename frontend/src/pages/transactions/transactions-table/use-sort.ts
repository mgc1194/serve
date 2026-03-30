// pages/transactions/transactions-table/use-sort.ts — Sort state and
// sortTransactions helper for the transactions table.

import { useState } from 'react';

import { type ColumnKey } from '@serve/pages/transactions/transactions-table/columns';
import type { Transaction } from '@serve/types/global';

export type SortDir = 'asc' | 'desc';

export function sortTransactions(
  txns: Transaction[],
  key: ColumnKey,
  dir: SortDir,
): Transaction[] {
  return [...txns].sort((a, b) => {
    let av: string | number;
    let bv: string | number;

    switch (key) {
      case 'date':     av = a.date;                             bv = b.date;                             break;
      case 'concept':  av = a.concept.toLowerCase();            bv = b.concept.toLowerCase();            break;
      case 'amount':   av = a.amount;                           bv = b.amount;                           break;
      case 'account':  av = a.account_name.toLowerCase();       bv = b.account_name.toLowerCase();       break;
      case 'label':    av = a.label_name?.toLowerCase() ?? '';  bv = b.label_name?.toLowerCase() ?? '';  break;
      case 'category': av = a.category?.toLowerCase()   ?? '';  bv = b.category?.toLowerCase()   ?? '';  break;
    }

    if (av < bv) return dir === 'asc' ? -1 : 1;
    if (av > bv) return dir === 'asc' ?  1 : -1;
    return 0;
  });
}

export interface UseSortReturn {
  sortKey: ColumnKey;
  sortDir: SortDir;
  applySort: (key: ColumnKey) => void;
}

/** Manages sort key + direction. Default mirrors the server default: date desc. */
export function useSort(): UseSortReturn {
  const [sortKey, setSortKey] = useState<ColumnKey>('date');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  function applySort(key: ColumnKey) {
    setSortDir(prev => (sortKey === key && prev === 'asc' ? 'desc' : 'asc'));
    setSortKey(key);
  }

  return { sortKey, sortDir, applySort };
}
