// pages/transactions/transactions-table/transactions-table.test.tsx

import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { Label, Transaction } from '@serve/types/global';

import { TransactionsTable } from './index';

vi.mock('@services/transactions', async importOriginal => {
  const actual = await importOriginal<typeof import('@services/transactions')>();
  return {
    ...actual,
    updateTransactionConcept: vi.fn(),
    updateTransactionLabel: vi.fn(),
    deleteTransaction: vi.fn(),
    toggleTransactionExclusion: vi.fn(),
  };
});

const LABELS: Label[] = [
  { id: 1, name: 'Groceries', color: '#16a34a', category: 'Food', household_id: 1 },
  { id: 2, name: 'Transport', color: '#2563eb', category: '', household_id: 1 },
];

const TX: Transaction = {
  id: 1,
  date: '2026-03-10',
  concept: 'TRADER JOES #123',
  amount: -42.57,
  label_id: null,
  label_name: null,
  label_color: null,
  category: null,
  additional_labels: null,
  exclude_from_summary: false,
  source: 'csv',
  account_id: 1,
  account_name: "Alice's 360 Savings",
  bank_name: 'Capital One',
  imported_at: '2026-03-11T08:00:00Z',
};

const TX2: Transaction = {
  ...TX,
  id: 2,
  date: '2026-03-09',
  concept: 'DIRECT DEPOSIT',
  amount: 2400.0,
};

function setup(props: Partial<React.ComponentProps<typeof TransactionsTable>> = {}) {
  const onRetry = vi.fn();
  const onUpdated = vi.fn();
  const onDeleted = vi.fn();
  const onImport = vi.fn();
  const onNextPage = vi.fn();
  const onPreviousPage = vi.fn();
  const onSortChange = vi.fn();

  render(
    <TransactionsTable
      transactions={[]}
      labels={LABELS}
      isLoading={false}
      error={null}
      onRetry={onRetry}
      onUpdated={onUpdated}
      onDeleted={onDeleted}
      onImport={onImport}
      count={0}
      nextCursor={null}
      previousCursor={null}
      onNextPage={onNextPage}
      onPreviousPage={onPreviousPage}
      sortKey="date"
      sortDir="desc"
      onSortChange={onSortChange}
      {...props}
    />,
  );

  return { onRetry, onUpdated, onDeleted, onImport, onNextPage, onPreviousPage, onSortChange };
}

beforeEach(() => vi.clearAllMocks());

// ── Loading state ─────────────────────────────────────────────────────────────

describe('TransactionsTable loading', () => {
  it('renders skeletons while loading', () => {
    setup({ isLoading: true });
    expect(document.querySelectorAll('.MuiSkeleton-root').length).toBeGreaterThan(0);
  });

  it('does not render the table while loading', () => {
    setup({ isLoading: true });
    expect(screen.queryByRole('table')).toBeNull();
  });
});

// ── Error state ───────────────────────────────────────────────────────────────

describe('TransactionsTable error', () => {
  it('renders the error message', () => {
    setup({ error: 'Could not load transactions.' });
    expect(screen.getByText('Could not load transactions.')).toBeDefined();
  });

  it('calls onRetry when Retry is clicked', () => {
    const { onRetry } = setup({ error: 'Could not load transactions.' });
    fireEvent.click(screen.getByRole('button', { name: /retry/i }));
    expect(onRetry).toHaveBeenCalledOnce();
  });
});

// ── Empty state ───────────────────────────────────────────────────────────────

describe('TransactionsTable empty', () => {
  it('renders the empty state message', () => {
    setup({ transactions: [] });
    expect(screen.getByText('No transactions yet.')).toBeDefined();
  });

  it('calls onImport when Import a CSV is clicked', () => {
    const { onImport } = setup({ transactions: [] });
    fireEvent.click(screen.getByRole('button', { name: /import a csv/i }));
    expect(onImport).toHaveBeenCalledOnce();
  });
});

// ── Data rendering ────────────────────────────────────────────────────────────

