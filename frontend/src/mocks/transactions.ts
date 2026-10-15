// src/mocks/transactions.ts — Mocks for Transaction and FileImportResult.

import type { FileImportResult, Transaction } from '@serve/types/global';

export function makeTransaction(overrides: Partial<Transaction> = {}): Transaction {
  return {
    id: 1,
    date: '2026-03-10',
    concept: 'TRADER JOES #123',
    amount: -42.57,
    label_id: null,
    label_name: null,
    label_color: null,
    additional_labels: null,
    exclude_from_summary: false,
    source: 'csv',
    account_id: 1,
    account_name: "Alice's 360 Savings",
    bank_name: 'Capital One',
    imported_at: '2026-03-11T08:00:00Z',
    ...overrides,
  };
}

export function makeFileImportResult(overrides: Partial<FileImportResult> = {}): FileImportResult {
  return {
    filename: 'transactions.csv',
    inserted: 5,
    skipped: 0,
    total: 5,
    error: null,
    ...overrides,
  };
}
