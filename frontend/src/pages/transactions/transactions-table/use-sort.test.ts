// pages/transactions/transactions-table/use-sort.test.ts

import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import type { Transaction } from '@serve/types/global';

import { sortTransactions, useSort } from './use-sort';

const TX = (overrides: Partial<Transaction> = {}): Transaction => ({
  id: 1,
  date: '2026-03-10',
  concept: 'TRADER JOES',
  amount: -42.57,
  label_id: null,
  label_name: null,
  label_color: null,
  category: null,
  additional_labels: null,
  source: 'csv',
  account_id: 1,
  account_name: "Alice's Savings",
  bank_name: 'Capital One',
  imported_at: '2026-03-11T08:00:00Z',
  ...overrides,
});

// ── sortTransactions ──────────────────────────────────────────────────────────

describe('sortTransactions', () => {
  it('sorts by date ascending', () => {
    const txns = [TX({ id: 1, date: '2026-03-10' }), TX({ id: 2, date: '2026-01-01' })];
    const result = sortTransactions(txns, 'date', 'asc');
    expect(result[0].date).toBe('2026-01-01');
    expect(result[1].date).toBe('2026-03-10');
  });

  it('sorts by date descending', () => {
    const txns = [TX({ id: 1, date: '2026-01-01' }), TX({ id: 2, date: '2026-03-10' })];
    const result = sortTransactions(txns, 'date', 'desc');
    expect(result[0].date).toBe('2026-03-10');
  });

  it('sorts by concept case-insensitively ascending', () => {
    const txns = [TX({ id: 1, concept: 'Zara' }), TX({ id: 2, concept: 'amazon' })];
    const result = sortTransactions(txns, 'concept', 'asc');
    expect(result[0].concept).toBe('amazon');
  });

  it('sorts by amount ascending', () => {
    const txns = [TX({ id: 1, amount: -100 }), TX({ id: 2, amount: 50 })];
    const result = sortTransactions(txns, 'amount', 'asc');
    expect(result[0].amount).toBe(-100);
  });

  it('sorts by account ascending', () => {
    const txns = [
      TX({ id: 1, account_name: 'Zara Savings' }),
      TX({ id: 2, account_name: 'Alpha Checking' }),
    ];
    const result = sortTransactions(txns, 'account', 'asc');
    expect(result[0].account_name).toBe('Alpha Checking');
  });

  it('sorts by label ascending, treating null as empty string', () => {
    const txns = [
      TX({ id: 1, label_name: 'Transport' }),
      TX({ id: 2, label_name: null }),
    ];
    const result = sortTransactions(txns, 'label', 'asc');
    expect(result[0].label_name).toBeNull();
  });

  it('sorts by category ascending, treating null as empty string', () => {
    const txns = [
      TX({ id: 1, category: 'Food' }),
      TX({ id: 2, category: null }),
    ];
    const result = sortTransactions(txns, 'category', 'asc');
    expect(result[0].category).toBeNull();
  });

  it('does not mutate the original array', () => {
    const txns = [TX({ id: 1, date: '2026-03-10' }), TX({ id: 2, date: '2026-01-01' })];
    const original = [...txns];
    sortTransactions(txns, 'date', 'asc');
    expect(txns).toEqual(original);
  });
});

// ── useSort ───────────────────────────────────────────────────────────────────

describe('useSort', () => {
  it('defaults to date descending', () => {
    const { result } = renderHook(() => useSort());
    expect(result.current.sortKey).toBe('date');
    expect(result.current.sortDir).toBe('desc');
  });

  it('sets the sort key on applySort', () => {
    const { result } = renderHook(() => useSort());
    act(() => result.current.applySort('amount'));
    expect(result.current.sortKey).toBe('amount');
  });

  it('defaults to asc when switching to a new column', () => {
    const { result } = renderHook(() => useSort());
    act(() => result.current.applySort('concept'));
    expect(result.current.sortDir).toBe('asc');
  });

  it('toggles to desc on second applySort of the same column', () => {
    const { result } = renderHook(() => useSort());
    act(() => result.current.applySort('concept'));
    act(() => result.current.applySort('concept'));
    expect(result.current.sortDir).toBe('desc');
  });

  it('toggles back to asc on third applySort of the same column', () => {
    const { result } = renderHook(() => useSort());
    act(() => result.current.applySort('concept'));
    act(() => result.current.applySort('concept'));
    act(() => result.current.applySort('concept'));
    expect(result.current.sortDir).toBe('asc');
  });

  it('resets to asc when switching to a different column mid-toggle', () => {
    const { result } = renderHook(() => useSort());
    act(() => result.current.applySort('concept')); // asc
    act(() => result.current.applySort('concept')); // desc
    act(() => result.current.applySort('amount'));  // new column → asc
    expect(result.current.sortDir).toBe('asc');
    expect(result.current.sortKey).toBe('amount');
  });
});