describe('TransactionsTable with data', () => {
  it('renders a table with data', () => {
    setup({ transactions: [TX], count: 1 });
    expect(screen.getByRole('table')).toBeDefined();
  });

  it('renders all column headers', () => {
    setup({ transactions: [TX], count: 1 });
    expect(screen.getByText('Date')).toBeDefined();
    expect(screen.getByText('Description')).toBeDefined();
    expect(screen.getByText('Amount')).toBeDefined();
    expect(screen.getByText('Account')).toBeDefined();
    expect(screen.getByText('Label')).toBeDefined();
    expect(screen.getByText('Category')).toBeDefined();
    expect(screen.getByText('Actions')).toBeDefined();
  });

  it('renders transaction concept', () => {
    setup({ transactions: [TX], count: 1 });
    expect(screen.getByText('TRADER JOES #123')).toBeDefined();
  });

  it('renders a row per transaction', () => {
    setup({ transactions: [TX, TX2], count: 2 });
    expect(screen.getByText('TRADER JOES #123')).toBeDefined();
    expect(screen.getByText('DIRECT DEPOSIT')).toBeDefined();
  });
});

// ── Pagination ────────────────────────────────────────────────────────────────

describe('TransactionsTable pagination', () => {
  it('shows the total transaction count', () => {
    setup({ transactions: [TX], count: 247 });
    expect(screen.getByText('247 transactions')).toBeDefined();
  });

  it('shows singular "transaction" for count of 1', () => {
    setup({ transactions: [TX], count: 1 });
    expect(screen.getByText('1 transaction')).toBeDefined();
  });

  it('next page button is disabled when nextCursor is null', () => {
    setup({ transactions: [TX], count: 1, nextCursor: null });
    expect(screen.getByRole('button', { name: /next page/i }).hasAttribute('disabled')).toBe(true);
  });

  it('next page button is enabled when nextCursor is set', () => {
    setup({ transactions: [TX], count: 51, nextCursor: 'abc123' });
    expect(screen.getByRole('button', { name: /next page/i }).hasAttribute('disabled')).toBe(false);
  });

  it('previous page button is disabled when previousCursor is null', () => {
    setup({ transactions: [TX], count: 1, previousCursor: null });
    expect(screen.getByRole('button', { name: /previous page/i }).hasAttribute('disabled')).toBe(true);
  });

  it('previous page button is enabled when previousCursor is set', () => {
    setup({ transactions: [TX], count: 51, previousCursor: 'xyz789' });
    expect(screen.getByRole('button', { name: /previous page/i }).hasAttribute('disabled')).toBe(false);
  });

  it('calls onNextPage when next button is clicked', () => {
    const { onNextPage } = setup({ transactions: [TX], count: 51, nextCursor: 'abc123' });
    fireEvent.click(screen.getByRole('button', { name: /next page/i }));
    expect(onNextPage).toHaveBeenCalledOnce();
  });

  it('calls onPreviousPage when previous button is clicked', () => {
    const { onPreviousPage } = setup({ transactions: [TX], count: 51, previousCursor: 'xyz789' });
    fireEvent.click(screen.getByRole('button', { name: /previous page/i }));
    expect(onPreviousPage).toHaveBeenCalledOnce();
  });
});

// ── Sorting ───────────────────────────────────────────────────────────────────

describe('TransactionsTable sorting', () => {
  it('calls onSortChange when a column header is clicked', () => {
    const { onSortChange } = setup({ transactions: [TX], count: 1 });
    fireEvent.click(screen.getByRole('columnheader', { name: /description/i }));
    expect(onSortChange).toHaveBeenCalledWith('concept', 'asc');
  });

  it('calls onSortChange with desc when clicking the active sort column', () => {
    const { onSortChange } = setup({
      transactions: [TX],
      count: 1,
      sortKey: 'concept',
      sortDir: 'asc',
    });
    fireEvent.click(screen.getByRole('columnheader', { name: /description/i }));
    expect(onSortChange).toHaveBeenCalledWith('concept', 'desc');
  });
});
